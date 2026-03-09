export interface UserResponse {
    userId: string;
    username: string;
    email: string;
    fullName?: string;
    nik?: string;
    phoneNumber?: string;
    profilePic?: string;
    isActive: boolean;
    roles?: string[];
    createdAt?: string;
    updatedAt?: string;
    metadata?: {
        lastLogin?: Date;
        loginCount?: number;
        [key: string]: any;
    };
}

export interface UserListResponse {
    users: UserResponse[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface CreateUserResponse {
    success: boolean;
    message: string;
    userId?: string;
}

export interface UpdateUserResponse {
    success: boolean;
    message: string;
    user?: UserResponse;
}

export interface DeleteUserResponse {
    success: boolean;
    message: string;
}
