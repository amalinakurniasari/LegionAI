import 'dd-trace/init';
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
});