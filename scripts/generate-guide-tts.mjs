import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HINDI_LESSONS, JAPANESE_LESSONS, SPANISH_LESSONS } from '../src/guide-world-systems.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiKey = process.env.OPENAI_API_KEY;
const force = process.argv.includes('--force');
const worldArgument = process.argv.find((argument) => argument.startsWith('--world='))?.split('=')[1];
const generateAll = process.argv.includes('--all');

const WORLDS = Object.freeze({
  hindi: {
    lessons: HINDI_LESSONS,
    guide: 'Asha',
    directory: 'asha',
    voice: process.env.OPENAI_TTS_VOICE_HINDI || 'marin',
    instructions: 'Warm, encouraging Indian language tutor. Speak the English naturally and pronounce the Hindi slowly and clearly. Do not add any words.',
  },
  japanese: {
    lessons: JAPANESE_LESSONS,
    guide: 'Yuki',
    directory: 'yuki',
    voice: process.env.OPENAI_TTS_VOICE_JAPANESE || 'shimmer',
    instructions: 'Warm, encouraging Japanese language tutor. Speak the English naturally and pronounce the Japanese slowly, clearly, and politely. Do not add any words.',
  },
  spanish: {
    lessons: SPANISH_LESSONS,
    guide: 'Lola',
    directory: 'lola',
    voice: process.env.OPENAI_TTS_VOICE_SPANISH || 'coral',
    instructions: 'Warm, encouraging Mexican Spanish language tutor. Speak the English naturally and pronounce the Spanish slowly and clearly with a natural Mexican accent. Do not add any words.',
  },
});

if (!apiKey) {
  console.error('OPENAI_API_KEY is missing. Put a newly created key in .env.local before running this script.');
  process.exit(1);
}

if (worldArgument && !WORLDS[worldArgument]) {
  console.error(`Unknown world "${worldArgument}". Choose hindi, japanese, or spanish.`);
  process.exit(1);
}

function narrationText(lesson, guide) {
  const phrases = lesson.teachingPhrases?.length
    ? lesson.teachingPhrases
    : [{ hi: lesson.phraseHi, romaji: lesson.phraseRomaji, en: lesson.phraseEn }];
  const phraseLesson = phrases.map((phrase, index) => {
    const native = phrase.hi.replace('___', 'your name');
    const reading = phrase.romaji ? ` Reading: ${phrase.romaji.replace('___', 'your name')}.` : '';
    const english = phrase.en.replace('___', 'your name');
    return `Phrase ${index + 1}: ${native}.${reading} In English: ${english}`;
  }).join(' ');
  const situation = lesson.context ? `Your situation: ${lesson.context}` : '';
  return `${lesson.title}. ${situation} ${guide}'s tip: ${lesson.guide} Learn these before you continue. ${phraseLesson} Take a moment to remember them, then go practise naturally.`;
}

async function loadManifest(manifestPath, guide) {
  try { return JSON.parse(await readFile(manifestPath, 'utf8')); } catch { return { version: 1, guide, generated: [] }; }
}

async function generateWorld(worldId) {
  const config = WORLDS[worldId];
  const worldDirectory = path.join(root, 'public/assets/audio', worldId);
  const outputDirectory = path.join(worldDirectory, config.directory);
  const manifestPath = path.join(worldDirectory, 'manifest.json');
  await mkdir(outputDirectory, { recursive: true });
  const manifest = await loadManifest(manifestPath, config.guide);
  const generatedById = new Map((manifest.generated ?? []).map((entry) => [entry.lessonId, entry]));

  for (const lesson of config.lessons) {
    const relativeFile = `${config.directory}/${lesson.id}.mp3`;
    const outputFile = path.join(worldDirectory, relativeFile);
    if (!force && existsSync(outputFile)) {
      generatedById.set(lesson.id, { lessonId: lesson.id, file: relativeFile });
      continue;
    }

    console.log(`Generating ${config.guide} tutorial: ${lesson.id}`);
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        voice: config.voice,
        input: narrationText(lesson, config.guide),
        instructions: config.instructions,
        response_format: 'mp3',
      }),
    });
    if (!response.ok) throw new Error(`TTS failed for ${worldId}/${lesson.id}: ${response.status} ${await response.text()}`);
    await writeFile(outputFile, Buffer.from(await response.arrayBuffer()));
    generatedById.set(lesson.id, { lessonId: lesson.id, file: relativeFile });
  }

  await writeFile(manifestPath, `${JSON.stringify({
    version: 1,
    guide: config.guide,
    disclosure: 'AI-generated voice',
    model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    voice: config.voice,
    generated: [...generatedById.values()],
  }, null, 2)}\n`);
  console.log(`Generated ${generatedById.size} reusable ${config.guide} tutorial files.`);
}

const selectedWorlds = generateAll ? Object.keys(WORLDS) : [worldArgument || 'hindi'];
for (const worldId of selectedWorlds) await generateWorld(worldId);
