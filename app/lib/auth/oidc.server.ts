import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

export type OIDCConfig = {
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
};

const getEnv = (
  key: string,
  fallback?: string,
  env?: Record<string, string | undefined>,
) => {
  const fromContext = env ? (env[key] as string | undefined) : undefined;
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;

  let fromVite: string | undefined;
  try {
    const viteEnv = (typeof import.meta !== 'undefined')
      ? ((import.meta as any)?.env as Record<string, string | undefined> | undefined)
      : undefined;
    fromVite = viteEnv ? (viteEnv[key] as string | undefined) : undefined;
  } catch {
    fromVite = undefined;
  }

  const v = fromContext ?? fromProcess ?? fromVite ?? fallback;
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
};

const getEnvOptional = (
  key: string,
  env?: Record<string, string | undefined>,
): string | undefined => {
  const fromContext = env ? (env[key] as string | undefined) : undefined;
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  let fromVite: string | undefined;
  try {
    const viteEnv = (typeof import.meta !== 'undefined')
      ? ((import.meta as any)?.env as Record<string, string | undefined> | undefined)
      : undefined;
    fromVite = viteEnv ? (viteEnv[key] as string | undefined) : undefined;
  } catch {
    fromVite = undefined;
  }
  return fromContext ?? fromProcess ?? fromVite ?? undefined;
};

export function getOIDCConfig(
  origin?: string,
  env?: Record<string, string | undefined>,
): OIDCConfig {
  const tenantId = getEnv('VITE_AZURE_TENANT_ID', undefined, env) ;
  const clientId = getEnv('VITE_AZURE_CLIENT_ID', undefined, env) ;

  const resolvedOrigin = origin || getOrigin();
  const redirectFromEnv = getEnv('VITE_AZURE_REDIRECT_URI', undefined, env);
  const redirectUri = redirectFromEnv || `${resolvedOrigin}/auth/callback`;

  const clientSecret = getEnv('VITE_AZURE_CLIENT_SECRET', undefined, env);
  const scopes = ['openid', 'profile', 'email', 'offline_access'];

  return { tenantId, clientId, clientSecret, redirectUri, scopes };
}

function getOrigin() {
  return 'http://localhost:5173';
}

export function getEndpoints(tenantId: string) {
  const base = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
  return {
    authorize: `${base}/authorize`,
    token: `${base}/token`,
    logout: `${base}/logout`,
    jwks: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  };
}

// Error classifications
export class RevokedGrantError extends Error {
  constructor(message: string, public code = 'AADSTS50173') {
    super(message);
    this.name = 'RevokedGrantError';
  }
}

export class InteractionRequiredError extends Error {
  constructor(message: string, public code = 'interaction_required') {
    super(message);
    this.name = 'InteractionRequiredError';
  }
}

export class MisconfigurationError extends Error {
  constructor(message: string, public code = 'misconfiguration') {
    super(message);
    this.name = 'MisconfigurationError';
  }
}

export class ClaimsChallengeError extends Error {
  constructor(message: string, public claims: string) {
    super(message);
    this.name = 'ClaimsChallengeError';
  }
}

// Error classification helpers
function isAADSTS50173(obj: any): boolean {
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '');
  const code = String(obj?.error ?? '');
  const suberror = String(obj?.suberror ?? '');
  return desc.includes('AADSTS50173') || code === 'AADSTS50173' || suberror === 'AADSTS50173';
}

function isInvalidGrant(obj: any): boolean {
  return String(obj?.error ?? '') === 'invalid_grant';
}

function isRevokedGrant(obj: any): boolean {
  const descLower = String(obj?.error_description ?? obj?.errorDescription ?? '').toLowerCase();
  return isAADSTS50173(obj) || (isInvalidGrant(obj) && (
    descLower.includes('revoked') ||
    descLower.includes('password') ||
    descLower.includes('forced sign-out') ||
    descLower.includes('sign-in frequency')
  ));
}

