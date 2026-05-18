import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config();

export const esClient = new Client({
    node: process.env.ELASTICSEARCH_NODE,
    auth: {
        username: process.env.ELASTICSEARCH_USERNAME!,
        password: process.env.ELASTICSEARCH_PASSWORD!
    }
});

export async function checkElasticsearchConnection() {
    try {
        await esClient.ping();
        console.log("Elasticsearch connection successful");
    } catch (error) {
        console.error("Elasticsearch connection failed:", error);
    }
}

// run a quick ping at startup
checkElasticsearchConnection();