import { createRealtimeAnswer } from './realtime-session.mjs';
import { REALTIME_WORLD_IDS } from './practice-lessons.mjs';

// API Gateway HTTP API adapter for the same server-only WebRTC handshake used by Vite.
// Put OPENAI_API_KEY in AWS Secrets Manager and expose it to this Lambda at runtime;
// never bundle the key into the web app.
export async function handler(event) {
  const path = event.rawPath || event.requestContext?.http?.path || '';
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  if (path === '/api/voice/status' && method === 'GET') {
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({ configured: Boolean(process.env.OPENAI_API_KEY), worlds: process.env.OPENAI_API_KEY ? REALTIME_WORLD_IDS : [] }),
    };
  }
  if (path !== '/api/realtime/session' || method !== 'POST') return { statusCode: 404, body: 'Not found.' };

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');
  const result = await createRealtimeAnswer({
    sdp: rawBody,
    worldId: event.queryStringParameters?.world || 'hindi',
    lessonId: event.queryStringParameters?.lesson || '',
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
    clientIdentifier: event.requestContext?.authorizer?.jwt?.claims?.sub
      || event.requestContext?.identity?.sourceIp
      || event.requestContext?.http?.sourceIp
      || 'aws-user',
  });
  return {
    statusCode: result.status,
    headers: { 'content-type': result.contentType, 'cache-control': 'no-store' },
    body: result.body,
  };
}
