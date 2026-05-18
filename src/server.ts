import app from "./app";
import { connectRedis } from "./config/redis";
import sequelize from "./config/database";
import dotenv from "dotenv";
import logger from "./config/logger";



dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
    // 1. Connect to PostgreSQL (verify connection only — migrations handle schema)
    await sequelize.authenticate();
    logger.info("PostgreSQL connected successfully");

    // 2. Connect to Redis
    await connectRedis();
    logger.info("Redis connected successfully");

    // // 3. Connect to RabbitMQ
    // await initRabbitMQ();
    // logger.info("RabbitMQ connected successfully");

    // 4. Start Express
    app.listen(PORT, () => {
        logger.info(`Server running on http://localhost:${PORT}`);
        logger.info(`Swagger docs at http://localhost:${PORT}/api-docs`);
        logger.info("Express app loaded from src/app.ts and mounted routes from modules/product/product.routes.ts");
    });
}

startServer().catch((error) => {
    logger.error("Failed to start server", { error });
    process.exit(1);
});