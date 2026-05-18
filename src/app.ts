import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
import dotenv from "dotenv";
import path from "path";

import productRoutes from "./modules/product/product.routes";
import logger from "./config/logger";
import { redisClient } from "./config/redis";
import { esClient } from "./config/elasticsearch";

dotenv.config();

const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());                          // Security headers
app.use(cors());                            // Cross-origin
app.use(express.json());                    // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        body: req.method !== "GET" ? req.body : undefined,
    });
    next();
});

// ─── Swagger Setup ────────────────────────────────────────────────────────────
const swaggerOptions: swaggerJsDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Product Management API",
            version: "1.0.0",
            description:
                "REST API for managing products — built with Node.js, TypeScript, Sequelize, Redis, RabbitMQ, and Winston.",
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 5000}`,
                description: "Local development server",
            },
        ],
    },
    // Scan these files for @swagger JSDoc comments
    apis: [
        path.resolve(process.cwd(), "src/modules/**/*.ts"),
        path.resolve(process.cwd(), "src/**/*.routes.ts"),
        path.resolve(process.cwd(), "src/**/*.controller.ts"),
        path.resolve(process.cwd(), "dist/**/*.js"),
    ],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions) as { paths?: Record<string, unknown> };
const pathsCount = Object.keys(swaggerDocs.paths ?? {}).length;
logger.info(`Swagger docs loaded with ${pathsCount} path${pathsCount === 1 ? "" : "s"}`);
if (pathsCount === 0) {
    logger.warn("Swagger docs were generated with no paths. Check /src/modules/product/product.routes.ts comments and restart the server.");
}

app.get("/swagger.json", (_req: Request, res: Response) => {
    res.json(swaggerDocs);
});

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs, { explorer: true })
);

// ─── Health Check ─────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy",
        timestamp: new Date().toISOString(),
    });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/products", productRoutes);

if (process.env.NODE_ENV !== "production") {
    app.get("/admin/debug", async (_req: Request, res: Response) => {
        try {
            const redisKeys = await redisClient.keys("*");
            const esCount = await esClient.count({ index: "products" }).catch((err) => {
                logger.warn("Failed to count Elasticsearch index", { error: err });
                return { count: 0 } as { count: number };
            });

            res.status(200).json({
                success: true,
                redisKeys,
                elasticsearch: {
                    index: "products",
                    documentCount: esCount.count,
                },
            });
        } catch (error) {
            logger.error("Admin debug endpoint failed", { error });
            res.status(500).json({ success: false, message: "Failed to retrieve debug data" });
        }
    });
}

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled error", { message: err.message, stack: err.stack });
    res.status(500).json({
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV !== "production" && { error: err.message }),
    });
});

export default app;