import { createClient } from "redis";
import dotenv from "dotenv";

import logger from "./logger";

dotenv.config();


export const redisClient = createClient({
    username: "default",
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,   // Redis Cloud endpoint
        port: Number(process.env.REDIS_PORT) // Redis Cloud port
    }
});
redisClient.on("error", (err) => logger.error("Redis Client Error", err));

export async function connectRedis() {
    try {
        await redisClient.connect();
        logger.info("Connected to Redis successfully!");
    } catch (error) {
        logger.error("Error connecting to Redis:", error);
    }
}


