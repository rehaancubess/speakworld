import {
  HINDI_LESSONS,
  JAPANESE_LESSONS,
  SPANISH_LESSONS,
} from '../src/guide-world-systems.js';

const worlds = [
  ['Hindi', HINDI_LESSONS, 'scooter', 'train'],
  ['Japanese', JAPANESE_LESSONS, 'bicycle', 'subway'],
  ['Spanish', SPANISH_LESSONS, 'bicycle', 'metro'],
];

const errors = [];
for (const [language, missions, localVehicle, transit] of worlds) {
  const ids = new Set(missions.map(({ id }) => id));
  if (missions.length !== 10 || ids.size !== 10) {
    errors.push(`${language} needs exactly ten unique missions.`);
  }

  const conversations = missions.filter(({ kind }) => kind !== 'experience');
  const experiences = missions.filter(({ kind }) => kind === 'experience');
  if (conversations.length !== 6 || experiences.length !== 4) {
    errors.push(`${language} needs six conversations and four world challenges.`);
  }

  if (!experiences.some(({ completionEvent, completionPayload }) => (
    completionEvent === 'vehicle_boarded' && completionPayload?.vehicleType === localVehicle
  ))) errors.push(`${language} is missing its ${localVehicle} mission.`);

  if (!experiences.some(({ completionEvent, completionPayload }) => (
    completionEvent === 'transit_boarded' && completionPayload?.transitType === transit
  ))) errors.push(`${language} is missing its ${transit} mission.`);

  if (!experiences.some(({ completionInteraction }) => completionInteraction === 'translate_sign')) {
    errors.push(`${language} is missing its sign-reading mission.`);
  }
  if (!experiences.some(({ completionZone }) => Boolean(completionZone))) {
    errors.push(`${language} is missing its far-district mission.`);
  }

  for (const mission of missions) {
    if (!mission.title || !mission.guide || !mission.phraseHi || !mission.phraseEn) {
      errors.push(`${language} mission ${mission.id} has incomplete guide copy.`);
    }
  }
}

console.log(JSON.stringify({
  worlds: worlds.map(([language, missions]) => ({
    language,
    missions: missions.map(({ id, title, kind = 'conversation' }) => ({ id, title, kind })),
  })),
  errors,
}, null, 2));

if (errors.length) throw new Error(`Speakworld mission test failed:\n${errors.join('\n')}`);
