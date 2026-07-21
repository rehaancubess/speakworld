import { createHash } from 'node:crypto';
import {
  buildPracticeInstructions,
  DEFAULT_REALTIME_VOICES,
  practiceLesson,
  practiceWorld,
  REALTIME_WORLD_IDS,
  voiceGenderForLesson,
} from './practice-lessons.mjs';

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const MAX_SDP_BYTES = 128_000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SESSIONS_PER_WINDOW = 20;
const sessionWindows = new Map();

function safetyIdentifier(value = 'anonymous') {
  return createHash('sha256').update(String(value)).digest('hex');
}

function allowSession(identifier) {
  const now = Date.now();
  const current = sessionWindows.get(identifier);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    sessionWindows.set(identifier, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_SESSIONS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export function buildRealtimeSession({
  worldId = 'hindi',
  lessonId,
  model,
  maleVoice,
  femaleVoice,
  worldVoices,
  transcriptionModel,
}) {
  const world = practiceWorld(worldId);
  const instructions = buildPracticeInstructions(worldId, lessonId);
  if (!instructions) return null;
  const voiceGender = voiceGenderForLesson(worldId, lessonId);
  const configuredVoices = worldVoices?.[worldId] ?? {};
  const defaultVoices = DEFAULT_REALTIME_VOICES[worldId];
  // Keep the original global overrides backwards-compatible with Hindi while
  // allowing Japanese and Spanish to retain their own default casts.
  const legacyVoice = worldId === 'hindi'
    ? (voiceGender === 'male' ? maleVoice : femaleVoice)
    : null;
  const voice = voiceGender === 'male'
    ? (configuredVoices.male || legacyVoice || defaultVoices.male)
    : (configuredVoices.female || legacyVoice || defaultVoices.female);
  return {
    type: 'realtime',
    model: model || 'gpt-realtime-2.1-mini',
    output_modalities: ['audio'],
    // Audio tokens are counted against this ceiling too. The former 220-token
    // cap could end a spoken Hindi reply before its final words had played.
    // This is only a ceiling: concise replies still use (and cost) far less.
    max_output_tokens: 900,
    instructions,
    audio: {
      input: {
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'low',
          create_response: true,
          // Beginner lessons work better as clear alternating turns. The
          // browser also guards the microphone while the NPC is speaking.
          interrupt_response: false,
        },
        transcription: {
          model: transcriptionModel || 'gpt-realtime-whisper',
          language: world.transcriptionLanguage,
          delay: 'low',
        },
      },
      output: { voice },
    },
  };
}

export async function createRealtimeAnswer({
  sdp,
  worldId = 'hindi',
  lessonId,
  apiKey,
  clientIdentifier,
  model,
  maleVoice,
  femaleVoice,
  worldVoices,
  transcriptionModel,
  fetchImpl = fetch,
}) {
  if (!apiKey) return { status: 503, body: 'Voice practice is not configured.', contentType: 'text/plain' };
  if (!practiceLesson(worldId, lessonId)) return { status: 400, body: 'Unsupported practice lesson.', contentType: 'text/plain' };
  if (!sdp || Buffer.byteLength(sdp) > MAX_SDP_BYTES) return { status: 400, body: 'Invalid WebRTC offer.', contentType: 'text/plain' };

  const identifier = safetyIdentifier(clientIdentifier);
  if (!allowSession(identifier)) return { status: 429, body: 'Voice session limit reached. Try again later.', contentType: 'text/plain' };

  const form = new FormData();
  form.set('sdp', sdp);
  form.set('session', JSON.stringify(buildRealtimeSession({
    worldId,
    lessonId,
    model,
    maleVoice,
    femaleVoice,
    worldVoices,
    transcriptionModel,
  })));
  const upstream = await fetchImpl(OPENAI_REALTIME_CALLS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Safety-Identifier': identifier,
    },
    body: form,
  });
  const body = await upstream.text();
  return {
    status: upstream.status,
    body,
    contentType: upstream.headers.get('content-type') || (upstream.ok ? 'application/sdp' : 'text/plain'),
  };
}

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_SDP_BYTES) throw new Error('SDP_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createRealtimeMiddleware(options = {}) {
  return async function realtimeMiddleware(request, response, next) {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/api/voice/status' && request.method === 'GET') {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify({ configured: Boolean(options.apiKey), worlds: options.apiKey ? REALTIME_WORLD_IDS : [] }));
      return;
    }
    if (url.pathname !== '/api/realtime/session') return next();
    if (request.method !== 'POST') {
      response.statusCode = 405;
      response.setHeader('Allow', 'POST');
      response.end('Method not allowed.');
      return;
    }
    try {
      const result = await createRealtimeAnswer({
        sdp: await readBody(request),
        worldId: url.searchParams.get('world') || 'hindi',
        lessonId: url.searchParams.get('lesson') || '',
        apiKey: options.apiKey,
        model: options.model,
        maleVoice: options.maleVoice,
        femaleVoice: options.femaleVoice,
        worldVoices: options.worldVoices,
        transcriptionModel: options.transcriptionModel,
        clientIdentifier: request.headers['x-speakworld-user'] || request.headers['x-sayscape-user'] || request.socket.remoteAddress || 'local-user',
      });
      response.statusCode = result.status;
      response.setHeader('Content-Type', result.contentType);
      response.setHeader('Cache-Control', 'no-store');
      response.end(result.body);
    } catch (error) {
      response.statusCode = error?.message === 'SDP_TOO_LARGE' ? 413 : 502;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(error?.message === 'SDP_TOO_LARGE' ? 'WebRTC offer is too large.' : 'Unable to start voice practice.');
    }
  };
}