function isRefreshExpired(obj: any): boolean {
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '');
  return desc.includes('AADSTS700082');
}

function isConsentRequired(obj: any): boolean {
  const code = String(obj?.error ?? '');
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '').toLowerCase();
  return code === 'AADSTS65001' || desc.includes('consent_required');
}

function isInteractionRequired(obj: any): boolean {
  const code = String(obj?.error ?? '').toLowerCase();
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '').toLowerCase();
  return code === 'interaction_required' || desc.includes('interaction_required') || desc.includes('50076');
}

function isMFARequired(obj: any): boolean {
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '');
  return desc.includes('AADSTS50076');
}

function hasClaims(obj: any): boolean {
  return Boolean(obj?.claims);
}

function getClaims(obj: any): string | undefined {
  try {
    if (obj?.claims && typeof obj.claims === 'string') return obj.claims;
    if (obj?.claims && typeof obj.claims === 'object') return JSON.stringify(obj.claims);
    return undefined;
  } catch {
    return undefined;
  }
}

function isRedirectMismatch(obj: any): boolean {
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '');
  return desc.includes('AADSTS50011');
}

function isInvalidClient(obj: any): boolean {
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '');
  const code = String(obj?.error ?? '');
  return code === 'AADSTS700016' || desc.includes('AADSTS700016');
}

function isInvalidClientSecret(obj: any): boolean {
  const desc = String(obj?.error_description ?? obj?.errorDescription ?? '');
  return desc.includes('AADSTS7000215') || desc.includes('AADSTS70002');
}

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

function base64url(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return b64;
}

async function sha256(input: string): Promise<ArrayBuffer> {
  if ((crypto as any).subtle?.digest) {
    const enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(input));
  } else {
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(input).digest();
    return new Uint8Array(hash).buffer;
  }
}

export async function createPkcePair() {
  const verifier = randomString(64);
  const challengeBuf = await sha256(verifier);
  const challenge = base64url(challengeBuf);
  return { verifier, challenge };
}

export function buildAuthorizationUrl(
  config: OIDCConfig,
  state: string,
  nonce: string,
  codeChallenge: string,
  forceLogin?: boolean,
  claims?: string,
) {
  const endpoints = getEndpoints(config.tenantId);
  const url = new URL(endpoints.authorize);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (forceLogin) url.searchParams.set('prompt', 'login');
  if (claims) url.searchParams.set('claims', claims);
  return url.toString();
}

export type TokenResponse = {
  token_type: string;
  expires_in: number;
  ext_expires_in?: number;
  access_token: string;
  id_token: string;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeCodeForTokens(
  config: OIDCConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const endpoints = getEndpoints(config.tenantId);
  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('client_id', config.clientId);
  params.set('code', code);
  params.set('redirect_uri', config.redirectUri);
  params.set('code_verifier', codeVerifier);
  params.set('scope', config.scopes.join(' '));
  if (config.clientSecret) params.set('client_secret', config.clientSecret);

  if (process.env.NODE_ENV !== 'production') {
    const debugParams = new URLSearchParams(params);
    if (debugParams.has('client_secret')) debugParams.set('client_secret', '[REDACTED]');
    debugParams.delete('code');
    debugParams.delete('code_verifier');
    console.log('[OIDC] Token request debug', {
      url: endpoints.token,
      hasClientSecret: !!config.clientSecret,
      tenantId: config.tenantId,
      redirectUri: config.redirectUri,
      scope: config.scopes.join(' '),
      body: debugParams.toString(),
    });
  }

  const res = await fetch(endpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { body = null; }

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[OIDC] Token exchange failed', {
        status: res.status,
        hasClientSecret: !!config.clientSecret,
        tenantId: config.tenantId,
        redirectUri: config.redirectUri,
        error: text.slice(0, 500),
        parsed: body ? { error: body.error, suberror: body.suberror, error_description: String(body.error_description || '').slice(0, 500), claims: body.claims ? '[present]' : undefined } : null,
      });
    }

    if (body) {
      if (hasClaims(body)) {
        const claims = getClaims(body)!;
        throw new ClaimsChallengeError(body.error_description || 'Claims challenge required by Conditional Access', claims);
      }
      if (isConsentRequired(body) || isInteractionRequired(body) || isMFARequired(body)) {
        throw new InteractionRequiredError(body.error_description || 'User interaction required');
      }
      if (isRevokedGrant(body) || isRefreshExpired(body)) {
        throw new RevokedGrantError(body.error_description || 'Authorization grant was revoked');
      }
      if (isRedirectMismatch(body) || isInvalidClient(body) || isInvalidClientSecret(body)) {
        throw new MisconfigurationError(body.error_description || 'Client or redirect misconfiguration');
      }
    }

    const reason = body
      ? `${body.error ?? 'error'} ${body.error_description ?? ''}`.trim()
      : text;
    throw new Error(`Token exchange failed: ${res.status} ${reason}`);
  }

  return (await res.json()) as TokenResponse;
}

