import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(dbUrl as string, {
    dialect: "postgres",
    logging: false, // Disable logging; default: console.log
});

export default sequelize;
