import type { IBaseMongoEntity } from '../../../../databases/mongo';

export interface UserEntity extends IBaseMongoEntity {
    userId: string;
    username: string;
    email: string;
    nik?: string;
    password: string;
    fullName?: string;
    profilePic?: string;
    phoneNumber?: string;
    isActive: boolean;
    roles?: string[];
    metadata?: {
        lastLogin?: Date;
        loginCount?: number;
        [key: string]: any;
    };
}
