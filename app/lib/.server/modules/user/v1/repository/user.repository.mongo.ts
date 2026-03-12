import type { Filter, FindOptions, UpdateFilter } from 'mongodb';
import { AbstractRepositoryMongo } from '../../../../databases/mongo';
import type { UserEntity } from '../domain';
import type { IUserRepository } from './user.repository.interface';
import { logger } from '~/utils/logger';

/**
 * User Repository MongoDB Implementation
 * Implementasi repository untuk operasi CRUD User ke MongoDB
 */
export class UserRepositoryMongo
    extends AbstractRepositoryMongo<UserEntity>
    implements IUserRepository
{
    private static instance: UserRepositoryMongo;

    private constructor(databaseName: string, collectionName: string) {
        super(databaseName, collectionName);

        // this.setupIndexes();

        logger.info(`UserRepositoryMongo initialized for collection: ${collectionName}`);
    }

    public static getInstance(databaseName: string, collectionName: string): UserRepositoryMongo {
        if (!UserRepositoryMongo.instance) {
            UserRepositoryMongo.instance = new UserRepositoryMongo(databaseName, collectionName);
        }
        return UserRepositoryMongo.instance;
    }


    private async setupIndexes(): Promise<void> {
        try {
            // Index untuk userId (unique)
            await this.createIndex({ userId: 1 }, { unique: true });
            logger.info('UserRepositoryMongo indexes created successfully');
        } catch (error) {
            logger.error('Error creating indexes:', error);
        }
    }

    /**
     * Create - Menyimpan user baru
     */
    public async create(user: UserEntity): Promise<void> {
        try {
            await this.save(user);
            logger.info(`User created successfully: ${user.userId}`);
        } catch (error) {
            logger.error('Error creating user:', error);
            throw new Error('Failed to create user');
        }
    }

    /**
     * Find user by username
     */
    public async findByUsername(username: string): Promise<UserEntity | null> {
        try {
            const user = await this.findOne({ username } as Filter<UserEntity>);
            return user;
        } catch (error) {
            logger.error('Error finding user by username:', error);
            return null;
        }
    }
    
    /**
     * Find user by email
     */
    public async findByEmail(email: string): Promise<UserEntity | null> {
        try {
            const user = await this.findOne({ email } as Filter<UserEntity>);
            return user;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            return null;
        }
    }
}
