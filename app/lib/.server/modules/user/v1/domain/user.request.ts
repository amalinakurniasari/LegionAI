
export interface CreateUserRequest {
    userId: string;
    username: string;
    email: string;
    password: string;
    fullName?: string;
    nik?: string;
    phoneNumber?: string;
    profilePic?: string;
    roles?: string[];
    isActive?: boolean;
}
