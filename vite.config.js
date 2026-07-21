import { defineConfig, loadEnv } from 'vite';
import { createRealtimeMiddleware } from './server/realtime-session.mjs';

function sayScapeVoicePlugin(options) {
  const middleware = createRealtimeMiddleware(options);
  return {
    name: 'sayscape-voice-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [sayScapeVoicePlugin({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_REALTIME_MODEL,
      maleVoice: env.OPENAI_REALTIME_VOICE_MALE,
      femaleVoice: env.OPENAI_REALTIME_VOICE_FEMALE,
      worldVoices: {
        hindi: {
          male: env.OPENAI_REALTIME_VOICE_HINDI_MALE,
          female: env.OPENAI_REALTIME_VOICE_HINDI_FEMALE,
        },
        japanese: {
          male: env.OPENAI_REALTIME_VOICE_JAPANESE_MALE,
          female: env.OPENAI_REALTIME_VOICE_JAPANESE_FEMALE,
        },
        spanish: {
          male: env.OPENAI_REALTIME_VOICE_SPANISH_MALE,
          female: env.OPENAI_REALTIME_VOICE_SPANISH_FEMALE,
        },
      },
      transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL,
    })],
  };
});
