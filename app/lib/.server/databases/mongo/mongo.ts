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


function getMongoConfig(): IMongoConfig {
    const mongoUri = process.env.MONGODB_URI || '';

    return {
        url: mongoUri,
        maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
        minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE) || 5,
        socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
        connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000,
    };
}

const mongoConfig = getMongoConfig();


export const MongoWrite = Mongo.getWriteInstance(mongoConfig);
export const MongoRead = Mongo.getReadInstance(mongoConfig);


export default MongoWrite;


export async function initializeMongoDB(): Promise<void> {
    try {
        logger.info('Initializing MongoDB connections...');

        // Connect write instance
        await MongoWrite.connect();

        // Connect read instance
        await MongoRead.connect();

        logger.info('MongoDB connections initialized successfully');
    } catch (error: any) {
        logger.error('Failed to initialize MongoDB connections:', error);
        throw error;
    }
}


export async function closeMongoDB(): Promise<void> {
    try {
        logger.info('Closing MongoDB connections...');

        await Promise.all([
            MongoWrite.close(),
            MongoRead.close(),
        ]);

        logger.info('MongoDB connections closed successfully');
    } catch (error: any) {
        logger.error('Error closing MongoDB connections:', error);
        throw error;
    }
}
