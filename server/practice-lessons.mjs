const PRACTICE_WORLDS = Object.freeze({
  hindi: {
    language: 'Hindi',
    transcriptionLanguage: 'hi',
    guide: 'Asha',
    localeDescription: 'simple contemporary Hindi used in everyday India',
    defaultVoices: { male: 'cedar', female: 'marin' },
    lessons: {
      greeting: {
        role: 'Ravi, a friendly local resident', voiceGender: 'male',
        situation: 'The learner has just met you near Nimbu Junction.',
        goal: 'Politely greet you, say how they are, and ask how you are.',
        targetPhrase: 'नमस्ते! मैं ठीक हूँ। आप कैसे हैं?', englishHint: 'Hello! I am well. How are you?',
        learnedPhrases: ['नमस्ते!', 'मेरा नाम ___ है।', 'आप कैसे हैं?'],
        conversationBeats: ['greet warmly', 'ask the learner’s name', 'say it is nice to meet them'],
      },
      food: {
        role: 'Meera, a chai and snack seller', voiceGender: 'female',
        situation: 'The learner is ordering at your small café in Namaste Bazaar.',
        goal: 'Order one tea and two samosas politely, then handle one short follow-up.',
        targetPhrase: 'मुझे एक चाय और दो समोसे चाहिए।', englishHint: 'I would like one tea and two samosas.',
        learnedPhrases: ['मुझे एक चाय चाहिए।', 'दो समोसे भी, कृपया।', 'यह कितने का है?'],
        conversationBeats: ['ask what they would like', 'confirm the quantity', 'give a simple total in rupees'],
      },
      shop: {
        role: 'Arjun, a fruit seller', voiceGender: 'male',
        situation: 'The learner is buying lemons at your market stall.',
        goal: 'Ask for two lemons and ask their price.',
        targetPhrase: 'मुझे दो नींबू चाहिए। ये कितने के हैं?', englishHint: 'I would like two lemons. How much are these?',
        learnedPhrases: ['मुझे दो नींबू चाहिए।', 'ये कितने के हैं?', 'थोड़ा कम कीजिए।'],
        conversationBeats: ['ask what they need', 'quote a price', 'respond warmly if they bargain'],
      },
      pharmacy: {
        role: 'Neha, a pharmacist', voiceGender: 'female',
        situation: 'The learner has entered your neighborhood pharmacy with a headache.',
        goal: 'Explain the headache, ask for medicine, and understand one basic instruction.',
        targetPhrase: 'मुझे सिरदर्द है। क्या आपके पास दवा है?', englishHint: 'I have a headache. Do you have medicine?',
        learnedPhrases: ['मुझे सिरदर्द है।', 'क्या आपके पास दवा है?', 'इसे कब लेना है?'],
        conversationBeats: ['ask what is wrong', 'ask one simple follow-up', 'give a fictional basic usage instruction'],
      },
      directions: {
        role: 'Kavita, a helpful local resident', voiceGender: 'female',
        situation: 'The learner stops you near Jheel Mandir to ask for directions.',
        goal: 'Get your attention politely and ask where the railway station is.',
        targetPhrase: 'माफ़ कीजिए, रेलवे स्टेशन कहाँ है?', englishHint: 'Excuse me, where is the railway station?',
        learnedPhrases: ['माफ़ कीजिए।', 'रेलवे स्टेशन कहाँ है?', 'क्या यह दूर है?'],
        conversationBeats: ['offer help', 'give two short landmark-based directions', 'check whether they understood'],
      },
      train: {
        role: 'Sanjay, a railway ticket clerk', voiceGender: 'male',
        situation: 'The learner is at the Nimbu Junction ticket window.',
        goal: 'Ask for one ticket to Pahadi Rail and respond to one simple ticket question.',
        targetPhrase: 'पहाड़ी रेल का एक टिकट दीजिए।', englishHint: 'Please give me one ticket to Pahadi Rail.',
        learnedPhrases: ['एक टिकट दीजिए।', 'ट्रेन कितने बजे आएगी?', 'प्लेटफ़ॉर्म कौन सा है?'],
        conversationBeats: ['ask the destination', 'confirm one ticket', 'tell them a platform and departure time'],
      },
    },
  },
  japanese: {
    language: 'Japanese',
    transcriptionLanguage: 'ja',
    guide: 'Yuki',
    localeDescription: 'natural, polite beginner Japanese used in everyday Japan',
    defaultVoices: { male: 'echo', female: 'shimmer' },
    lessons: {
      greeting: {
        role: 'Haru, a friendly local resident', voiceGender: 'male',
        situation: 'The learner has just met you near Sakura Gate.',
        goal: 'Greet you politely and introduce themselves for the first time.',
        targetPhrase: 'こんにちは。はじめまして。', englishHint: 'Hello. Nice to meet you.',
        learnedPhrases: ['こんにちは。', 'はじめまして。', 'わたしは ___ です。'],
        conversationBeats: ['greet warmly', 'ask the learner’s name', 'welcome them to the neighborhood'],
      },
      shop: {
        role: 'Kenji, a convenience-store clerk', voiceGender: 'male',
        situation: 'The learner is buying one item at your convenience store on Konbini Street.',
        goal: 'Ask for the item, decline a bag, and understand the price.',
        targetPhrase: 'これをください。袋は要りません。', englishHint: 'This one, please. I do not need a bag.',
        learnedPhrases: ['これをください。', '袋は要りません。', 'いくらですか？'],
        conversationBeats: ['welcome the learner', 'ask whether they need a bag', 'give a simple total in yen'],
      },
      food: {
        role: 'Aiko, a ramen-shop owner', voiceGender: 'female',
        situation: 'The learner is ordering at your small ramen shop.',
        goal: 'Order one bowl of ramen and respond to one short follow-up.',
        targetPhrase: 'ラーメンを一つお願いします。', englishHint: 'One ramen, please.',
        learnedPhrases: ['ラーメンを一つお願いします。', '水もお願いします。', 'いくらですか？'],
        conversationBeats: ['ask for the learner’s order', 'offer water', 'confirm the order'],
      },
      directions: {
        role: 'Yui, a helpful local resident', voiceGender: 'female',
        situation: 'The learner stops you beside Kawa Market to find the subway.',
        goal: 'Get your attention politely, ask for the subway station, and understand two simple directions.',
        targetPhrase: 'すみません、地下鉄の駅はどこですか？', englishHint: 'Excuse me, where is the subway station?',
        learnedPhrases: ['すみません。', '地下鉄の駅はどこですか？', '遠いですか？'],
        conversationBeats: ['offer help', 'give a straight-and-right direction', 'check whether they understood'],
      },
      train: {
        role: 'Sota, a subway attendant', voiceGender: 'male',
        situation: 'The learner is at the Sakura Gate Station ticket counter.',
        goal: 'Ask for one ticket to Yama Onsen and understand the platform.',
        targetPhrase: '山温泉までの切符を一枚ください。', englishHint: 'One ticket to Yama Onsen, please.',
        learnedPhrases: ['切符を一枚ください。', '何番線ですか？', '何時に出ますか？'],
        conversationBeats: ['ask the destination', 'confirm one ticket', 'tell them the platform and departure time'],
      },
      pharmacy: {
        role: 'Emi, a pharmacist', voiceGender: 'female',
        situation: 'The learner enters your Midori pharmacy with a headache.',
        goal: 'Explain the headache, ask for medicine, and understand one basic instruction.',
        targetPhrase: '頭が痛いです。薬はありますか？', englishHint: 'I have a headache. Do you have medicine?',
        learnedPhrases: ['頭が痛いです。', '薬はありますか？', 'いつ飲みますか？'],
        conversationBeats: ['ask what is wrong', 'ask one simple follow-up', 'give a fictional after-food instruction'],
      },
    },
  },
  spanish: {
    language: 'Mexican Spanish',
    transcriptionLanguage: 'es',
    guide: 'Lola',
    localeDescription: 'warm, natural beginner Spanish used in everyday Mexico',
    defaultVoices: { male: 'ash', female: 'coral' },
    lessons: {
      greeting: {
        role: 'Lucía, a friendly local resident', voiceGender: 'female',
        situation: 'The learner has just met you near Plaza Naranja.',
        goal: 'Greet you, introduce themselves, and say how they are.',
        targetPhrase: '¡Hola! Mucho gusto. ¿Cómo está?', englishHint: 'Hello! Nice to meet you. How are you?',
        learnedPhrases: ['¡Hola!', 'Me llamo ___.', '¿Cómo está?'],
        conversationBeats: ['greet warmly', 'ask the learner’s name', 'welcome them to Valle Naranja'],
      },
      food: {
        role: 'Mateo, a taquería owner', voiceGender: 'male',
        situation: 'The learner is ordering at your taquería in Mercado del Sol.',
        goal: 'Order two tacos and water politely, then understand the total.',
        targetPhrase: 'Quisiera dos tacos y un agua, por favor.', englishHint: 'I would like two tacos and a water, please.',
        learnedPhrases: ['Quisiera dos tacos.', 'Un agua, por favor.', '¿Cuánto es?'],
        conversationBeats: ['ask what they would like', 'ask one simple filling question', 'give a total in pesos'],
      },
      shop: {
        role: 'Sofía, a market seller', voiceGender: 'female',
        situation: 'The learner is buying oranges at your Mercado del Sol stall.',
        goal: 'Ask for two oranges and ask their price.',
        targetPhrase: 'Quiero dos naranjas. ¿Cuánto cuestan?', englishHint: 'I want two oranges. How much do they cost?',
        learnedPhrases: ['Quiero dos naranjas.', '¿Cuánto cuestan?', 'Aquí tiene.'],
        conversationBeats: ['ask what they need', 'quote a price in pesos', 'finish the purchase politely'],
      },
      directions: {
        role: 'Diego, a helpful local resident', voiceGender: 'male',
        situation: 'The learner stops you beside Canal de Flores to find the metro.',
        goal: 'Get your attention politely and ask where the metro station is.',
        targetPhrase: 'Disculpe, ¿dónde está la estación de metro?', englishHint: 'Excuse me, where is the metro station?',
        learnedPhrases: ['Disculpe.', '¿Dónde está la estación de metro?', '¿Está lejos?'],
        conversationBeats: ['offer help', 'give two short landmark-based directions', 'check whether they understood'],
      },
      train: {
        role: 'Elena, a metro attendant', voiceGender: 'female',
        situation: 'The learner is at the Plaza Naranja Metro ticket window.',
        goal: 'Ask for one ticket to Mirador Cobre and understand the platform.',
        targetPhrase: 'Un boleto para Mirador Cobre, por favor.', englishHint: 'One ticket to Mirador Cobre, please.',
        learnedPhrases: ['Un boleto, por favor.', '¿De qué andén sale?', '¿A qué hora sale?'],
        conversationBeats: ['ask the destination', 'confirm one ticket', 'tell them the platform and departure time'],
      },
      pharmacy: {
        role: 'Ana, a pharmacist', voiceGender: 'female',
        situation: 'The learner enters your Barrio Azul pharmacy with a headache.',
        goal: 'Explain the headache, ask for medicine, and understand one basic instruction.',
        targetPhrase: 'Me duele la cabeza. ¿Tiene algo para el dolor?', englishHint: 'My head hurts. Do you have something for the pain?',
        learnedPhrases: ['Me duele la cabeza.', '¿Tiene algo para el dolor?', '¿Cuándo lo tomo?'],
        conversationBeats: ['ask what is wrong', 'ask one simple follow-up', 'give a fictional after-food instruction'],
      },
    },
  },
});

