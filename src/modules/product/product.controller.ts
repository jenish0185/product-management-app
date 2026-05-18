import { Request, Response, NextFunction } from "express";
import { productService } from "../product/product.service";
import logger from "../../config/logger";
import { redisClient } from "../../config/redis";
import { esClient } from "../../config/elasticsearch";
import { getChannel } from "../../config/rabbitmq";

// ─── CREATE ───────────────────────────────────────────────────────────────────
export async function createProduct(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const product = await productService.create(req.body);
        logger.info("POST /products - created", { id: product.id });
        // index into Elasticsearch
        try {
            await esClient.index({ index: "products", id: String(product.id), document: product });
        } catch (esErr) {
            logger.error("Elasticsearch indexing error", { error: esErr });
        }

        // publish event to RabbitMQ
        try {
            const channel = await getChannel();
            const queue = process.env.RABBITMQ_NOTIFICATION_QUEUE || "notification_queue";
            channel.sendToQueue(queue, Buffer.from(JSON.stringify({ event: "product_created", data: product })), { persistent: true });
        } catch (mqErr) {
            logger.error("RabbitMQ publish error", { error: mqErr });
        }

        // invalidate list caches
        try {
            const keys = await redisClient.keys("products:list*");
            if (keys && keys.length) await redisClient.del(keys);
        } catch (rErr) {
            logger.error("Redis cache invalidation error", { error: rErr });
        }
        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product,
        });
    } catch (error) {
        logger.error("POST /products - error", { error });
        next(error);
    }
}

// ─── GET ALL (paginated + filters) ───────────────────────────────────────────
export async function getAllProducts(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const {
            page,
            limit,
            search,
            category,
            minPrice,
            maxPrice,
        } = req.query;

        const pg = page ? Number(page) : 1;
        const lim = limit ? Number(limit) : 10;
        const cacheKey = `products:list:page=${pg}:limit=${lim}:search=${search || ""}:category=${category || ""}:min=${minPrice || ""}:max=${maxPrice || ""}`;

        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                res.status(200).json(parsed);
                return;
            }
        } catch (rErr) {
            logger.warn("Redis read error, continuing to DB", { error: rErr });
        }

        const result = await productService.getAll({
            page: pg,
            limit: lim,
            search: search as string | undefined,
            category: category as string | undefined,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
        });

        const payload = {
            success: true,
            message: "Products fetched successfully",
            ...result,
        };

        try {
            await redisClient.set(cacheKey, JSON.stringify(payload), { EX: 60 });
        } catch (rErr) {
            logger.warn("Redis write error", { error: rErr });
        }

        res.status(200).json(payload);
    } catch (error) {
        logger.error("GET /products - error", { error });
        next(error);
    }
}

// ─── GET ONE ──────────────────────────────────────────────────────────────────
export async function getProductById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = Number(req.params.id);
        const cacheKey = `product:${id}`;

        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                res.status(200).json(JSON.parse(cached));
                return;
            }
        } catch (rErr) {
            logger.warn("Redis read error for product", { error: rErr });
        }

        const product = await productService.getById(id);

        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        const payload = {
            success: true,
            message: "Product fetched successfully",
            data: product,
        };

        try {
            await redisClient.set(cacheKey, JSON.stringify(payload), { EX: 60 * 5 });
        } catch (rErr) {
            logger.warn("Redis write error for product", { error: rErr });
        }

        res.status(200).json(payload);
    } catch (error) {
        logger.error("GET /products/:id - error", { error });
        next(error);
    }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export async function updateProduct(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = Number(req.params.id);
        const product = await productService.update(id, req.body);

        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        // update ES index
        try {
            await esClient.index({ index: "products", id: String(id), document: product });
        } catch (esErr) {
            logger.error("Elasticsearch update error", { error: esErr });
        }

        // publish update event
        try {
            const channel = await getChannel();
            const queue = process.env.RABBITMQ_NOTIFICATION_QUEUE || "notification_queue";
            channel.sendToQueue(queue, Buffer.from(JSON.stringify({ event: "product_updated", data: product })), { persistent: true });
        } catch (mqErr) {
            logger.error("RabbitMQ publish error on update", { error: mqErr });
        }

        // invalidate caches
        try {
            const pKey = `product:${id}`;
            await redisClient.del(pKey);
            const keys = await redisClient.keys("products:list*");
            if (keys && keys.length) await redisClient.del(keys);
        } catch (rErr) {
            logger.error("Redis cache invalidation error on update", { error: rErr });
        }

        logger.info("PUT /products/:id - updated", { id });
        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product,
        });
    } catch (error) {
        logger.error("PUT /products/:id - error", { error });
        next(error);
    }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function deleteProduct(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = Number(req.params.id);
        const deleted = await productService.delete(id);

        if (!deleted) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        // remove from ES
        try {
            await esClient.delete({ index: "products", id: String(id) });
        } catch (esErr) {
            logger.warn("Elasticsearch delete warning", { error: esErr });
        }

        // publish delete event
        try {
            const channel = await getChannel();
            const queue = process.env.RABBITMQ_NOTIFICATION_QUEUE || "notification_queue";
            channel.sendToQueue(queue, Buffer.from(JSON.stringify({ event: "product_deleted", data: { id } })), { persistent: true });
        } catch (mqErr) {
            logger.error("RabbitMQ publish error on delete", { error: mqErr });
        }

        // invalidate caches
        try {
            const pKey = `product:${id}`;
            await redisClient.del(pKey);
            const keys = await redisClient.keys("products:list*");
            if (keys && keys.length) await redisClient.del(keys);
        } catch (rErr) {
            logger.error("Redis cache invalidation error on delete", { error: rErr });
        }

        logger.info("DELETE /products/:id - soft deleted", { id });
        res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        logger.error("DELETE /products/:id - error", { error });
        next(error);
    }
}