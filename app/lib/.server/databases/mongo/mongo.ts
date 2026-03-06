import { MongoClient, ReadPreference, Db as MongoDatabase } from 'mongodb';
import { logger } from '~/utils/logger';

export interface IMongoConfig {
    url: string;
    maxPoolSize: number;
    minPoolSize?: number;
    socketTimeoutMS: number;
    connectTimeoutMS: number;
}

export interface IMongo {
    client?: MongoClient;
    connect(): Promise<void>;
    close(): Promise<void>;
    getDatabase(databaseName: string): MongoDatabase;
}

class Mongo implements IMongo {
    private static writeInstance: Mongo;
    private static readInstance: Mongo;

    public client?: MongoClient;
    private config: IMongoConfig;
    private connectionType: 'read' | 'write';

    private constructor(config: IMongoConfig, connectionType: 'read' | 'write') {
        this.config = config;
        this.connectionType = connectionType;
        logger.info(`Initializing MongoDB ${connectionType} connection`);

        const options = {
            maxPoolSize: config.maxPoolSize,
            minPoolSize: config.minPoolSize || 5,
            socketTimeoutMS: config.socketTimeoutMS,
            connectTimeoutMS: config.connectTimeoutMS,
            retryWrites: connectionType === 'write',
            retryReads: connectionType === 'read',
            readPreference: ReadPreference.PRIMARY
        };

        try {
            this.client = new MongoClient(config.url, options);
        } catch (err: any) {
            logger.error(`Error instantiating MongoClient for ${connectionType}:`, err);
            throw err;
        }
    }


    public static getWriteInstance(config: IMongoConfig): Mongo {
        if (!Mongo.writeInstance) {
            Mongo.writeInstance = new Mongo(config, 'write');
        }
        return Mongo.writeInstance;
    }


    public static getReadInstance(config: IMongoConfig): Mongo {
        if (!Mongo.readInstance) {
            Mongo.readInstance = new Mongo(config, 'read');
        }
        return Mongo.readInstance;
    }

    public async connect(): Promise<void> {
        if (!this.client) {
            throw new Error('MongoClient is undefined or null');
        }

        logger.info(`Connecting to MongoDB Server (${this.connectionType})...`);

        try {
            await this.client.connect();

            // Test connection
            await this.client.db('admin').command({ ping: 1 });

            logger.info(`Successfully connected to MongoDB Server (${this.connectionType})`);
        } catch (error: any) {
            logger.error(`Error connecting to MongoDB Server (${this.connectionType}):`, error);
            await this.close();
            throw new Error(`Failed to connect to MongoDB Server (${this.connectionType}): ${error.message}`);
        }
    }


    public async close(): Promise<void> {
        logger.info(`Closing connection to MongoDB Server (${this.connectionType})...`);

        if (this.client) {
            try {
                await this.client.close();
                logger.info(`Closed connection to MongoDB Server (${this.connectionType})`);
            } catch (error: any) {
                logger.error(`Error closing connection to MongoDB Server (${this.connectionType}):`, error);
                throw new Error(`Failed to close MongoDB connection (${this.connectionType}): ${error.message}`);
            }
        }
    }

    public getDatabase(databaseName: string): MongoDatabase {
        if (!this.client) {
            throw new Error('MongoClient is not initialized');
        }
        return this.client.db(databaseName);
    }

    public async isConnected(): Promise<boolean> {
        try {
            if (!this.client) {
                return false;
            }
            await this.client.db('admin').command({ ping: 1 });
            return true;
        } catch (error) {
            return false;
        }
    }
}