export const REALTIME_WORLD_IDS = Object.freeze(Object.keys(PRACTICE_WORLDS));
export const DEFAULT_REALTIME_VOICES = Object.freeze(Object.fromEntries(
  Object.entries(PRACTICE_WORLDS).map(([worldId, world]) => [worldId, world.defaultVoices]),
));

export function practiceWorld(worldId) {
  return PRACTICE_WORLDS[worldId] ?? null;
}

export function practiceLesson(worldId, lessonId) {
  return practiceWorld(worldId)?.lessons?.[lessonId] ?? null;
}

export function voiceGenderForLesson(worldId, lessonId) {
  return practiceLesson(worldId, lessonId)?.voiceGender ?? null;
}

export function buildPracticeInstructions(worldId, lessonId) {
  const world = practiceWorld(worldId);
  const lesson = practiceLesson(worldId, lessonId);
  if (!world || !lesson) return null;
  return `
You are ${lesson.role} inside Speakworld, a beginner ${world.language} conversation game.

Situation: ${lesson.situation}
Learner goal: ${lesson.goal}
Target phrase: ${lesson.targetPhrase}
English meaning: ${lesson.englishHint}
Phrases ${world.guide} taught the learner: ${lesson.learnedPhrases.join(' | ')}
Natural conversation arc: ${lesson.conversationBeats.join(' → ')}

ROLEPLAY RULES
- Stay fully in character. Begin with one short, natural line in ${world.localeDescription} that fits the immediate situation.
- Speak slowly, warmly, and clearly for a beginner. Use the target language by default.
- Keep each reply to one clear sentence, or two short sentences when the situation needs context. Always finish the final sentence completely before yielding the turn.
- If the learner is stuck or asks in English, add one very short English hint in parentheses, then return to ${world.language}.
- Accept understandable variations; do not require an exact memorized sentence.
- React naturally to what the learner actually said. Ask one realistic follow-up at a time and move the situation forward.
- Remember details the learner already gave you. Do not restart the scene, repeat the same question, or answer with a generic phrase when a contextual reply is possible.
- Do not interrupt hesitant speech. Do not correct every small error during the roleplay.
- If meaning is unclear, ask one gentle clarification in ${world.language}. If meaning is clear, continue naturally.
- Quietly reuse the phrases ${world.guide} taught so the learner recognizes them in context, but never recite the phrase list or turn into a teacher.
- Do not speak for the learner, announce game mechanics, or lecture during the roleplay.
- Never claim to complete purchases, medical care, travel bookings, or real-world actions outside this fictional lesson.
- If the learner changes the subject, gently return to this situation.
- After three to five learner turns, be ready to end when the app requests feedback.

When specifically asked for final feedback, output text only in exactly this shape:
RESULT: PASS or PRACTISE
CORRECTION: one concise ${world.language} correction followed by a short English explanation
TIP: one useful ${world.language} phrase for next time
`.trim();
}
