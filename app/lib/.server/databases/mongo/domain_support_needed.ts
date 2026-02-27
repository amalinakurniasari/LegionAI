import { Document, ObjectId } from 'mongodb';

export interface IBaseMongoEntitySupportNeeded extends Document {
    _id?: ObjectId;
    createdAt?: Date;
    createdBy?: string;
    updatedAt?: Date;
    updatedBy?: string;
    deletedAt?: Date;
    deletedBy?: string;
}