function getMongoConfig(env?: Record<string, string | undefined>): IMongoConfig {
    // Try to get from multiple sources:
    // 1. Passed env parameter (from Remix context)
    // 2. process.env (from Node.js runtime)
    // 3. global.process.env (from server.js global injection)
    const getEnvVar = (key: string): string | undefined => {
        return env?.[key] ||
               process.env?.[key] ||
               (typeof global !== 'undefined' && (global as any).process?.env?.[key]);
    };

    const mongoUri = getEnvVar('MONGODB_URI') || '';
    const maxPoolSize = getEnvVar('MONGODB_MAX_POOL_SIZE');
    const minPoolSize = getEnvVar('MONGODB_MIN_POOL_SIZE');
    const socketTimeoutMS = getEnvVar('MONGODB_SOCKET_TIMEOUT_MS');
    const connectTimeoutMS = getEnvVar('MONGODB_CONNECT_TIMEOUT_MS');

    // Only log if we're actually initializing (not during module load)
    if (mongoUri) {
        logger.info('MongoDB URI loaded from environment variable');
        logger.info(`MongoDB URI: ✓ Set (${mongoUri.substring(0, 20)}...)`);
        logger.info(`MongoDB Max Pool Size: ${maxPoolSize || '10 (default)'}`);
    } else {
        logger.error('❌ MONGODB_URI is not set! MongoDB connection will fail.');
        logger.error('Available env sources:', {
            hasEnvParam: !!env,
            hasProcessEnv: typeof process !== 'undefined' && !!process.env,
            hasGlobalProcessEnv: typeof global !== 'undefined' && !!(global as any).process?.env,
            processEnvKeys: typeof process !== 'undefined' ? Object.keys(process.env || {}).length : 0,
        });
    }

    return {
        url: mongoUri,
        maxPoolSize: Number(maxPoolSize) || 10,
        minPoolSize: Number(minPoolSize) || 5,
        socketTimeoutMS: Number(socketTimeoutMS) || 45000,
        connectTimeoutMS: Number(connectTimeoutMS) || 10000,
    };
}

// Lazy initialization - only create instances when first accessed
let mongoWriteInstance: Mongo | null = null;
let mongoReadInstance: Mongo | null = null;

export const MongoWrite = new Proxy({} as Mongo, {
    get(_target, prop) {
        if (!mongoWriteInstance) {
            const config = getMongoConfig();
            mongoWriteInstance = Mongo.getWriteInstance(config);
        }
        return (mongoWriteInstance as any)[prop];
    }
});

export const MongoRead = new Proxy({} as Mongo, {
    get(_target, prop) {
        if (!mongoReadInstance) {
            const config = getMongoConfig();
            mongoReadInstance = Mongo.getReadInstance(config);
        }
        return (mongoReadInstance as any)[prop];
    }
});


export default MongoWrite;


export async function initializeMongoDB(): Promise<void> {
    try {
        logger.info('Initializing MongoDB connections...');

        // Force initialization by accessing the instances
        const config = getMongoConfig();

        if (!config.url) {
            throw new Error('MONGODB_URI is not set. Cannot initialize MongoDB connections.');
        }

        // Initialize instances if not already done
        if (!mongoWriteInstance) {
            mongoWriteInstance = Mongo.getWriteInstance(config);
        }
        if (!mongoReadInstance) {
            mongoReadInstance = Mongo.getReadInstance(config);
        }

        // Connect write instance
        await mongoWriteInstance.connect();

        // Connect read instance
        await mongoReadInstance.connect();

        logger.info('MongoDB connections initialized successfully');
    } catch (error: any) {
        logger.error('Failed to initialize MongoDB connections:', error);
        throw error;
    }
}


export async function closeMongoDB(): Promise<void> {
    try {
        logger.info('Closing MongoDB connections...');

        const promises: Promise<void>[] = [];

        if (mongoWriteInstance) {
            promises.push(mongoWriteInstance.close());
        }
        if (mongoReadInstance) {
            promises.push(mongoReadInstance.close());
        }

        await Promise.all(promises);

        logger.info('MongoDB connections closed successfully');
    } catch (error: any) {
        logger.error('Error closing MongoDB connections:', error);
        throw error;
    }
}
