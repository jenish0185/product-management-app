// import winston, { info } from 'winston';
// import { TransformableInfo } from "logform";

// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.combine(
//     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//     winston.format.printf((info: TransformableInfo) => {
//       return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
//     }),
//     winston.format.json()
//   )
// });

// if (process.env.NODE_ENV !== 'production') {
//     logger.add(new winston.transports.Console({
//         format: winston.format.combine(
//             winston.format.colorize(),
//             winston.format.printf((info: TransformableInfo) => {
//                 return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
//             })
//         )
//     }));
// }

// module.exports = logger;

import { createLogger, format, transports, Logger } from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import dotenv from 'dotenv';

dotenv.config();


const { combine, timestamp, printf, colorize, errors, splat } = format;

const consoleLogFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message} ${metaString}`;
});


let esTransport: ElasticsearchTransport | null = null;

if (process.env.NODE_ENV !== 'test' && process.env.ELASTICSEARCH_NODE) {
    try {
        esTransport = new ElasticsearchTransport({
            level: 'info',
            clientOpts: {
                node: process.env.ELASTICSEARCH_NODE!,
                auth: {
                    username: process.env.ELASTICSEARCH_USERNAME!,
                    password: process.env.ELASTICSEARCH_PASSWORD!,
                }
            },
            index: 'app-logs',
        });

        (esTransport as any).on('error', (err: Error) => {
            console.error('Elasticsearch Transport Error:', err);
        });
    } catch (err) {
        console.error('Failed to initialize Elasticsearch logging transport:', err);
        esTransport = null;
    }
}

const logger: Logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        errors({ stack: true }), // Include stack trace for errors  
        splat(),
        timestamp(),
        consoleLogFormat
    ),
    transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
        new transports.Console({
            format: combine(
                colorize(),
                consoleLogFormat
            ),
        }),
        ...(esTransport ? [esTransport] : []),
    ],
});

// if (process.env.NODE_ENV !== 'production') {
//     logger.add(new transports.Console({
//         format: combine(
//             colorize(),
//             consoleLogFormat
//         )
//     }));
// }   

export default logger;

// import { createLogger, format, transports, Logger } from 'winston';
// import Transport from 'winston-transport'; // Import base transport class
// import { ElasticsearchTransport } from 'winston-elasticsearch';
// import dotenv from 'dotenv';
// import { getChannel } from './rabbitmq'; // Import your existing getChannel module

// dotenv.config();

// const { combine, timestamp, printf, colorize, errors, splat } = format;

// const consoleLogFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
//     const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
//     return `${timestamp} [${level.toUpperCase()}]: ${stack || message} ${metaString}`;
// });

// // Custom Winston Transport to route logs directly to RabbitMQ
// class RabbitMQTransport extends Transport {
//     constructor(opts?: any) {
//         super(opts);
//     }

//     async log(info: any, callback: () => void) {
//         setImmediate(() => this.emit('logged', info));

//         try {
//             const channel = await getChannel();
//             const queue = process.env.RABBITMQ_QUEUE || 'log_queue';

//             // Publish log payload to the RabbitMQ queue
//             channel.sendToQueue(queue, Buffer.from(JSON.stringify(info)), {
//                 persistent: true // Ensure log isn't lost if RabbitMQ restarts
//             });
//         } catch (err) {
//             console.error('RabbitMQ Transport failed to publish log:', err);
//         }

//         callback();
//     }
// }

// const esTransport = new ElasticsearchTransport({
//     level: 'info',
//     clientOpts: {
//         node: process.env.ELASTICSEARCH_NODE!,
//         auth: {
//             username: process.env.ELASTICSEARCH_USERNAME!,
//             password: process.env.ELASTICSEARCH_PASSWORD!,
//         }
//     },
//     index: 'app-logs',
// });

// const logger: Logger = createLogger({
//     level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
//     format: combine(
//         errors({ stack: true }), 
//         splat(),
//         timestamp(),
//         consoleLogFormat
//     ),
//     transports: [
//         new transports.File({ filename: 'logs/error.log', level: 'error' }),
//         new transports.File({ filename: 'logs/combined.log' }),
//         new transports.Console({
//             format: combine(
//                 colorize(),
//                 consoleLogFormat
//             ),
//         }),
//         esTransport,
        
//         // New RabbitMQ pipeline transport added here
//         new RabbitMQTransport({ level: 'info' }) 
//     ],
// });

// (esTransport as any).on('error', (err: Error) => {
//     console.error('Elasticsearch Transport Error:', err);
// });

// export default logger;
