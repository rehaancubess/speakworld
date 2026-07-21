// Backwards-compatible Hindi exports. New code should use practice-lessons.mjs,
// which is the shared source of truth for every Speakworld language.
import {
  buildPracticeInstructions,
  practiceWorld,
  voiceGenderForLesson as multilingualVoiceGenderForLesson,
} from './practice-lessons.mjs';

export const HINDI_REALTIME_LESSONS = Object.freeze(practiceWorld('hindi').lessons);

export function buildHindiPracticeInstructions(lessonId) {
  return buildPracticeInstructions('hindi', lessonId);
}

export function voiceGenderForLesson(lessonId) {
  return multilingualVoiceGenderForLesson('hindi', lessonId);
}
