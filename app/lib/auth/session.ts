import { getSession, commitSession, destroySession } from '~/lib/auth/session.server';
import {
  getOIDCConfig,
  createPkcePair,
  generateState,
  generateNonce,
  buildAuthorizationUrl,
  refreshAccessToken,
  RevokedGrantError,
  InteractionRequiredError,
  ClaimsChallengeError,
} from '~/lib/auth/oidc.server';

export async function enforceAuthGuard(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/build/') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname === '/robots.txt'
  ) {
    return null;
  }

  const cookie = request.headers.get('Cookie');
  const session = await getSession(cookie);

  const refreshToken = session.get('refreshToken') as string | undefined;
  if (!refreshToken) {
    console.log('[auth-guard] no refresh token; redirecting to login');
    return null;
  }

  const origin = `${url.protocol}//${url.host}`;
  const config = getOIDCConfig(origin);

  try {
    await refreshAccessToken(config, refreshToken);
    return null;
  } catch (err: any) {
    const isRevoked = err instanceof RevokedGrantError || String(err?.message || '').includes('AADSTS50173');
    const isInteraction = err instanceof InteractionRequiredError;
    const isClaims = err instanceof ClaimsChallengeError;

    if (!(isRevoked || isInteraction || isClaims)) {
      throw err;
    }

    const clearedCookie = await destroySession(session);

    const newSession = await getSession(null);
    const { verifier, challenge } = await createPkcePair();
    const state = generateState();
    const nonce = generateNonce();

    newSession.set('pkce_verifier', verifier);
    newSession.set('oidc_state', state);
    newSession.set('oidc_nonce', nonce);
    newSession.set('returnTo', url.pathname + url.search);

    const setCookie = await commitSession(newSession);

    const claims = isClaims ? (err as ClaimsChallengeError).claims : undefined;
    const authUrl = buildAuthorizationUrl(config, state, nonce, challenge, true, claims);

    const headers = new Headers();
    headers.set('Location', authUrl);
    headers.append('Set-Cookie', clearedCookie);
    headers.append('Set-Cookie', setCookie);

    return new Response(null, { status: 302, headers });
  }
}
