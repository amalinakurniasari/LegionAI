
import { initializeMongoDB, closeMongoDB } from './mongo';
import { logger } from '~/utils/logger';

export async function setupMongoDB(): Promise<void> {
    try {
        await initializeMongoDB();
        logger.info('MongoDB setup completed successfully');

        setupGracefulShutdown();
    } catch (error: any) {
        logger.error('MongoDB setup failed:', error);
        throw error;
    }
}

function setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
        logger.info(`${signal} received. Closing MongoDB connections...`);
        try {
            await closeMongoDB();
            logger.info('MongoDB connections closed successfully');
            process.exit(0);
        } catch (error) {
            logger.error('Error during MongoDB shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2'));

    process.on('uncaughtException', async (error) => {
        logger.error('Uncaught Exception:', error);
        await closeMongoDB();
        process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        await closeMongoDB();
        process.exit(1);
    });
}

export { initializeMongoDB, closeMongoDB };
