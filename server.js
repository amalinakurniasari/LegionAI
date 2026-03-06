// Load environment variables first, before any other imports
import 'dotenv/config';

// CRITICAL: Make process.env available globally for bundled code
// This ensures that environment variables are accessible even in the Remix server bundle
if (typeof global !== 'undefined') {
  global.process = global.process || {};
  global.process.env = global.process.env || {};

  // Copy all environment variables to global.process.env
  Object.assign(global.process.env, process.env);
}

import tracer from 'dd-trace';
tracer.init();
import { installGlobals } from '@remix-run/node';
import { createRequestHandler } from '@remix-run/express';
import express            from 'express';
import path               from 'node:path';
import { fileURLToPath }  from 'node:url';
import { fetch, FormData, Headers, Request, Response } from 'undici';

installGlobals();

globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;
globalThis.FormData = FormData;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT || 5173;

const app = express();

// ── static assets ────────────────────────────────────────────────────
app.use(
  '/assets',
  express.static(path.join(__dirname, 'build', 'client', 'assets'), {
    immutable: true,
    maxAge:    '1y',
  })
);

app.use(
  express.static(path.join(__dirname, 'build', 'client'), {
    maxAge: '1h',
  })
);

// ── Remix SSR  ────────────────────────────────────────────────────────
const build = await import(path.join(__dirname, 'build', 'server', 'index.js'));

app.all(
  '*',
  createRequestHandler({
    build,
    getLoadContext() {
      return { env: process.env };
    },
  })
);

// ── listen ────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LegionAI  ▶  http://0.0.0.0:${PORT}`);
  console.log(`Environment check:`);
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  - MONGODB_URI: ${process.env.MONGODB_URI}`);
  console.log(`  - RUNNING_IN_DOCKER: ${process.env.RUNNING_IN_DOCKER}`);
});