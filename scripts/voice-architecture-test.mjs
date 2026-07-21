import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRealtimeSession, createRealtimeAnswer } from '../server/realtime-session.mjs';

const session = buildRealtimeSession({ worldId: 'hindi', lessonId: 'food' });
assert.equal(session.model, 'gpt-realtime-2.1-mini');
assert.equal(session.audio.input.turn_detection.type, 'semantic_vad');
assert.equal(session.audio.input.turn_detection.eagerness, 'low');
assert.equal(session.audio.input.turn_detection.create_response, true);
assert.equal(session.audio.input.turn_detection.interrupt_response, false);
assert.equal(session.audio.input.transcription.language, 'hi');
assert.equal(session.max_output_tokens, 900);
assert.match(session.instructions, /Meera/);
assert.match(session.instructions, /Phrases Asha taught/);
assert.equal(session.audio.output.voice, 'marin');
assert.equal(buildRealtimeSession({ worldId: 'hindi', lessonId: 'greeting' }).audio.output.voice, 'cedar');
assert.equal(buildRealtimeSession({ worldId: 'hindi', lessonId: 'greeting', maleVoice: 'ash' }).audio.output.voice, 'ash');
assert.equal(buildRealtimeSession({ worldId: 'hindi', lessonId: 'not-a-lesson' }), null);

const japaneseSession = buildRealtimeSession({ worldId: 'japanese', lessonId: 'food' });
assert.equal(japaneseSession.audio.input.transcription.language, 'ja');
assert.equal(japaneseSession.audio.output.voice, 'shimmer');
assert.match(japaneseSession.instructions, /Aiko/);
assert.match(japaneseSession.instructions, /Phrases Yuki taught/);
assert.match(japaneseSession.instructions, /beginner Japanese/);

const spanishSession = buildRealtimeSession({ worldId: 'spanish', lessonId: 'directions' });
assert.equal(spanishSession.audio.input.transcription.language, 'es');
assert.equal(spanishSession.audio.output.voice, 'ash');
assert.match(spanishSession.instructions, /Diego/);
assert.match(spanishSession.instructions, /Phrases Lola taught/);
assert.match(spanishSession.instructions, /Mexican Spanish/);
assert.equal(buildRealtimeSession({ worldId: 'unknown', lessonId: 'greeting' }), null);

let upstreamRequest;
const answer = await createRealtimeAnswer({
  sdp: 'v=0\r\nmock-offer',
  worldId: 'japanese',
  lessonId: 'greeting',
  apiKey: 'test-key-not-real',
  clientIdentifier: 'test-user',
  fetchImpl: async (url, options) => {
    upstreamRequest = { url, options };
    return new Response('v=0\r\nmock-answer', { status: 200, headers: { 'content-type': 'application/sdp' } });
  },
});
assert.equal(answer.status, 200);
assert.equal(answer.contentType, 'application/sdp');
assert.match(upstreamRequest.url, /\/v1\/realtime\/calls$/);
assert.ok(upstreamRequest.options.body instanceof FormData);
assert.equal(upstreamRequest.options.body.get('sdp'), 'v=0\r\nmock-offer');
const submittedSession = JSON.parse(upstreamRequest.options.body.get('session'));
assert.equal(submittedSession.audio.output.voice, 'echo');
assert.equal(submittedSession.audio.input.transcription.language, 'ja');

const noKey = await createRealtimeAnswer({ sdp: 'v=0', worldId: 'spanish', lessonId: 'greeting', apiKey: '' });
assert.equal(noKey.status, 503);
const clientSource = await readFile(new URL('../src/realtime-practice.js', import.meta.url), 'utf8');
assert.doesNotMatch(clientSource, /OPENAI_API_KEY|sk-proj-/);
assert.match(clientSource, /SESSION_SECONDS = 150/);
assert.match(clientSource, /MAX_USER_TURNS = 6/);
assert.doesNotMatch(clientSource, /input_audio_buffer\.commit|Hold to speak|startHolding/);
assert.match(clientSource, /Mic paused · click to resume/);
assert.doesNotMatch(clientSource, /response\.cancel|output_audio_buffer\.clear/);
assert.doesNotMatch(clientSource, /worldId !== 'hindi'/);
assert.match(clientSource, /world=\$\{encodeURIComponent\(this\.worldId\)\}/);
console.log('Voice architecture checks passed.');
