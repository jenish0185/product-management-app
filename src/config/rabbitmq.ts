import  * as amqp from 'amqplib';
import { Connection, Channel } from 'amqplib';

let channel: Channel | null = null;

export async function initRabbitMQ() : Promise<Channel> {
    if (channel) return channel; // Return existing channel if already initialized

    const url = process.env.RABBITMQ_URL || 'amqp://localhost';
    const queue = process.env.RABBITMQ_QUEUE || 'log_queue';

    try {
        const connection = await amqp.connect(url);
        channel = await connection.createChannel();

        await channel.assertQueue(queue, { durable: true });

        console.log('Connected to RabbitMQ');
        
        return channel;
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        throw error;
    }
}

export async function getChannel(): Promise<Channel> {
    if (!channel) {
        await initRabbitMQ();
    }
    return channel!;
}