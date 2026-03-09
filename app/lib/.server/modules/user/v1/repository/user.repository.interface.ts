import type { UserEntity } from '../domain';


export interface IUserRepository {
    create(user: UserEntity): Promise<void>;
    findByUsername(username: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
}
