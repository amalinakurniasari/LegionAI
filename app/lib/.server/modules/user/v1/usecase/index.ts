/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
import { 
    UserRepositoryMongo, 
} from '../repository';
import { UserUsecase } from './user.usecase';

const dbName = process.env?.MONGODB_DB_NAME ||
    (typeof global !== 'undefined' && (global as any).process?.env?.MONGODB_DB_NAME);

if (!dbName) {
    throw new Error('Missing MONGODB_DB_NAME: cannot initialize UserRepositoryMongo without a database name');
}

const userUsecase = UserUsecase.getInstance(
    UserRepositoryMongo.getInstance(dbName, 'users'),
);


export { 
    userUsecase,
};
