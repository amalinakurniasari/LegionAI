import {
    ChangeStream,
    Collection,
    Db as MongoDatabase,
    MongoClient,
} from 'mongodb';
import type {
    ChangeStreamOptions,
    CreateIndexesOptions,
    DeleteOptions,
    Filter,
    FindOptions,
    IndexSpecification,
    UpdateFilter,
    UpdateOptions,
    Document,
} from 'mongodb';
import type { IBaseMongoEntity } from './domain';
import { MongoWrite, MongoRead } from './mongo';
import { logger } from '~/utils/logger';

export interface IBaseRepositoryMongo<T extends IBaseMongoEntity> {
    save(t: T): Promise<void>;
    saveWithoutEncrypted(t: T): Promise<void>;
    update(filter: Filter<T>, data: UpdateFilter<T>, options?: UpdateOptions): Promise<T>;
    updateWithoutEncrypt(filter: Filter<T>, data: UpdateFilter<T>, options?: UpdateOptions): Promise<T>;
    findOne(filter: Filter<T>, opts?: FindOptions<T>): Promise<T | null>;
    findAll(filter: Filter<T>, sorting?: any): Promise<T[]>;
    count(filter: Filter<T>): Promise<number>;
    findAllAndSort(filter: Filter<T>, sorting: any, page: number, size: number): Promise<T[]>;
    upsertOne(filter: Filter<T>, data: UpdateFilter<T>, options?: UpdateOptions): Promise<T>;
    upsertOneWithoutEncrypt(filter: Filter<T>, data: UpdateFilter<T>, options?: UpdateOptions): Promise<T>;
    deleteOne(filter: Filter<T>, options?: DeleteOptions): Promise<boolean>;
    deleteMany(filter: Filter<T>): Promise<boolean>;
    insertMany(data: any[]): Promise<any>;
    updateMany(filter: Filter<T>, data: UpdateFilter<T>): Promise<T>;
    findAllWithPagination(query: any, options: { skip: number; limit: number; sorting?: any }): Promise<T[]>;
    aggregate(pipeline: any[]): Promise<any[]>;
}

export type MiddlewareFunction<T> = (params: T | T[] | null) => Promise<T>;

/**
 * Abstract Repository with Separated Read/Write MongoDB Connections
 */
