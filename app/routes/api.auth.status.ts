import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getUserFromRequest } from '~/lib/auth/session.server';

/**
 * GET /api/auth/status - Check current authentication status
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { isAuthenticated, user } = await getUserFromRequest(request);

  return json({
    isAuthenticated,
    user: user
      ? {
          id: user.sub,
          name: user.name,
          email: user.email,
          username: user.preferred_username,
        }
      : null,
  });
}
