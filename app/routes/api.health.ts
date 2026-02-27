import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { MongoWrite  } from '~/lib/.server/databases/mongo';
import { logger } from '~/utils/logger';

export const loader = async ({ request: _request }: LoaderFunctionArgs) => {
  try {
    const databaseConnected = await MongoWrite.isConnected();

    const healthStatus = {
      status: databaseConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: databaseConnected
    };

    logger.info('Health check completed:', JSON.stringify(healthStatus));

    if (!databaseConnected) {
      return Response.json(healthStatus, { status: 503 });
    }

    return Response.json(healthStatus);
  } catch (error: any) {
    logger.error('Health check failed:', error);

    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: false,
        connections: {
          write: false,
          read: false,
        },
        error: error.message,
      },
      { status: 503 }
    );
  }
};
