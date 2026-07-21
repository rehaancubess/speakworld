import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { createRealtimeMiddleware } from './realtime-session.mjs';

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_ROOT = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const INDEX_PATH = resolve(DIST_ROOT, 'index.html');
const CHUNKED_STREAM_THRESHOLD = 8 * 1024 * 1024;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const realtimeMiddleware = createRealtimeMiddleware({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_REALTIME_MODEL,
  maleVoice: process.env.OPENAI_REALTIME_VOICE_MALE,
  femaleVoice: process.env.OPENAI_REALTIME_VOICE_FEMALE,
  worldVoices: {
    hindi: {
      male: process.env.OPENAI_REALTIME_VOICE_HINDI_MALE,
      female: process.env.OPENAI_REALTIME_VOICE_HINDI_FEMALE,
    },
    japanese: {
      male: process.env.OPENAI_REALTIME_VOICE_JAPANESE_MALE,
      female: process.env.OPENAI_REALTIME_VOICE_JAPANESE_FEMALE,
    },
    spanish: {
      male: process.env.OPENAI_REALTIME_VOICE_SPANISH_MALE,
      female: process.env.OPENAI_REALTIME_VOICE_SPANISH_FEMALE,
    },
  },
  transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL,
});

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Length', Buffer.byteLength(body));
  response.end(body);
}

function safeAssetPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = normalize(decoded).replace(/^[/\\]+/, '');
  const candidate = resolve(DIST_ROOT, relative);
  if (candidate !== DIST_ROOT && !candidate.startsWith(`${DIST_ROOT}${sep}`)) return null;
  return candidate;
}

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match) return null;
  let start = match[1] ? Number.parseInt(match[1], 10) : 0;
  let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number.parseInt(match[2], 10);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= size) return false;
  return { start, end: Math.min(end, size - 1) };
}

function cacheControl(pathname) {
  if (pathname === '/' || pathname.endsWith('.html')) return 'no-cache';
  if (/\/assets\/index-[A-Za-z0-9_-]+\.(?:css|js)$/.test(pathname)) return 'public, max-age=31536000, immutable';
  return 'public, max-age=3600, stale-while-revalidate=86400';
}

function sendFile(request, response, pathname, filePath) {
  const stat = statSync(filePath);
  const type = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const range = byteRange(request.headers.range, stat.size);
  if (range === false) {
    response.statusCode = 416;
    response.setHeader('Content-Range', `bytes */${stat.size}`);
    response.end();
    return;
  }

  response.setHeader('Content-Type', type);
  response.setHeader('Cache-Control', cacheControl(pathname));
  response.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    const length = range.end - range.start + 1;
    response.statusCode = 206;
    response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`);
    response.setHeader('Content-Length', length);
    if (request.method === 'HEAD') return response.end();
    createReadStream(filePath, range).pipe(response);
    return;
  }

  const compressible = /^(?:text\/|application\/(?:javascript|json))/.test(type);
  const useGzip = compressible && /(?:^|,)\s*gzip\s*(?:,|$)/i.test(request.headers['accept-encoding'] || '');
  if (useGzip) {
    response.setHeader('Content-Encoding', 'gzip');
    response.setHeader('Vary', 'Accept-Encoding');
  } else if (request.method === 'HEAD' || stat.size < CHUNKED_STREAM_THRESHOLD) {
    response.setHeader('Content-Length', stat.size);
  }
  if (request.method === 'HEAD') return response.end();
  const stream = createReadStream(filePath);
  if (useGzip) stream.pipe(createGzip()).pipe(response);
  else stream.pipe(response);
}

function serveStatic(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.statusCode = 404;
    response.end('Not found.');
    return;
  }

  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/api/health' || url.pathname === '/healthz') {
    sendJson(response, 200, {
      ok: true,
      service: 'speakworld',
      voiceConfigured: Boolean(process.env.OPENAI_API_KEY),
    });
    return;
  }

  let filePath = url.pathname === '/' ? INDEX_PATH : safeAssetPath(url.pathname);
  if (!filePath) {
    response.statusCode = 400;
    response.end('Invalid path.');
    return;
  }

  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) filePath = resolve(filePath, 'index.html');
    if (!statSync(filePath).isFile()) throw new Error('NOT_FILE');
  } catch {
    // Speakworld is a single-page app; unknown extensionless paths return the
    // app shell, while missing assets remain a proper 404.
    if (!extname(url.pathname)) filePath = INDEX_PATH;
    else {
      response.statusCode = 404;
      response.end('Not found.');
      return;
    }
  }

  sendFile(request, response, url.pathname, filePath);
}

const server = createServer((request, response) => {
  securityHeaders(response);
  Promise.resolve(realtimeMiddleware(request, response, () => serveStatic(request, response)))
    .catch((error) => {
      console.error('Unhandled request error:', error);
      if (!response.headersSent) sendJson(response, 500, { ok: false });
      else response.destroy();
    });
});

server.listen(PORT, HOST, () => {
  console.log(`Speakworld listening on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received; closing Speakworld.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