export async function validateIdToken(config: OIDCConfig, idToken: string, expectedNonce: string) {
  const endpoints = getEndpoints(config.tenantId);
  const JWKS = createRemoteJWKSet(new URL(endpoints.jwks));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: endpoints.issuer,
    audience: config.clientId,
    maxTokenAge: '10 min',
    clockTolerance: '5 min',
  });

  const nonce = (payload as any).nonce as string | undefined;
  if (!nonce || nonce !== expectedNonce) {
    throw new Error('Invalid or missing nonce in id_token');
  }

  return payload;
}

export type MinimalUserClaims = {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  tid?: string;
  roles?: string[];
};

export function extractUserClaims(payload: JWTPayload): MinimalUserClaims {
  return {
    sub: payload.sub!,
    name: (payload as any).name as string | undefined,
    preferred_username: (payload as any).preferred_username as string | undefined,
    email: (payload as any).email as string | undefined,
    tid: (payload as any).tid as string | undefined,
    roles: (payload as any).roles as string[] | undefined,
  };
}

export function generateState(): string {
  return randomString(16);
}

export function generateNonce(): string {
  return randomString(16);
}

export async function refreshAccessToken(config: OIDCConfig, refreshToken: string): Promise<TokenResponse> {
  const endpoints = getEndpoints(config.tenantId);
  const params = new URLSearchParams();
  params.set('grant_type', 'refresh_token');
  params.set('client_id', config.clientId);
  params.set('refresh_token', refreshToken);
  if (config.clientSecret) params.set('client_secret', config.clientSecret);

  const res = await fetch(endpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { body = null; }

    if (body) {
      if (hasClaims(body)) {
        const claims = getClaims(body)!;
        throw new ClaimsChallengeError(body.error_description || 'Claims challenge required by Conditional Access', claims);
      }
      if (isConsentRequired(body) || isInteractionRequired(body) || isMFARequired(body)) {
        throw new InteractionRequiredError(body.error_description || 'User interaction required');
      }
      if (isRevokedGrant(body) || isRefreshExpired(body)) {
        throw new RevokedGrantError(body.error_description || 'Refresh grant was revoked');
      }
      if (isRedirectMismatch(body) || isInvalidClient(body) || isInvalidClientSecret(body)) {
        throw new MisconfigurationError(body.error_description || 'Client or redirect misconfiguration');
      }
    }

    const reason = body
      ? `${body.error ?? 'error'} ${body.error_description ?? ''}`.trim()
      : text;
    throw new Error(`Refresh token exchange failed: ${res.status} ${reason}`);
  }

  return (await res.json()) as TokenResponse;
}

export function getLogoutUrl(config: OIDCConfig, postLogoutRedirect?: string) {
  const endpoints = getEndpoints(config.tenantId);
  const url = new URL(endpoints.logout);
  url.searchParams.set('post_logout_redirect_uri', postLogoutRedirect || config.redirectUri);
  return url.toString();
}
