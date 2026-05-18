import { Op } from "sequelize";
import Product, {
    ProductAttributes,
    ProductCreationAttributes,
} from "../product/product.model";
import { redisClient } from "../../config/redis";
import { getChannel } from "../../config/rabbitmq";
import logger from "../../config/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductQuery {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
}

export interface PaginatedProducts {
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_TTL = 60 * 5; // 5 minutes

function productCacheKey(id: number) {
    return `product:${id}`;
}

function listCacheKey(query: ProductQuery) {
    return `products:list:${JSON.stringify(query)}`;
}

async function invalidateListCache() {
    try {
        const keys = await redisClient.keys("products:list:*");
        if (keys.length) await redisClient.del(keys);
    } catch (err) {
        logger.warn("Failed to invalidate list cache", { err });
    }
}

// ─── RabbitMQ event publisher ─────────────────────────────────────────────────

async function publishEvent(event: string, payload: object) {
    try {
        const channel = await getChannel();
        const queue = process.env.RABBITMQ_QUEUE || "log_queue";
        const message = JSON.stringify({ event, payload, timestamp: new Date() });
        channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
        logger.info(`Event published: ${event}`, { payload });
    } catch (err) {
        logger.error("Failed to publish RabbitMQ event", { event, err });
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const productService = {
    /**
     * Create a new product.
     * - Persists to PostgreSQL via Sequelize
     * - Publishes a `product.created` event to RabbitMQ
     * - Busts the list cache
     */
    async create(data: ProductCreationAttributes): Promise<Product> {
        const product = await Product.create(data);
        logger.info("Product created", { id: product.id, name: product.name });

        await invalidateListCache();
        await publishEvent("product.created", { id: product.id, name: product.name });

        return product;
    },

    /**
     * Get all products with pagination, search, and category filtering.
     * - Results are cached in Redis for CACHE_TTL seconds.
     */
    async getAll(query: ProductQuery): Promise<PaginatedProducts> {
        const { page = 1, limit = 10, search, category, minPrice, maxPrice } = query;
        const offset = (page - 1) * limit;

        // Cache check
        const cacheKey = listCacheKey(query);
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info("Cache hit: product list", { cacheKey });
                return JSON.parse(cached);
            }
        } catch (err) {
            logger.warn("Redis read failed, continuing without cache", { err });
        }

        // Build Sequelize where clause
        const where: any = { isActive: true };

        if (search) {
            where[Op.or as any] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
            ];
        }
        if (category) where.category = category;
        if (minPrice !== undefined) where.price = { ...where.price, [Op.gte]: minPrice };
        if (maxPrice !== undefined) where.price = { ...where.price, [Op.lte]: maxPrice };

        const { count, rows } = await Product.findAndCountAll({
            where,
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        });

        const result: PaginatedProducts = {
            data: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        };

        // Store in cache
        try {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(result));
        } catch (err) {
            logger.warn("Redis write failed", { err });
        }

        return result;
    },

    /**
     * Get a single product by ID.
     * - Cached individually in Redis.
     */
    async getById(id: number): Promise<Product | null> {
        const cacheKey = productCacheKey(id);

        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info("Cache hit: product", { id });
                return JSON.parse(cached);
            }
        } catch (err) {
            logger.warn("Redis read failed", { err });
        }

        const product = await Product.findOne({ where: { id, isActive: true } });

        if (product) {
            try {
                await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(product));
            } catch (err) {
                logger.warn("Redis write failed", { err });
            }
        }

        return product;
    },

    /**
     * Update a product by ID.
     * - Busts the individual and list caches.
     * - Publishes a `product.updated` event to RabbitMQ.
     */
    async update(
        id: number,
        data: Partial<ProductAttributes>
    ): Promise<Product | null> {
        const product = await Product.findByPk(id);
        if (!product) return null;

        await product.update(data);
        logger.info("Product updated", { id });

        // Bust caches
        try {
            await redisClient.del(productCacheKey(id));
            await invalidateListCache();
        } catch (err) {
            logger.warn("Cache invalidation failed", { err });
        }

        await publishEvent("product.updated", { id, changes: data });

        return product;
    },

    /**
     * Soft-delete a product (sets isActive = false).
     * - Busts caches and publishes a `product.deleted` event.
     */
    async delete(id: number): Promise<boolean> {
        const product = await Product.findByPk(id);
        if (!product) return false;

        await product.update({ isActive: false });
        logger.info("Product soft-deleted", { id });

        try {
            await redisClient.del(productCacheKey(id));
            await invalidateListCache();
        } catch (err) {
            logger.warn("Cache invalidation failed", { err });
        }

        await publishEvent("product.deleted", { id });

        return true;
    },
};