export abstract class AbstractRepositoryMongo<T extends IBaseMongoEntity>
    implements IBaseRepositoryMongo<T>
{
    // Write operations use writeCollection
    protected writeCollection: Collection<T>;
    protected writeDb: MongoDatabase;
    protected writeClient?: MongoClient;

    // Read operations use readCollection
    protected readCollection: Collection<T>;
    protected readDb: MongoDatabase;
    protected readClient?: MongoClient;

    protected collectionName: string;
    protected databaseName: string;

    private preHooks: { [key: string]: MiddlewareFunction<T>[] } = {};
    private postHooks: { [key: string]: MiddlewareFunction<T>[] } = {};

    protected changeStream: ChangeStream | undefined;

    public constructor(databaseName: string, collectionName: string) {
        this.databaseName = databaseName;
        this.collectionName = collectionName;

        // Initialize Write Connection
        this.writeDb = MongoWrite.getDatabase(databaseName);
        this.writeClient = MongoWrite.client;
        this.writeCollection = this.writeDb.collection<T>(collectionName);

        // Initialize Read Connection
        this.readDb = MongoRead.getDatabase(databaseName);
        this.readClient = MongoRead.client;
        this.readCollection = this.readDb.collection<T>(collectionName);

        logger.info(`Repository initialized for collection: ${collectionName} in database: ${databaseName}`);
    }

    /**
     * Create Index on Collection
     */
    public async createIndex(
        index: IndexSpecification,
        options?: CreateIndexesOptions
    ): Promise<void> {
        try {
            const createIndexResult = await this.writeCollection.createIndex(index, {
                ...options,
            });
            logger.info(
                `RepositoryMongo.createIndex() on collection '${this.collectionName}' succeed: ${createIndexResult}`
            );
        } catch (err: any) {
            this.logError(err);
            throw err;
        }
    }

    /**
     * WRITE OPERATION: Save document
     */
    public async save(t: T): Promise<void> {
        await this.performOperation('save', t, async (data) => {
            await this.writeCollection.insertOne(data as any, {
                writeConcern: { w: 'majority', j: true, wtimeoutMS: 3000 },
            });
        });
    }

    /**
     * WRITE OPERATION: Save without encryption
     */
    public async saveWithoutEncrypted(t: T): Promise<void> {
        await this.writeCollection.insertOne(t as any, {
            writeConcern: { w: 'majority', j: true, wtimeoutMS: 3000 },
        });
    }

    /**
     * WRITE OPERATION: Update document
     */
    public async update(
        filter: Filter<T>,
        data: UpdateFilter<T>,
        options?: UpdateOptions
    ): Promise<T> {
        return await this.performOperation(
            'update',
            { filter, data },
            async (params) => {
                const { filter, data } = params as { filter: Filter<T>; data: UpdateFilter<T> };
                await this.writeCollection.updateOne(
                    filter,
                    data,
                    {
                        ...options,
                        writeConcern: {
                            w: 'majority',
                            j: true,
                            wtimeoutMS: 3000,
                        },
                    }
                );
                return data;
            }
        );
    }

    /**
     * WRITE OPERATION: Update without encryption
     */
    public async updateWithoutEncrypt(
        filter: Filter<T>,
        data: UpdateFilter<T>,
        options?: UpdateOptions
    ): Promise<T> {
        try {
            const updateData = { $set: data };

            await this.writeCollection.updateOne(
                filter,
                updateData as any,
                {
                    ...options,
                    writeConcern: {
                        w: 'majority',
                        j: true,
                        wtimeoutMS: 3000,
                    },
                }
            );

            return data as any;
        } catch (error) {
            this.logError(error);
            throw error;
        }
    }

    /**
     * READ OPERATION: Find one document
     */
    public async findOne(
        filter: Filter<T>,
        opts?: FindOptions<T>
    ): Promise<T | null> {
        return await this.performOperation('findOne', filter, async (data) => {
            const result = await this.readCollection.findOne<T>(data, opts);
            return result;
        });
    }

    /**
     * READ OPERATION: Find all documents
     */
    public async findAll(filter: Filter<T>, sorting?: any): Promise<T[]> {
        return await this.performOperation(
            'findAll',
            { filter, sorting },
            async (params) => {
                const { filter, sorting } = params as {
                    filter: Filter<T>;
                    sorting: any;
                };
                const results = await this.readCollection
                    .find<T>(filter)
                    .sort(sorting)
                    .toArray();
                return results;
            }
        );
    }

    /**
     * READ OPERATION: Find with pagination
     */
    public async findAllWithPagination(
        query: any,
        options: { skip: number; limit: number; sorting?: any }
    ): Promise<any[]> {
        return await this.readCollection
            .find(query)
            .sort(options.sorting)
            .skip(options.skip)
            .limit(options.limit)
            .toArray();
    }

    /**
     * READ OPERATION: Count documents
     */
    public async count(filter: Filter<T>): Promise<number> {
        return await this.performOperation('count', filter, async (data) => {
            return await this.readCollection.countDocuments(data);
        });
    }

    /**
     * READ OPERATION: Find all with sorting and pagination
     */
    public async findAllAndSort(
        filter: Filter<T>,
        sorting: any,
        page: number,
        size: number
    ): Promise<T[]> {
        return await this.performOperation(
            'findAllAndSort',
            { filter, sorting, page, size },
            async (params) => {
                const { filter, sorting, page, size } = params as {
                    filter: Filter<T>;
                    sorting: any;
                    page: number;
                    size: number;
                };
                const results = await this.readCollection
                    .find<T>(filter)
                    .sort(sorting)
                    .skip((page - 1) * size)
                    .limit(size)
                    .toArray();
                return results;
            }
        );
    }

    /**
     * WRITE OPERATION: Upsert document
     */
    public async upsertOne(
        filter: Filter<T>,
        data: UpdateFilter<T>,
        options?: UpdateOptions
    ): Promise<T> {
        return await this.performOperation(
            'upsertOne',
            { filter, data },
            async (params) => {
                const { filter, data } = params as { filter: Filter<T>; data: UpdateFilter<T> };
                await this.writeCollection.updateOne(
                    filter,
                    data,
                    {
                        upsert: true,
                        ...options,
                        writeConcern: {
                            w: 'majority',
                            j: true,
                            wtimeoutMS: 3000,
                        },
                    }
                );
                return data;
            }
        );
    }

    /**
     * WRITE OPERATION: Upsert without encryption
     */
    public async upsertOneWithoutEncrypt(
        filter: Filter<T>,
        data: UpdateFilter<T>,
        options?: UpdateOptions
    ): Promise<T> {
        try {
            const updateData = { $set: data };

            await this.writeCollection.updateOne(
                filter,
                updateData as any,
                {
                    upsert: true,
                    ...options,
                    writeConcern: {
                        w: 'majority',
                        j: true,
                        wtimeoutMS: 3000,
                    },
                }
            );

            return data as any;
        } catch (error) {
            this.logError(error);
            throw error;
        }
    }

    /**
     * WRITE OPERATION: Delete one document
     */
    public async deleteOne(filter: Filter<T>, options?: DeleteOptions): Promise<boolean> {
        return await this.performOperation(
            'deleteOne',
            filter,
            async (data) => {
                const result = await this.writeCollection.deleteOne(data, {
                    ...options,
                    writeConcern: { w: 'majority', j: true, wtimeoutMS: 3000 },
                });
                return result.deletedCount === 1;
            }
        );
    }

    /**
     * WRITE OPERATION: Delete many documents
     */
    public async deleteMany(filter: Filter<T>): Promise<boolean> {
        return await this.performOperation(
            'deleteMany',
            filter,
            async (data) => {
                const result = await this.writeCollection.deleteMany(data, {
                    writeConcern: { w: 'majority', j: true, wtimeoutMS: 3000 },
                });
                return result.deletedCount > 0;
            }
        );
    }

    /**
     * WRITE OPERATION: Insert many documents
     */
    public async insertMany(data: any[]): Promise<any> {
        return await this.performOperation('insertMany', data, async (data) => {
            await this.writeCollection.insertMany(data, {
                writeConcern: { w: 'majority', j: true, wtimeoutMS: 3000 },
            });
            return data;
        });
    }

    /**
     * WRITE OPERATION: Update many documents
     */
    public async updateMany(filter: Filter<T>, data: UpdateFilter<T>): Promise<T> {
        return await this.performOperation(
            'updateMany',
            { filter, data },
            async (params) => {
                const { filter, data } = params as { filter: Filter<T>; data: UpdateFilter<T> };
                await this.writeCollection.updateMany(
                    filter,
                    data,
                    {
                        writeConcern: {
                            w: 'majority',
                            j: true,
                            wtimeoutMS: 3000,
                        },
                    }
                );
                return data;
            }
        );
    }

    /**
     * READ OPERATION: Aggregate pipeline
     */
    public async aggregate(pipeline: any[]): Promise<any[]> {
        return await this.readCollection.aggregate(pipeline).toArray();
    }

    /**
     * Perform operation with hooks
     */
    protected async performOperation(
        operation: string,
        params: any,
        callback: (params: any) => Promise<any>
    ): Promise<any> {
        try {
            params = await this.executePreHooks(operation, params);
            let result = await callback(params);
            result = await this.executePostHooks(operation, result);
            return result;
        } catch (err: any) {
            this.logError(err);
            throw new Error(
                `RepositoryMongo.${operation}() on collection '${this.collectionName}' failed: ${err.message}`
            );
        }
    }

    /**
     * Execute pre-hooks
     */
    public async executePreHooks(operation: string, params: any): Promise<any> {
        return await this.runHooks(this.preHooks[operation], params);
    }

    /**
     * Execute post-hooks
     */
    public async executePostHooks(operation: string, result: any): Promise<any> {
        return await this.runHooks(this.postHooks[operation], result);
    }

    /**
     * Run hooks
     */
    private async runHooks(
        hooks: MiddlewareFunction<T>[] = [],
        params: any
    ): Promise<any> {
        for (const hook of hooks) {
            params = await hook(params);
        }
        return params;
    }

    /**
     * Add pre-hook
     */
    public addPreHook(operation: string, hook: MiddlewareFunction<T>): void {
        this.addHook(this.preHooks, operation, hook);
    }

    /**
     * Add post-hook
     */
    public addPostHook(operation: string, hook: MiddlewareFunction<T>): void {
        this.addHook(this.postHooks, operation, hook);
    }

    /**
     * Add hook to container
     */
    private addHook(
        hookContainer: { [key: string]: MiddlewareFunction<T>[] },
        operation: string,
        hook: MiddlewareFunction<T>
    ): void {
        if (!hookContainer[operation]) {
            hookContainer[operation] = [];
        }
        hookContainer[operation].push(hook);
    }

    /**
     * Log error
     */
    private logError(err: any): void {
        logger.error('MongoDB Repository Error:', err);
    }

    /**
     * Set up change stream for collection
     */
    public setUseChangeStream(
        enabled: boolean,
        pipeline?: Document[],
        options?: ChangeStreamOptions
    ): void {
        if (enabled) {
            this.changeStream = this.readCollection.watch(pipeline, options);
            this.closeChangeStream();
        }
    }

    /**
     * Close change stream on process exit
     */
    private closeChangeStream(): void {
        const closeStream = () => {
            logger.info('Closing changeStream');
            this.changeStream?.close();
        };

        process.on('exit', closeStream);
        process.on('SIGINT', closeStream);
        process.on('SIGUSR1', closeStream);
        process.on('SIGTERM', closeStream);
    }
}
