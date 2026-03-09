import type { IUserRepository } from '../repository';
import type {
    CreateUserRequest,
    CreateUserResponse,
    UserEntity,
} from '../domain';
import type { MinimalUserClaims } from '~/lib/auth/oidc.server';
import { logger } from '~/utils/logger';

export class UserUsecase {
    private static instance: UserUsecase;
    private userRepository: IUserRepository;

    private constructor(userRepository: IUserRepository) {
        this.userRepository = userRepository;
    }

    public static getInstance(userRepository: IUserRepository): UserUsecase {
        if (!UserUsecase.instance) {
            UserUsecase.instance = new UserUsecase(userRepository);
        }
        return UserUsecase.instance;
    }

    public async createOrUpdateUserFromOIDC(claims: MinimalUserClaims, createdBy: string = 'OIDC'): Promise<CreateUserResponse> {
        try {
            const userId = claims.sub;
            const email = claims.email || claims.preferred_username || '';
            const username = claims.preferred_username || claims.email || claims.sub;
            const fullName = claims.name || '';

            if (!email) {
                return {
                    success: false,
                    message: 'Email is required from OIDC claims',
                };
            }

            const existingUser = await this.userRepository.findByEmail(email);
            
            if (existingUser) {
                logger.info(`User already exists: ${email}`);
                return {
                    success: true,
                    message: 'User already exists',
                    userId: existingUser.userId,
                };
            }

            const userEntity: UserEntity = {
                userId,
                username,
                email,
                password: '',
                fullName,
                isActive: true,
                roles: claims.roles ?? [],
                metadata: {
                    loginCount: 1,
                    oidcTenantId: claims.tid,
                },
                createdAt: new Date().toISOString(),
                createdBy,
            };

            await this.userRepository.create(userEntity);

            logger.info(`User created from OIDC: ${userEntity.userId}`);

            return {
                success: true,
                message: 'User created successfully',
                userId: userEntity.userId,
            };
        } catch (error: any) {
            logger.error('Error in createOrUpdateUserFromOIDC usecase:', error);
            return {
                success: false,
                message: error.message || 'Failed to create user from OIDC',
            };
        }
    }

}
