import * as THREE from 'three';
import { DISTRICT_DEFINITIONS, JAPAN_DISTRICT_DEFINITIONS, MEXICO_DISTRICT_DEFINITIONS } from './grand-world-systems.js';
import { GuideNarration } from './guide-narration.js';
import { RealtimePractice } from './realtime-practice.js';

const FIRST_LESSON_WALK_DISTANCE = 4;

export const HINDI_LESSONS = [
  {
    id: 'greeting',
    title: 'Greet someone politely',
    destination: 'Ravi near Nimbu Junction',
    targetName: 'INTERACT_LOCAL_FRIEND',
    action: 'practice_greeting',
    role: 'Ravi · a local resident',
    context: 'You have just arrived at Nimbu Junction. Ravi greets new visitors near the station and may ask your name and how you are feeling after the journey.',
    guide: 'Begin warmly with “namaste”. Use “aap” for a polite “you”, introduce yourself with “mera naam… hai”, and listen for Ravi asking your name.',
    phraseHi: 'नमस्ते! आप कैसे हैं?',
    phraseEn: 'Hello! How are you?',
    teachingPhrases: [
      { hi: 'नमस्ते!', en: 'Hello!' },
      { hi: 'मेरा नाम ___ है।', en: 'My name is ___.' },
      { hi: 'आप कैसे हैं?', en: 'How are you?' },
    ],
    npcHi: 'नमस्ते! आप कैसे हैं?',
    npcEn: 'Hello! How are you?',
    choices: [
      { hi: 'नमस्ते! मैं ठीक हूँ। आप कैसे हैं?', en: 'Hello! I’m well. How are you?', correct: true },
      { hi: 'मुझे दो नींबू चाहिए।', en: 'I would like two lemons.' },
      { hi: 'रेलवे स्टेशन कहाँ है?', en: 'Where is the railway station?' },
    ],
    replyHi: 'मैं भी ठीक हूँ। आपसे मिलकर खुशी हुई!',
    replyEn: 'I’m well too. It’s nice to meet you!',
  },
  {
    id: 'food',
    title: 'Order food at a café',
    destination: 'the chai vendor in Namaste Bazaar',
    targetName: 'INTERACT_CHAI_VENDOR',
    action: 'practice_food',
    role: 'Meera · chai and snacks',
    context: 'It is a busy morning at Meera’s roadside café in Namaste Bazaar. You want one tea and two samosas, then need to understand the total price.',
    guide: 'Use “mujhe … chahiye” for what you would like. Add “kripaya” for extra politeness, and listen for Meera confirming the quantity or price.',
    phraseHi: 'मुझे एक चाय और दो समोसे चाहिए।',
    phraseEn: 'I would like one tea and two samosas.',
    teachingPhrases: [
      { hi: 'मुझे एक चाय चाहिए।', en: 'I would like one tea.' },
      { hi: 'दो समोसे भी, कृपया।', en: 'Two samosas too, please.' },
      { hi: 'यह कितने का है?', en: 'How much is this?' },
    ],
    npcHi: 'नमस्ते! आप क्या लेंगे?',
    npcEn: 'Hello! What would you like?',
    choices: [
      { hi: 'मुझे एक चाय और दो समोसे चाहिए।', en: 'I would like one tea and two samosas.', correct: true },
      { hi: 'मुझे सिरदर्द है।', en: 'I have a headache.' },
      { hi: 'आप कहाँ जा रहे हैं?', en: 'Where are you going?' },
    ],
    replyHi: 'ज़रूर! आपकी चाय और समोसे अभी आते हैं।',
    replyEn: 'Certainly! Your tea and samosas will be ready shortly.',
  },
  {
    id: 'shop',
    title: 'Buy something at a shop',
    destination: 'the fruit seller in Namaste Bazaar',
    targetName: 'INTERACT_FRUIT_VENDOR',
    action: 'practice_shop',
    role: 'Arjun · fruit seller',
    context: 'You are shopping at Arjun’s fruit stall. Ask for exactly two lemons, check the price, and try one friendly bargaining phrase if the price feels high.',
    guide: 'Say the quantity before the item. Ask “ye kitne ke hain?” for the price; “thoda kam kijiye” is a polite request, not an aggressive demand.',
    phraseHi: 'मुझे दो नींबू चाहिए। ये कितने के हैं?',
    phraseEn: 'I would like two lemons. How much are these?',
    teachingPhrases: [
      { hi: 'मुझे दो नींबू चाहिए।', en: 'I would like two lemons.' },
      { hi: 'ये कितने के हैं?', en: 'How much are these?' },
      { hi: 'थोड़ा कम कीजिए।', en: 'Please lower the price a little.' },
    ],
    npcHi: 'नमस्ते! आपको क्या चाहिए?',
    npcEn: 'Hello! What do you need?',
    choices: [
      { hi: 'मुझे दो नींबू चाहिए। ये कितने के हैं?', en: 'I would like two lemons. How much are these?', correct: true },
      { hi: 'मुझे एक टिकट चाहिए।', en: 'I would like one ticket.' },
      { hi: 'मैं ठीक हूँ।', en: 'I am well.' },
    ],
    replyHi: 'दो नींबू दस रुपये के हैं।',
    replyEn: 'Two lemons cost ten rupees.',
  },
  {
    id: 'pharmacy',
    title: 'Explain a problem at a pharmacy',
    destination: 'the Hariyali pharmacy',
    targetName: 'INTERACT_PHARMACIST',
    action: 'practice_pharmacy',
    role: 'Dr. Neha · pharmacist',
    context: 'After walking in the afternoon sun, you have a headache and enter Hariyali Pharmacy. Explain the problem and ask when the fictional medicine should be taken.',
    guide: 'Use “mujhe … hai” to describe the symptom, then ask for medicine. Listen for simple timing words such as “khane ke baad” — after food.',
    phraseHi: 'मुझे सिरदर्द है। क्या आपके पास दवा है?',
    phraseEn: 'I have a headache. Do you have medicine?',
    teachingPhrases: [
      { hi: 'मुझे सिरदर्द है।', en: 'I have a headache.' },
      { hi: 'क्या आपके पास दवा है?', en: 'Do you have medicine?' },
      { hi: 'इसे कब लेना है?', en: 'When should I take it?' },
    ],
    npcHi: 'नमस्ते, आपको क्या परेशानी है?',
    npcEn: 'Hello, what is troubling you?',
    choices: [
      { hi: 'मुझे सिरदर्द है। क्या आपके पास दवा है?', en: 'I have a headache. Do you have medicine?', correct: true },
      { hi: 'मुझे दो समोसे चाहिए।', en: 'I would like two samosas.' },
      { hi: 'किला कहाँ है?', en: 'Where is the fort?' },
    ],
    replyHi: 'हाँ। यह दवा खाने के बाद लीजिए।',
    replyEn: 'Yes. Take this medicine after eating.',
  },
  {
    id: 'directions',
    title: 'Ask someone for directions',
    destination: 'the local beside Jheel Mandir',
    targetName: 'INTERACT_DIRECTIONS_LOCAL',
    action: 'practice_directions',
    role: 'Kavita · a helpful local',
    context: 'You are near Jheel Mandir but need to return to the railway station. Kavita knows the area and will give short directions using turns and landmarks.',
    guide: 'Begin with “maaf kijiye” to get attention politely, name the place you need, and ask whether it is far. Listen for “seedhe” and “baayen”.',
    phraseHi: 'माफ़ कीजिए, रेलवे स्टेशन कहाँ है?',
    phraseEn: 'Excuse me, where is the railway station?',
    teachingPhrases: [
      { hi: 'माफ़ कीजिए।', en: 'Excuse me.' },
      { hi: 'रेलवे स्टेशन कहाँ है?', en: 'Where is the railway station?' },
      { hi: 'क्या यह दूर है?', en: 'Is it far?' },
    ],
    npcHi: 'नमस्ते, क्या मैं आपकी मदद करूँ?',
    npcEn: 'Hello, may I help you?',
    choices: [
      { hi: 'माफ़ कीजिए, रेलवे स्टेशन कहाँ है?', en: 'Excuse me, where is the railway station?', correct: true },
      { hi: 'मुझे दवा चाहिए।', en: 'I need medicine.' },
      { hi: 'ये कितने के हैं?', en: 'How much are these?' },
    ],
    replyHi: 'सीधे जाइए, फिर बाएँ मुड़िए। स्टेशन सामने है।',
    replyEn: 'Go straight, then turn left. The station is ahead.',
  },
  {
    id: 'train',
    title: 'Buy a train ticket',
    destination: 'the ticket clerk at Nimbu Junction',
    targetName: 'INTERACT_TICKET_CLERK',
    action: 'practice_train',
    role: 'Sanjay · ticket clerk',
    context: 'At Nimbu Junction’s ticket window, you need one ticket to Pahadi Rail. Sanjay may confirm the destination, platform, and departure time.',
    guide: 'Name the destination, say how many tickets you need, and finish with “dijiye”. Listen carefully for the platform number and time.',
    phraseHi: 'पहाड़ी रेल का एक टिकट दीजिए।',
    phraseEn: 'Please give me one ticket to Pahadi Rail.',
    teachingPhrases: [
      { hi: 'एक टिकट दीजिए।', en: 'Please give me one ticket.' },
      { hi: 'ट्रेन कितने बजे आएगी?', en: 'What time will the train arrive?' },
      { hi: 'प्लेटफ़ॉर्म कौन सा है?', en: 'Which platform is it?' },
    ],
    npcHi: 'आप कहाँ जाना चाहते हैं?',
    npcEn: 'Where would you like to go?',
    choices: [
      { hi: 'पहाड़ी रेल का एक टिकट दीजिए।', en: 'Please give me one ticket to Pahadi Rail.', correct: true },
      { hi: 'मुझे एक चाय चाहिए।', en: 'I would like one tea.' },
      { hi: 'मुझे सिरदर्द है।', en: 'I have a headache.' },
    ],
    replyHi: 'ज़रूर। आपकी ट्रेन प्लेटफ़ॉर्म दो से जाएगी।',
    replyEn: 'Certainly. Your train will leave from platform two.',
  },
  {
    id: 'ride_scooter', kind: 'experience', title: 'Take a scooter',
    destination: 'a nearby free scooter', targetType: 'scooter', targetLabel: 'Free scooter',
    objective: 'Take a free scooter', completionEvent: 'vehicle_boarded', completionPayload: { vehicleType: 'scooter' },
    context: 'The next district is far enough that walking would be slow. Find a parked public scooter and use it to learn the main road.',
    guide: 'Follow the waypoint to a parked scooter and press E beside it. Scooters are free, and you can park again with E.',
    phraseHi: 'स्कूटर चलाएँ', phraseEn: 'Ride the scooter',
  },
  {
    id: 'read_sign', kind: 'experience', title: 'Read a Hindi sign',
    destination: 'the Nimbu Junction sign', targetName: 'SIGN_CITY_0_NIMBU_JUNCTION', targetLabel: 'Hindi sign',
    objective: 'Read the Nimbu Junction sign', completionInteraction: 'translate_sign',
    context: 'Street and station signs are useful anchors when you are new to a city. Find the marked Hindi sign and compare both scripts.',
    guide: 'Park beside the marked sign and press E to read it. Notice the Hindi script first, then compare the English meaning.',
    phraseHi: 'निंबू जंक्शन', phraseEn: 'Nimbu Junction',
  },
  {
    id: 'board_transit', kind: 'experience', title: 'Board the train',
    destination: 'the Pahadi Express', targetType: 'transit', targetLabel: 'Pahadi Express',
    objective: 'Board the Pahadi Express', completionEvent: 'transit_boarded', completionPayload: { transitType: 'train' },
    context: 'The Pahadi Express connects the distant districts. Wait safely beside a station and board only when the train has slowed beside you.',
    guide: 'Wait near the moving train, approach it when it slows at a platform, and press E to board.',
    phraseHi: 'ट्रेन में चढ़ें', phraseEn: 'Board the train',
  },
  {
    id: 'reach_far_district', kind: 'experience', title: 'Reach the mountain district',
    destination: 'Pahadi Rail', targetName: 'SIGN_CITY_5_PAHADI_RAIL', targetLabel: 'Pahadi Rail', districtName: 'Pahadi Rail',
    objective: 'Reach Pahadi Rail', completionZone: 'Pahadi Rail',
    context: 'Your final journey crosses the map to the mountain district. Stay on the train long enough to recognise the changing landscape and station signs.',
    guide: 'Stay aboard for the long journey, or continue overland after disembarking. The mission completes when you enter Pahadi Rail.',
    phraseHi: 'पहाड़ी रेल चलें', phraseEn: 'Let’s go to Pahadi Rail',
  },
];

export const JAPANESE_LESSONS = [
  {
    id: 'greeting', title: 'Greet someone politely', destination: 'Haru near Sakura Gate',
    targetName: 'INTERACT_LOCAL_FRIEND', action: 'practice_greeting', role: 'Haru · a local resident',
    context: 'You have just arrived at Sakura Gate. Haru welcomes new visitors and may ask your name before helping you find your way.',
    guide: '“Konnichiwa” is a safe daytime greeting. Add “hajimemashite” when meeting someone for the first time.',
    phraseHi: 'こんにちは。はじめまして。', phraseRomaji: 'Konnichiwa. Hajimemashite.', phraseEn: 'Hello. Nice to meet you.',
    teachingPhrases: [
      { hi: 'こんにちは。', romaji: 'Konnichiwa.', en: 'Hello.' },
      { hi: 'はじめまして。', romaji: 'Hajimemashite.', en: 'Nice to meet you.' },
      { hi: 'わたしは ___ です。', romaji: 'Watashi wa ___ desu.', en: 'I am ___.' },
    ],
    npcHi: 'こんにちは。はじめまして。', npcRomaji: 'Konnichiwa. Hajimemashite.', npcEn: 'Hello. Nice to meet you.',
    choices: [
      { hi: 'こんにちは。はじめまして。', romaji: 'Konnichiwa. Hajimemashite.', en: 'Hello. Nice to meet you.', correct: true },
      { hi: 'これをください。', romaji: 'Kore o kudasai.', en: 'This one, please.' },
      { hi: '駅はどこですか？', romaji: 'Eki wa doko desu ka?', en: 'Where is the station?' },
    ],
    replyHi: 'こちらこそ、よろしくお願いします。', replyRomaji: 'Kochira koso, yoroshiku onegaishimasu.', replyEn: 'Likewise, it is nice to meet you.',
  },
  {
    id: 'shop', title: 'Buy something at a convenience store', destination: 'Kenji on Konbini Street',
    targetName: 'INTERACT_FRUIT_VENDOR', action: 'practice_shop', role: 'Kenji · convenience-store clerk',
    context: 'At Kenji’s convenience store, you want one item and do not need a bag. Listen for the checkout question and the price in yen.',
    guide: 'Point to an item and say “kore o kudasai”. At checkout, “fukuro wa irimasen” means you do not need a bag.',
    phraseHi: 'これをください。袋は要りません。', phraseRomaji: 'Kore o kudasai. Fukuro wa irimasen.', phraseEn: 'This one, please. I do not need a bag.',
    teachingPhrases: [
      { hi: 'これをください。', romaji: 'Kore o kudasai.', en: 'This one, please.' },
      { hi: '袋は要りません。', romaji: 'Fukuro wa irimasen.', en: 'I do not need a bag.' },
      { hi: 'いくらですか？', romaji: 'Ikura desu ka?', en: 'How much is it?' },
    ],
    npcHi: 'いらっしゃいませ。袋はご利用ですか？', npcRomaji: 'Irasshaimase. Fukuro wa goriyō desu ka?', npcEn: 'Welcome. Would you like a bag?',
    choices: [
      { hi: 'これをください。袋は要りません。', romaji: 'Kore o kudasai. Fukuro wa irimasen.', en: 'This one, please. I do not need a bag.', correct: true },
      { hi: '頭が痛いです。', romaji: 'Atama ga itai desu.', en: 'I have a headache.' },
      { hi: 'ラーメンをお願いします。', romaji: 'Rāmen o onegaishimasu.', en: 'Ramen, please.' },
    ],
    replyHi: 'かしこまりました。三百円です。', replyRomaji: 'Kashikomarimashita. Sanbyaku-en desu.', replyEn: 'Certainly. That is 300 yen.',
  },
  {
    id: 'food', title: 'Order ramen at a restaurant', destination: 'Aiko in the ramen alley',
    targetName: 'INTERACT_CHAI_VENDOR', action: 'practice_food', role: 'Aiko · ramen-shop owner',
    context: 'You sit at Aiko’s ramen counter and want one bowl of ramen plus water. She may repeat the order before preparing it.',
    guide: 'Use the counter “hitotsu” for one item and finish with “onegaishimasu” for a natural, polite order.',
    phraseHi: 'ラーメンを一つお願いします。', phraseRomaji: 'Rāmen o hitotsu onegaishimasu.', phraseEn: 'One ramen, please.',
    teachingPhrases: [
      { hi: 'ラーメンを一つお願いします。', romaji: 'Rāmen o hitotsu onegaishimasu.', en: 'One ramen, please.' },
      { hi: '水もお願いします。', romaji: 'Mizu mo onegaishimasu.', en: 'Water too, please.' },
      { hi: 'いくらですか？', romaji: 'Ikura desu ka?', en: 'How much is it?' },
    ],
    npcHi: 'いらっしゃいませ。ご注文は？', npcRomaji: 'Irasshaimase. Gochūmon wa?', npcEn: 'Welcome. What would you like to order?',
    choices: [
      { hi: 'ラーメンを一つお願いします。', romaji: 'Rāmen o hitotsu onegaishimasu.', en: 'One ramen, please.', correct: true },
      { hi: '切符を一枚ください。', romaji: 'Kippu o ichimai kudasai.', en: 'One ticket, please.' },
      { hi: '袋は要りません。', romaji: 'Fukuro wa irimasen.', en: 'I do not need a bag.' },
    ],
    replyHi: 'はい、少々お待ちください。', replyRomaji: 'Hai, shōshō omachi kudasai.', replyEn: 'Certainly. Please wait a moment.',
  },
  {
    id: 'directions', title: 'Ask someone for directions', destination: 'Yui beside Kawa Market',
    targetName: 'INTERACT_DIRECTIONS_LOCAL', action: 'practice_directions', role: 'Yui · a helpful local',
    context: 'You are beside Kawa Market and need the subway station. Yui will answer using simple turns and nearby landmarks.',
    guide: 'Begin with “sumimasen” to politely get someone’s attention, then ask where the subway station is.',
    phraseHi: 'すみません、地下鉄の駅はどこですか？', phraseRomaji: 'Sumimasen, chikatetsu no eki wa doko desu ka?', phraseEn: 'Excuse me, where is the subway station?',
    teachingPhrases: [
      { hi: 'すみません。', romaji: 'Sumimasen.', en: 'Excuse me.' },
      { hi: '地下鉄の駅はどこですか？', romaji: 'Chikatetsu no eki wa doko desu ka?', en: 'Where is the subway station?' },
      { hi: '遠いですか？', romaji: 'Tōi desu ka?', en: 'Is it far?' },
    ],
    npcHi: 'どうしましたか？', npcRomaji: 'Dō shimashita ka?', npcEn: 'How can I help?',
    choices: [
      { hi: 'すみません、地下鉄の駅はどこですか？', romaji: 'Sumimasen, chikatetsu no eki wa doko desu ka?', en: 'Excuse me, where is the subway station?', correct: true },
      { hi: 'これをください。', romaji: 'Kore o kudasai.', en: 'This one, please.' },
      { hi: '薬はありますか？', romaji: 'Kusuri wa arimasu ka?', en: 'Do you have medicine?' },
    ],
    replyHi: 'まっすぐ行って、右に曲がってください。', replyRomaji: 'Massugu itte, migi ni magatte kudasai.', replyEn: 'Go straight and turn right.',
  },
  {
    id: 'train', title: 'Buy a subway ticket', destination: 'Sota at Sakura Gate Station',
    targetName: 'INTERACT_TICKET_CLERK', action: 'practice_train', role: 'Sota · subway attendant',
    context: 'At Sakura Gate Station, you need one ticket to Yama Onsen. Sota may tell you the platform and departure time.',
    guide: 'Say the destination, then “made no kippu” for a ticket to that place. “Ichimai” means one flat item such as a ticket.',
    phraseHi: '山温泉までの切符を一枚ください。', phraseRomaji: 'Yama Onsen made no kippu o ichimai kudasai.', phraseEn: 'One ticket to Yama Onsen, please.',
    teachingPhrases: [
      { hi: '切符を一枚ください。', romaji: 'Kippu o ichimai kudasai.', en: 'One ticket, please.' },
      { hi: '何番線ですか？', romaji: 'Nanban-sen desu ka?', en: 'Which platform is it?' },
      { hi: '何時に出ますか？', romaji: 'Nanji ni demasu ka?', en: 'What time does it leave?' },
    ],
    npcHi: 'どちらまでですか？', npcRomaji: 'Dochira made desu ka?', npcEn: 'Where are you travelling to?',
    choices: [
      { hi: '山温泉までの切符を一枚ください。', romaji: 'Yama Onsen made no kippu o ichimai kudasai.', en: 'One ticket to Yama Onsen, please.', correct: true },
      { hi: 'ラーメンを一つください。', romaji: 'Rāmen o hitotsu kudasai.', en: 'One ramen, please.' },
      { hi: 'はじめまして。', romaji: 'Hajimemashite.', en: 'Nice to meet you.' },
    ],
    replyHi: 'はい、二番線から出発します。', replyRomaji: 'Hai, niban-sen kara shuppatsu shimasu.', replyEn: 'Certainly. It departs from platform two.',
  },
  {
    id: 'pharmacy', title: 'Explain a problem at a pharmacy', destination: 'Emi at the Midori pharmacy',
    targetName: 'INTERACT_PHARMACIST', action: 'practice_pharmacy', role: 'Emi · pharmacist',
    context: 'You enter Emi’s pharmacy with a headache. Explain the symptom, ask for medicine, and listen for when to take it.',
    guide: 'Use “itai desu” to describe pain, then “kusuri wa arimasu ka” to ask whether medicine is available.',
    phraseHi: '頭が痛いです。薬はありますか？', phraseRomaji: 'Atama ga itai desu. Kusuri wa arimasu ka?', phraseEn: 'I have a headache. Do you have medicine?',
    teachingPhrases: [
      { hi: '頭が痛いです。', romaji: 'Atama ga itai desu.', en: 'I have a headache.' },
      { hi: '薬はありますか？', romaji: 'Kusuri wa arimasu ka?', en: 'Do you have medicine?' },
      { hi: 'いつ飲みますか？', romaji: 'Itsu nomimasu ka?', en: 'When should I take it?' },
    ],
    npcHi: 'どうされましたか？', npcRomaji: 'Dō saremashita ka?', npcEn: 'What seems to be the problem?',
    choices: [
      { hi: '頭が痛いです。薬はありますか？', romaji: 'Atama ga itai desu. Kusuri wa arimasu ka?', en: 'I have a headache. Do you have medicine?', correct: true },
      { hi: '駅はどこですか？', romaji: 'Eki wa doko desu ka?', en: 'Where is the station?' },
      { hi: '袋は要りません。', romaji: 'Fukuro wa irimasen.', en: 'I do not need a bag.' },
    ],
    replyHi: 'はい。この薬を食後に飲んでください。', replyRomaji: 'Hai. Kono kusuri o shokugo ni nonde kudasai.', replyEn: 'Yes. Please take this medicine after eating.',
  },
  {
    id: 'ride_bicycle', kind: 'experience', title: 'Take a bicycle',
    destination: 'a nearby free bicycle', targetType: 'bicycle', targetLabel: 'Free bicycle',
    objective: 'Take a free bicycle', completionEvent: 'vehicle_boarded', completionPayload: { vehicleType: 'bicycle' },
    guide: 'Follow the waypoint to a parked bicycle and press E beside it. Pedal with W or S, steer with A or D, and press E to park.',
    phraseHi: '自転車に乗る', phraseRomaji: 'Jitensha ni noru', phraseEn: 'Ride the bicycle',
  },
  {
    id: 'read_sign', kind: 'experience', title: 'Read a Japanese sign',
    destination: 'the Midori Village sign', targetName: 'SIGN_CITY_3_MIDORI_VILLAGE', targetLabel: 'Japanese sign',
    objective: 'Read the Midori Village sign', completionInteraction: 'translate_sign',
    guide: 'Park beside the marked sign and press E to read it. Compare the Japanese place name, its reading, and the English meaning.',
    phraseHi: 'みどり村', phraseRomaji: 'Midori-mura', phraseEn: 'Midori Village',
  },
  {
    id: 'board_transit', kind: 'experience', title: 'Board the subway',
    destination: 'the Aozora Subway', targetType: 'transit', targetLabel: 'Aozora Subway',
    objective: 'Board the Aozora Subway', completionEvent: 'transit_boarded', completionPayload: { transitType: 'subway' },
    guide: 'Wait near the subway line, approach the train when it slows at a platform, and press E to board.',
    phraseHi: '地下鉄に乗る', phraseRomaji: 'Chikatetsu ni noru', phraseEn: 'Board the subway',
  },
  {
    id: 'reach_far_district', kind: 'experience', title: 'Reach the mountain district',
    destination: 'Yama Onsen', targetName: 'SIGN_CITY_5_YAMA_ONSEN', targetLabel: 'Yama Onsen', districtName: 'Yama Onsen',
    objective: 'Reach Yama Onsen', completionZone: 'Yama Onsen',
    guide: 'Stay aboard for the long journey, or continue overland after disembarking. The mission completes when you enter Yama Onsen.',
    phraseHi: '山温泉へ行きましょう', phraseRomaji: 'Yama Onsen e ikimashō', phraseEn: 'Let’s go to Yama Onsen',
  },
];

export const SPANISH_LESSONS = [
  {
    id: 'greeting', title: 'Greet someone politely', destination: 'Lucía near Plaza Naranja',
    targetName: 'INTERACT_LOCAL_FRIEND', action: 'practice_greeting', role: 'Lucía · a local resident',
    context: 'You have just reached Plaza Naranja. Lucía welcomes visitors and may ask your name and how your journey went.',
    guide: '“Hola” works throughout the day. Add “mucho gusto” when meeting someone for the first time.',
    phraseHi: '¡Hola! Mucho gusto. ¿Cómo está?', phraseEn: 'Hello! Nice to meet you. How are you?',
    teachingPhrases: [
      { hi: '¡Hola!', en: 'Hello!' },
      { hi: 'Me llamo ___.', en: 'My name is ___.' },
      { hi: '¿Cómo está?', en: 'How are you?' },
    ],
    npcHi: '¡Hola! Mucho gusto.', npcEn: 'Hello! Nice to meet you.',
    choices: [
      { hi: '¡Hola! Mucho gusto. Estoy muy bien.', en: 'Hello! Nice to meet you. I am very well.', correct: true },
      { hi: 'Quisiera dos tacos, por favor.', en: 'I would like two tacos, please.' },
      { hi: '¿Dónde está el metro?', en: 'Where is the metro?' },
    ],
    replyHi: '¡Igualmente! Bienvenido a Valle Naranja.', replyEn: 'Likewise! Welcome to Valle Naranja.',
  },
  {
    id: 'food', title: 'Order food at a taquería', destination: 'Mateo in Mercado del Sol',
    targetName: 'INTERACT_CHAI_VENDOR', action: 'practice_food', role: 'Mateo · taquería owner',
    context: 'At Mateo’s taquería, you want two tacos and water. He may ask one simple filling question before giving the price.',
    guide: 'Use “quisiera” for a polite order and finish with “por favor”.',
    phraseHi: 'Quisiera dos tacos y un agua, por favor.', phraseEn: 'I would like two tacos and a water, please.',
    teachingPhrases: [
      { hi: 'Quisiera dos tacos.', en: 'I would like two tacos.' },
      { hi: 'Un agua, por favor.', en: 'A water, please.' },
      { hi: '¿Cuánto es?', en: 'How much is it?' },
    ],
    npcHi: 'Buenas tardes. ¿Qué va a ordenar?', npcEn: 'Good afternoon. What would you like to order?',
    choices: [
      { hi: 'Quisiera dos tacos y un agua, por favor.', en: 'I would like two tacos and a water, please.', correct: true },
      { hi: 'Me duele la cabeza.', en: 'My head hurts.' },
      { hi: 'Necesito un boleto.', en: 'I need a ticket.' },
    ],
    replyHi: 'Claro. Enseguida se los preparo.', replyEn: 'Of course. I will prepare them right away.',
  },
  {
    id: 'shop', title: 'Buy fruit at the market', destination: 'Sofía in Mercado del Sol',
    targetName: 'INTERACT_FRUIT_VENDOR', action: 'practice_shop', role: 'Sofía · market seller',
    context: 'You are shopping at Sofía’s market stall. Ask for two oranges, check their price, and complete the exchange politely.',
    guide: 'Name the amount and item, then use “¿cuánto cuestan?” to ask the price of several things.',
    phraseHi: 'Quiero dos naranjas. ¿Cuánto cuestan?', phraseEn: 'I want two oranges. How much do they cost?',
    teachingPhrases: [
      { hi: 'Quiero dos naranjas.', en: 'I want two oranges.' },
      { hi: '¿Cuánto cuestan?', en: 'How much do they cost?' },
      { hi: 'Aquí tiene.', en: 'Here you are.' },
    ],
    npcHi: 'Buenos días. ¿Qué busca?', npcEn: 'Good morning. What are you looking for?',
    choices: [
      { hi: 'Quiero dos naranjas. ¿Cuánto cuestan?', en: 'I want two oranges. How much do they cost?', correct: true },
      { hi: '¿Dónde está la farmacia?', en: 'Where is the pharmacy?' },
      { hi: 'Mucho gusto.', en: 'Nice to meet you.' },
    ],
    replyHi: 'Cuestan veinte pesos. Aquí tiene.', replyEn: 'They cost twenty pesos. Here you are.',
  },
  {
    id: 'directions', title: 'Ask for directions', destination: 'Diego beside Canal de Flores',
    targetName: 'INTERACT_DIRECTIONS_LOCAL', action: 'practice_directions', role: 'Diego · a helpful local',
    context: 'You are beside Canal de Flores and need the metro. Diego knows the neighborhood and will describe the route using turns and landmarks.',
    guide: 'Begin with “disculpe” to get someone’s attention politely, then ask “¿dónde está…?”.',
    phraseHi: 'Disculpe, ¿dónde está la estación de metro?', phraseEn: 'Excuse me, where is the metro station?',
    teachingPhrases: [
      { hi: 'Disculpe.', en: 'Excuse me.' },
      { hi: '¿Dónde está la estación de metro?', en: 'Where is the metro station?' },
      { hi: '¿Está lejos?', en: 'Is it far?' },
    ],
    npcHi: 'Claro, ¿adónde quiere ir?', npcEn: 'Of course. Where would you like to go?',
    choices: [
      { hi: 'Disculpe, ¿dónde está la estación de metro?', en: 'Excuse me, where is the metro station?', correct: true },
      { hi: 'Quisiera dos tacos.', en: 'I would like two tacos.' },
      { hi: '¿Cuánto cuestan?', en: 'How much do they cost?' },
    ],
    replyHi: 'Siga derecho y gire a la izquierda.', replyEn: 'Continue straight and turn left.',
  },
  {
    id: 'train', title: 'Buy a metro ticket', destination: 'Elena at Plaza Naranja Metro',
    targetName: 'INTERACT_TICKET_CLERK', action: 'practice_train', role: 'Elena · metro attendant',
    context: 'At Plaza Naranja Metro, you need one ticket to Mirador Cobre. Elena may confirm the destination, platform, and time.',
    guide: 'Ask for “un boleto para” followed by the destination, and end with “por favor”.',
    phraseHi: 'Un boleto para Mirador Cobre, por favor.', phraseEn: 'One ticket to Mirador Cobre, please.',
    teachingPhrases: [
      { hi: 'Un boleto, por favor.', en: 'One ticket, please.' },
      { hi: '¿De qué andén sale?', en: 'Which platform does it leave from?' },
      { hi: '¿A qué hora sale?', en: 'What time does it leave?' },
    ],
    npcHi: '¿A qué estación viaja?', npcEn: 'Which station are you travelling to?',
    choices: [
      { hi: 'Un boleto para Mirador Cobre, por favor.', en: 'One ticket to Mirador Cobre, please.', correct: true },
      { hi: 'Quiero dos naranjas.', en: 'I want two oranges.' },
      { hi: 'Me duele la cabeza.', en: 'My head hurts.' },
    ],
    replyHi: 'Claro. Sale del andén dos.', replyEn: 'Of course. It leaves from platform two.',
  },
  {
    id: 'pharmacy', title: 'Explain a problem at a pharmacy', destination: 'Ana in Barrio Azul',
    targetName: 'INTERACT_PHARMACIST', action: 'practice_pharmacy', role: 'Ana · pharmacist',
    context: 'You enter Ana’s pharmacy with a headache. Explain the pain, ask for something suitable, and understand when to take it.',
    guide: 'Use “me duele” for pain, then ask “¿tiene algo para…?” when you need medicine.',
    phraseHi: 'Me duele la cabeza. ¿Tiene algo para el dolor?', phraseEn: 'My head hurts. Do you have something for the pain?',
    teachingPhrases: [
      { hi: 'Me duele la cabeza.', en: 'My head hurts.' },
      { hi: '¿Tiene algo para el dolor?', en: 'Do you have something for the pain?' },
      { hi: '¿Cuándo lo tomo?', en: 'When should I take it?' },
    ],
    npcHi: 'Buenas tardes. ¿Qué le pasa?', npcEn: 'Good afternoon. What is the matter?',
    choices: [
      { hi: 'Me duele la cabeza. ¿Tiene algo para el dolor?', en: 'My head hurts. Do you have something for the pain?', correct: true },
      { hi: 'Un boleto, por favor.', en: 'One ticket, please.' },
      { hi: '¿Cuánto cuestan las naranjas?', en: 'How much do the oranges cost?' },
    ],
    replyHi: 'Sí. Tome esta medicina después de comer.', replyEn: 'Yes. Take this medicine after eating.',
  },
  {
    id: 'ride_bicycle', kind: 'experience', title: 'Take a bicycle',
    destination: 'a nearby free bicycle', targetType: 'bicycle', targetLabel: 'Free bicycle',
    objective: 'Take a free bicycle', completionEvent: 'vehicle_boarded', completionPayload: { vehicleType: 'bicycle' },
    guide: 'Follow the waypoint to a parked bicycle and press E beside it. Pedal with W or S, steer with A or D, and press E to park.',
    phraseHi: 'Montar en bicicleta', phraseEn: 'Ride the bicycle',
  },
  {
    id: 'read_sign', kind: 'experience', title: 'Read a Spanish sign',
    destination: 'the Barrio Azul sign', targetName: 'SIGN_CITY_3_BARRIO_AZUL', targetLabel: 'Spanish sign',
    objective: 'Read the Barrio Azul sign', completionInteraction: 'translate_sign',
    guide: 'Park beside the marked sign and press E to read it. Say the Spanish place name, then check its English meaning.',
    phraseHi: 'Barrio Azul', phraseEn: 'Blue Neighbourhood',
  },
  {
    id: 'board_transit', kind: 'experience', title: 'Board the metro',
    destination: 'Metro Naranja', targetType: 'transit', targetLabel: 'Metro Naranja',
    objective: 'Board Metro Naranja', completionEvent: 'transit_boarded', completionPayload: { transitType: 'metro' },
    guide: 'Wait near the metro line, approach the train when it slows at a platform, and press E to board.',
    phraseHi: 'Subir al metro', phraseEn: 'Board the metro',
  },
  {
    id: 'reach_far_district', kind: 'experience', title: 'Reach the mountain district',
    destination: 'Mirador Cobre', targetName: 'SIGN_CITY_5_MIRADOR_COBRE', targetLabel: 'Mirador Cobre', districtName: 'Mirador Cobre',
    objective: 'Reach Mirador Cobre', completionZone: 'Mirador Cobre',
    guide: 'Stay aboard for the long journey, or continue overland after disembarking. The mission completes when you enter Mirador Cobre.',
    phraseHi: 'Vamos a Mirador Cobre', phraseEn: 'Let’s go to Mirador Cobre',
  },
];

export const GUIDE_CONFIGS = {
  hindi: {
    id: 'hindi', language: 'Hindi', guideName: 'Asha', guideMark: 'आ', nativeLabel: 'Hindi phrase',
    guidePortrait: '/assets/guides/asha.png',
    lessons: HINDI_LESSONS, districts: DISTRICT_DEFINITIONS, saveKey: 'sayscape-guide-progress-hindi-v2',
    worldName: 'Nimbu Pradesh', openRoad: 'Open Road', transitName: 'train', mapTransitLabel: 'Railway',
    completeNative: 'बहुत बढ़िया! फिर मिलेंगे।', completeEnglish: 'Excellent! See you again.',
  },
  japanese: {
    id: 'japanese', language: 'Japanese', guideName: 'Yuki', guideMark: 'ゆ', nativeLabel: 'Japanese phrase',
    guidePortrait: '/assets/guides/yuki.png',
    lessons: JAPANESE_LESSONS, districts: JAPAN_DISTRICT_DEFINITIONS, saveKey: 'sayscape-guide-progress-japanese-v2',
    worldName: 'Aozora Japan', openRoad: 'Open Route', transitName: 'subway', mapTransitLabel: 'Subway',
    completeNative: 'よくできました。また会いましょう。', completeEnglish: 'Well done. See you again.',
  },
  spanish: {
    id: 'spanish', language: 'Spanish', guideName: 'Lola', guideMark: 'ñ', nativeLabel: 'Spanish phrase',
    guidePortrait: '/assets/guides/lola.png',
    lessons: SPANISH_LESSONS, districts: MEXICO_DISTRICT_DEFINITIONS, saveKey: 'sayscape-guide-progress-spanish-v2',
    worldName: 'Valle Naranja', openRoad: 'Camino Abierto', transitName: 'metro', mapTransitLabel: 'Metro',
    completeNative: '¡Excelente! Nos vemos pronto.', completeEnglish: 'Excellent! See you soon.',
  },
};

// These are the same control points used by the Blender grand-world builders.
// Keeping the cartography on the authored controls makes the full map and local
// minimap match every visible road instead of relying on decorative placeholder art.
const AUTHORED_ROAD_PATHS = [
  { main: true, points: [
    [-281, -105], [-252, -82], [-216, -66], [-180, -48], [-145, -31], [-104, -4],
    [-57, 20], [-8, 15], [38, -2], [82, -34], [124, -17], [163, 19],
    [190, 54], [222, 79], [258, 105], [286, 126],
  ] },
  { points: [[-180, -48], [-170, -28], [-151, -19], [-132, -29], [-126, -48], [-145, -58], [-166, -55]] },
  { points: [[-70, 18], [-64, 42], [-45, 55], [-20, 52], [-8, 31], [-20, 11], [-46, 6], [-64, 18]] },
  { points: [[46, -5], [60, -28], [78, -45], [101, -43], [116, -23], [124, -17]] },
  { points: [[151, 7], [145, 28], [160, 46], [181, 39], [196, 55], [188, 72], [207, 84]] },
  { points: [[190, 54], [209, 62], [222, 79], [236, 89], [248, 105], [260, 119], [274, 130]] },
  { points: [[-252, -82], [-210, -118], [-145, -128], [-72, -112], [0, -92], [76, -91], [139, -74], [181, -40], [163, 19]] },
];

const AUTHORED_TRANSIT_PATH = [
  [-289, -116], [-292, -92], [-291, -58], [-286, -18], [-278, 24], [-266, 62],
  [-244, 96], [-210, 119], [-164, 132], [-112, 136], [-58, 132], [-4, 126],
  [48, 131], [101, 139], [151, 138], [194, 134], [224, 128], [247, 120], [265, 111],
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function authoredMapPath(points) {
  return points.map(([x, blenderY], index) => (
    `${index ? 'L' : 'M'} ${(x + 300).toFixed(1)} ${(150 - blenderY).toFixed(1)}`
  )).join(' ');
}

function appendSvg(group, tag, className, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  node.setAttribute('class', className);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  group.append(node);
  return node;
}

function renderCartography(group, prefix, worldId, stationPositions) {
  if (!group) return;
  group.innerHTML = '';
  appendSvg(group, 'path', `${prefix}__land`, {
    d: 'M 8 18 Q 8 6 22 6 H 578 Q 592 6 592 20 V 280 Q 592 294 578 294 H 22 Q 8 294 8 280 Z',
  });
  appendSvg(group, 'path', `${prefix}__boundary ${prefix}__boundary--north`, { d: 'M 10 20 H 590' });
  appendSvg(group, 'path', `${prefix}__boundary ${prefix}__boundary--west`, { d: 'M 18 12 V 288' });
  appendSvg(group, 'path', `${prefix}__boundary ${prefix}__boundary--east`, { d: 'M 582 12 V 288' });
  appendSvg(group, 'path', `${prefix}__boundary ${prefix}__boundary--south`, { d: 'M 10 280 H 590' });
  appendSvg(group, 'ellipse', `${prefix}__water`, { cx: 261, cy: 119, rx: 27, ry: 18 });
  for (const path of AUTHORED_ROAD_PATHS) {
    const d = authoredMapPath(path.points);
    appendSvg(group, 'path', `${prefix}__road-outline`, { d });
    appendSvg(group, 'path', `${prefix}__road${path.main ? '' : ` ${prefix}__road--secondary`}`, { d });
  }
  appendSvg(group, 'path', `${prefix}__rail`, { d: authoredMapPath(AUTHORED_TRANSIT_PATH) });
  for (const position of stationPositions) {
    appendSvg(group, 'circle', `${prefix}__station-dot`, {
      cx: (position.x + 300).toFixed(1),
      cy: (position.z + 150).toFixed(1),
      r: prefix === 'mini-map' ? 4.4 : 3.2,
    });
  }
  group.dataset.world = worldId;
  group.dataset.roadPathCount = String(AUTHORED_ROAD_PATHS.length);
  group.dataset.stationCount = String(stationPositions.length);
}

function safeLoad(saveKey) {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || '{}');
  } catch {
    return {};
  }
}

function playAudioCue(type) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return;
  globalThis.dispatchEvent(new globalThis.CustomEvent('sayscape:audio-cue', { detail: { type } }));
}

function namedRoots(root, pattern) {
  const result = [];
  root.traverse((object) => {
    if (!pattern.test(object.name)) return;
    let parent = object.parent;
    while (parent && parent !== root) {
      if (pattern.test(parent.name)) return;
      parent = parent.parent;
    }
    result.push(object);
  });
  return result;
}

function addLine(parent, className, text) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

export class GuideWorldSystems {
  constructor({ scene, world, player, camera, train, terrainY, showDialogue, objective, locationChip, canvas, worldId = 'hindi' }) {
    this.config = GUIDE_CONFIGS[worldId] ?? GUIDE_CONFIGS.hindi;
    this.lessonDefinitions = this.config.lessons;
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.camera = camera;
    this.train = train;
    this.terrainY = terrainY;
    this.showDialogue = showDialogue;
    this.objective = objective;
    this.objectiveNavigator = document.querySelector('#objective-navigator');
    this.objectiveArrow = document.querySelector('#objective-arrow');
    this.objectiveDistance = document.querySelector('#objective-distance');
    this.targetMarker = document.querySelector('#target-marker');
    this.targetMarkerLabel = document.querySelector('#target-marker-label');
    this.locationChip = locationChip;
    this.canvas = canvas;
    this.elapsed = 0;
    this.visibilityElapsed = 0;
    this.mapUpdateElapsed = 1;
    this.currentZone = '';
    this.currentTransport = 'On foot';
    this.mapOpen = false;
    this.missionBoardOpen = false;
    this.conversationOpen = false;
    this.tutorialOpen = false;
    this.arrivalPulse = 0;
    this.notificationTimer = null;

    const saved = safeLoad(this.config.saveKey);
    const savedIndex = Number(saved.lessonIndex ?? 0);
    this.state = {
      lessonIndex: THREE.MathUtils.clamp(savedIndex, 0, this.lessonDefinitions.length),
      phase: saved.phase ?? 'briefing',
      completedLessons: new Set(saved.completedLessons ?? []),
      discovered: new Set(saved.discovered ?? []),
    };
    // A completed conversation now flows directly into the next popup. Older
    // saves may still contain the former "return to Asha" phase.
    if (this.state.phase === 'return') {
      this.state.lessonIndex += 1;
      this.state.phase = this.state.lessonIndex >= this.lessonDefinitions.length ? 'complete' : 'briefing';
    }
    if (this.state.lessonIndex >= this.lessonDefinitions.length) this.state.phase = 'complete';
    this.firstWalkTutorialPending = this.state.lessonIndex === 0
      && this.state.phase === 'briefing'
      && this.state.completedLessons.size === 0;
    this.firstWalkOrigin = this.player.position.clone();
    this.canvas.dataset.firstWalkTutorialPending = String(this.firstWalkTutorialPending);
    this.canvas.dataset.firstWalkDistance = '0.00';

    this.lessonStatus = document.querySelector('#lesson-status-label');
    this.missionStatusButton = document.querySelector('#lesson-status');
    this.missionBoard = document.querySelector('#mission-board');
    this.missionBoardClose = document.querySelector('#mission-board-close');
    this.missionBoardKicker = document.querySelector('#mission-board-kicker');
    this.missionList = document.querySelector('#mission-list');
    this.missionDetailStatus = document.querySelector('#mission-detail-status');
    this.missionDetailTitle = document.querySelector('#mission-detail-title');
    this.missionDetailContext = document.querySelector('#mission-detail-context');
    this.missionDetailNative = document.querySelector('#mission-detail-native');
    this.missionDetailEnglish = document.querySelector('#mission-detail-english');
    this.missionDetailDestination = document.querySelector('#mission-detail-destination');
    this.missionDetailAction = document.querySelector('#mission-detail-action');
    this.missionPreviewIndex = this.state.lessonIndex;
    this.modeStatus = document.querySelector('#mode-status');
    this.transportElement = document.querySelector('#transport-status');
    this.guideTitle = document.querySelector('#guide-title');
    this.guideMessage = document.querySelector('#guide-message');
    this.guideContext = document.querySelector('#guide-context');
    this.guideHindi = document.querySelector('#guide-hindi');
    this.guideRomaji = document.querySelector('#guide-romaji');
    this.guideEnglish = document.querySelector('#guide-english');
    this.guidePhraseList = document.querySelector('#guide-phrase-list');
    this.guideProgress = document.querySelector('#guide-progress');
    this.guideNext = document.querySelector('#guide-next');
    this.guideStart = document.querySelector('#guide-start');
    this.guideHelp = document.querySelector('#guide-help');
    this.guideCard = document.querySelector('#guide-card');
    this.notification = document.querySelector('#notification');
    this.map = document.querySelector('#world-map');
    this.mapMarkers = document.querySelector('#map-markers');
    this.mapCartography = document.querySelector('#world-map-cartography');
    this.mapTransitLegend = document.querySelector('#world-map-transit-legend');
    this.mapPlayer = document.querySelector('#map-player');
    this.missionRoute = document.querySelector('#mission-route');
    this.miniMapViewport = document.querySelector('.mini-map__viewport');
    this.miniMapWorld = document.querySelector('#mini-map-world');
    this.miniMapCartography = document.querySelector('#mini-map-cartography');
    this.miniMapPlayer = document.querySelector('#mini-map-player');
    this.miniMapWaypoint = document.querySelector('#mini-map-waypoint');
    this.miniMapRoute = document.querySelector('#mini-map-route');
    this.miniMapPlace = document.querySelector('#mini-map-place');
    this.miniMapDistance = document.querySelector('#mini-map-distance');
    this.practicePanel = document.querySelector('#practice-panel');
    this.practiceRole = document.querySelector('#practice-role');
    this.practiceContext = document.querySelector('#practice-context');
    this.practiceNpcHindi = document.querySelector('#practice-npc-hindi');
    this.practiceNpcRomaji = document.querySelector('#practice-npc-romaji');
    this.practiceNpcEnglish = document.querySelector('#practice-npc-english');
    this.practiceChoices = document.querySelector('#practice-choices');
    this.practiceFeedback = document.querySelector('#practice-feedback');
    this.practiceContinue = document.querySelector('#practice-continue');
    this.practiceClose = document.querySelector('#practice-close');
    this.practiceHint = document.querySelector('#practice-hint');
    this.practiceModeVoice = document.querySelector('#practice-mode-voice');
    this.practiceModeText = document.querySelector('#practice-mode-text');
    this.navigationWorld = new THREE.Vector3();
    this.navigationScreen = new THREE.Vector3();
    this.navigationDirection = new THREE.Vector3();
    this.navigationHeading = new THREE.Vector3();
    this.mapTargetWorld = new THREE.Vector3();

    const guidePortrait = document.querySelector('.guide-card__avatar');
    if (guidePortrait) {
      guidePortrait.src = this.config.guidePortrait;
      guidePortrait.alt = `${this.config.guideName}, your ${this.config.language} guide`;
    }
    const helpPortrait = document.querySelector('#guide-help-avatar');
    if (helpPortrait) {
      helpPortrait.src = this.config.guidePortrait;
      helpPortrait.alt = `${this.config.guideName}, your ${this.config.language} guide`;
    }
    this.guideCard.setAttribute('aria-label', `${this.config.guideName}'s ${this.config.language} tutorial`);
    this.guideHelp.setAttribute('aria-label', `Open ${this.config.guideName}'s tip`);
    document.querySelector('#guide-phrase-languages').textContent = this.config.id === 'japanese'
      ? 'Japanese · reading · English'
      : `${this.config.language} · English`;
    this.practicePanel.setAttribute('aria-label', `${this.config.language} conversation practice`);
    const openingLesson = this.currentLesson ?? this.lessonDefinitions[0];
    document.querySelector('#dialogue-hindi').textContent = openingLesson?.phraseHi ?? this.config.completeNative;
    const openingRomaji = document.querySelector('#dialogue-romaji');
    openingRomaji.textContent = openingLesson?.phraseRomaji ?? '';
    openingRomaji.hidden = !openingLesson?.phraseRomaji;
    document.querySelector('#dialogue-english').textContent = openingLesson?.phraseEn ?? this.config.completeEnglish;
    document.querySelector('.practice-npc__avatar').textContent = {
      hindi: 'न', japanese: 'あ', spanish: 'ñ',
    }[this.config.id] ?? '•';
    document.querySelector('.guide-card__header small').textContent = `${this.config.guideName} · your ${this.config.language} guide`;
    document.querySelector('.dialogue__label').textContent = this.config.nativeLabel;

    this.guideNarration = new GuideNarration({
      button: document.querySelector('#guide-listen'),
      status: document.querySelector('#guide-audio-status'),
      guideName: this.config.guideName,
    });
    this.realtimePractice = new RealtimePractice({
      onComplete: (result) => this.completeVoicePractice(result),
      onFallback: () => this.setPracticeMode('text'),
    });

    this.setupDistricts();
    this.setupInteractions();
    this.setupLessons();
    this.setupMovingLife();
    this.setupRoadTraffic();
    this.setupMap();
    this.setupPracticeUi();
    this.setupTutorialUi();
    this.setupMissionUi();
    const festival = this.world.getObjectByName('FESTIVAL_GROUP');
    if (festival) festival.visible = false;
    this.updateGuideCard();
    if (this.firstWalkTutorialPending) this.guideHelp.hidden = true;
    this.updateHud();
    this.persist();
    this.canvas.dataset.guideReady = String(Boolean(this.guideStart && this.guideHelp));
    this.canvas.dataset.lessonCount = String(this.lessonDefinitions.length);
    this.canvas.dataset.missionCount = String(this.lessonDefinitions.length);
    this.canvas.dataset.worldId = this.config.id;
    if (this.state.phase === 'briefing' && !this.firstWalkTutorialPending) {
      requestAnimationFrame(() => this.openTutorial());
    }
  }

  get inputBlocked() {
    return this.mapOpen || this.missionBoardOpen || this.conversationOpen || this.tutorialOpen;
  }

  get currentLesson() {
    return this.lessonDefinitions[this.state.lessonIndex] ?? null;
  }

  persist() {
    localStorage.setItem(this.config.saveKey, JSON.stringify({
      lessonIndex: this.state.lessonIndex,
      phase: this.state.phase,
      completedLessons: [...this.state.completedLessons],
      discovered: [...this.state.discovered],
    }));
  }

  setupDistricts() {
    this.districts = this.config.districts.map((definition) => ({
      ...definition,
      object: this.world.getObjectByName(definition.root),
    }));
  }

  setupInteractions() {
    this.interactions = namedRoots(this.world, /^INTERACT_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: object.userData.prompt ?? 'Talk',
      action: object.userData.action ?? 'ambient_talk',
      hindi: object.userData.dialogue_hi ?? '',
      romaji: object.userData.dialogue_romaji ?? '',
      english: object.userData.dialogue_en ?? '',
      speaker: object.userData.speaker_name ?? 'Local',
      dynamic: object.name === 'INTERACT_TEMPLE_BELL',
    }));

    this.signs = namedRoots(this.world, /^SIGN_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: `Read the ${this.config.language} sign`,
      action: 'translate_sign',
      hindi: object.userData.hindi ?? '',
      romaji: object.userData.romaji ?? '',
      english: object.userData.english ?? '',
    }));

    this.npcInteractions = namedRoots(this.world, /^NPC_ROUTINE_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: 'Talk to a local',
      action: 'ambient_talk',
      hindi: object.userData.dialogue_hi ?? ({ hindi: 'नमस्ते!', japanese: 'こんにちは！', spanish: '¡Hola!' }[this.config.id] ?? 'Hello!'),
      romaji: object.userData.dialogue_romaji ?? '',
      english: object.userData.dialogue_en ?? 'Hello!',
      dynamic: true,
    }));

    this.scooters = namedRoots(this.world, /^SCOOTER(?:$|_DISTRICT_)/);
    this.bicycles = namedRoots(this.world, /^BICYCLE(?:$|_DISTRICT_)/);
    this.scooter = this.scooters[0] ?? null;
    this.vehicleCandidates = this.scooters.map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: 'Ride scooter · free',
      action: 'enter_scooter',
      hindi: 'स्कूटर चलाएँ',
      english: 'Ride the scooter',
      dynamic: true,
    }));
    const bicycleNative = {
      hindi: ['साइकिल चलाएँ', ''],
      japanese: ['自転車に乗る', 'Jitensha ni noru'],
      spanish: ['Montar en bicicleta', ''],
    }[this.config.id] ?? ['Ride the bicycle', ''];
    this.vehicleCandidates.push(...this.bicycles.map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: 'Ride bicycle · free',
      action: 'enter_bicycle',
      hindi: bicycleNative[0],
      romaji: bicycleNative[1],
      english: 'Ride the bicycle',
      dynamic: true,
    })));
    if (this.train) {
      const transitNative = {
        hindi: ['ट्रेन में चढ़ें', ''],
        japanese: ['地下鉄に乗る', 'Chikatetsu ni noru'],
        spanish: ['Subir al metro', ''],
      }[this.config.id] ?? [`Board the ${this.config.transitName}`, ''];
      this.vehicleCandidates.push({
        object: this.train,
        position: this.train.getWorldPosition(new THREE.Vector3()),
        prompt: `Board ${this.config.transitName} · free`,
        action: 'board_train',
        hindi: transitNative[0],
        romaji: transitNative[1],
        english: `Board the ${this.config.transitName}`,
        dynamic: true,
      });
    }
  }

  setupLessons() {
    this.lessons = this.lessonDefinitions.map((lesson) => {
      const target = this.resolveLessonTarget(lesson, this.player.position);
      return {
        ...lesson,
        target,
        targetPosition: target?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(),
      };
    });
  }

  resolveLessonTarget(lesson = this.currentLesson, position = this.player.position) {
    if (!lesson) return null;
    if (lesson.targetType === 'transit') return this.train ?? null;
    const candidates = lesson.targetType === 'scooter'
      ? this.scooters
      : lesson.targetType === 'bicycle'
        ? this.bicycles
        : null;
    if (candidates?.length) {
      let nearest = candidates[0];
      let nearestDistance = Infinity;
      for (const candidate of candidates) {
        candidate.getWorldPosition(this.navigationWorld);
        const distance = Math.hypot(position.x - this.navigationWorld.x, position.z - this.navigationWorld.z);
        if (distance < nearestDistance) {
          nearest = candidate;
          nearestDistance = distance;
        }
      }
      return nearest;
    }
    return lesson.targetName ? this.world.getObjectByName(lesson.targetName) : null;
  }

  setupMovingLife() {
    const roots = [
      ...namedRoots(this.world, /^NPC_ROUTINE_/),
      ...namedRoots(this.world, /^ANIMAL_GOAT_/),
    ];
    this.routines = roots.map((object, index) => {
      const position = object.getWorldPosition(new THREE.Vector3());
      this.scene.attach(object);
      object.position.copy(position);
      return {
        object,
        origin: position.clone(),
        radius: Number(object.userData.routine_radius ?? 5),
        speed: Number(object.userData.routine_speed ?? 0.6),
        phase: index * 1.77,
        animal: object.name.startsWith('ANIMAL_'),
      };
    });
  }

  setupRoadTraffic() {
    const route = this.world.getObjectByName('ROAD_ROUTE_WAYPOINTS');
    const points = route?.children
      .filter((point) => /^ROAD_ROUTE_\d+$/.test(point.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((point) => point.getWorldPosition(new THREE.Vector3())) ?? [];
    this.roadCurve = points.length > 2 ? new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.24) : null;
    if (this.roadCurve) this.roadCurve.arcLengthDivisions = 220;
    this.autos = namedRoots(this.world, /^AUTO_RICKSHAW_/).map((object, index) => {
      const position = object.getWorldPosition(new THREE.Vector3());
      this.scene.attach(object);
      object.position.copy(position);
      object.updateWorldMatrix(true, true);
      const authoredSize = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
      return {
        object,
        authoredSize,
        progress: Number(object.userData.route_offset ?? index * 0.27),
        speed: 8.5 + index,
      };
    });
    const firstAuto = this.autos[0]?.authoredSize;
    if (firstAuto) {
      this.canvas.dataset.autoLengthWidthRatio = (firstAuto.x / Math.max(0.01, firstAuto.z)).toFixed(3);
    }
    this.roadLength = this.roadCurve?.getLength() ?? 1;
  }

  setupMap() {
    this.mapMarkers.innerHTML = '';
    const stations = namedRoots(this.world, /^TRAIN_STOP_/);
    const stationPositions = stations.map((object) => object.getWorldPosition(new THREE.Vector3()));
    renderCartography(this.mapCartography, 'world-map', this.config.id, stationPositions);
    renderCartography(this.miniMapCartography, 'mini-map', this.config.id, stationPositions);
    this.mapTransitLegend.textContent = `━ ${this.config.mapTransitLabel}`;
    this.canvas.dataset.mapRoadPathCount = String(AUTHORED_ROAD_PATHS.length);
    this.canvas.dataset.mapStationCount = String(stationPositions.length);
    for (const district of this.districts) {
      const marker = document.createElement('span');
      marker.className = 'world-map__marker';
      marker.dataset.district = district.name;
      marker.textContent = district.name;
      marker.style.left = `${((district.x + 300) / 600) * 100}%`;
      marker.style.top = `${((district.z + 150) / 300) * 100}%`;
      this.mapMarkers.append(marker);
      district.marker = marker;
    }
    for (const object of stations) {
      const position = object.getWorldPosition(new THREE.Vector3());
      const marker = document.createElement('span');
      marker.className = 'world-map__station';
      marker.title = object.userData.stop_name ?? 'Railway station';
      marker.style.left = `${((position.x + 300) / 600) * 100}%`;
      marker.style.top = `${((position.z + 150) / 300) * 100}%`;
      this.mapMarkers.append(marker);
    }
    for (const object of namedRoots(this.world, /^BICYCLE(?:$|_DISTRICT_)/)) {
      const position = object.getWorldPosition(new THREE.Vector3());
      const marker = document.createElement('span');
      marker.className = 'world-map__vehicle world-map__vehicle--bicycle';
      marker.title = 'Free bicycle';
      marker.textContent = 'B';
      marker.style.left = `${((position.x + 300) / 600) * 100}%`;
      marker.style.top = `${((position.z + 150) / 300) * 100}%`;
      this.mapMarkers.append(marker);
    }
  }

  setupPracticeUi() {
    this.practiceChoices.addEventListener('click', (event) => {
      const button = event.target.closest('[data-choice-index]');
      if (button) this.submitPracticeResponse(Number(button.dataset.choiceIndex), 'text');
    });
    this.practiceContinue.addEventListener('click', () => this.closePractice(true));
    this.practiceClose.addEventListener('click', () => this.closePractice(true));
    this.practiceModeVoice.addEventListener('click', () => this.setPracticeMode('voice'));
    this.practiceModeText.addEventListener('click', () => this.setPracticeMode('text'));
  }

  setPracticeMode(requestedMode) {
    const mode = requestedMode === 'voice' ? 'voice' : 'text';
    this.practicePanel.dataset.practiceMode = mode;
    this.practiceModeVoice.hidden = false;
    this.practiceHint.textContent = mode === 'voice'
      ? 'Speak naturally · the NPC listens and replies automatically'
      : 'Press 1–3 to answer · switch back to voice whenever you want';
    this.modeStatus.textContent = mode === 'voice' ? 'Voice practice' : 'Text practice';
    if (mode === 'text') this.realtimePractice.disconnect();
  }

  setupTutorialUi() {
    this.guideStart.addEventListener('click', () => this.beginLesson());
    this.guideHelp.addEventListener('click', () => this.openTutorial());
  }

  setupMissionUi() {
    this.missionStatusButton.addEventListener('click', () => this.toggleMissionBoard());
    this.missionBoardClose.addEventListener('click', () => this.toggleMissionBoard(false));
    this.missionList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mission-index]');
      if (!button) return;
      this.missionPreviewIndex = Number(button.dataset.missionIndex);
      this.renderMissionBoard();
      playAudioCue('interact');
    });
    this.missionDetailAction.addEventListener('click', () => {
      if (this.missionPreviewIndex !== this.state.lessonIndex || this.state.phase === 'complete') return;
      this.toggleMissionBoard(false);
      if (this.state.phase === 'briefing') this.openTutorial();
    });
    this.missionBoard.classList.remove('mission-board--visible');
    this.missionBoard.setAttribute('aria-hidden', 'true');
    this.renderMissionBoard();
  }

  toggleMissionBoard(force) {
    const open = typeof force === 'boolean' ? force : !this.missionBoardOpen;
    if (open && this.mapOpen) {
      this.map.classList.remove('world-map--open');
      this.map.setAttribute('aria-hidden', 'true');
      this.mapOpen = false;
    }
    this.missionBoardOpen = open;
    this.missionBoard.classList.toggle('mission-board--visible', open);
    this.missionBoard.setAttribute('aria-hidden', String(!open));
    this.missionStatusButton.setAttribute('aria-expanded', String(open));
    if (open) {
      this.missionPreviewIndex = Math.min(this.state.lessonIndex, this.lessonDefinitions.length - 1);
      this.renderMissionBoard();
    } else {
      this.canvas.focus();
    }
    playAudioCue(open ? 'ui_open' : 'ui_close');
    return open;
  }

  renderMissionBoard() {
    if (!this.missionList) return;
    const lastIndex = Math.max(0, this.lessonDefinitions.length - 1);
    this.missionPreviewIndex = THREE.MathUtils.clamp(Number(this.missionPreviewIndex) || 0, 0, lastIndex);
    this.missionBoardKicker.textContent = `${this.config.language} journey · ${this.state.completedLessons.size}/${this.lessonDefinitions.length} complete`;
    this.missionList.replaceChildren();
    this.lessonDefinitions.forEach((lesson, index) => {
      const completed = this.state.completedLessons.has(lesson.id);
      const current = this.state.phase !== 'complete' && index === this.state.lessonIndex;
      const status = completed ? 'complete' : current ? 'current' : 'upcoming';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mission-list__item';
      button.dataset.missionIndex = String(index);
      button.dataset.status = status;
      button.setAttribute('aria-pressed', String(index === this.missionPreviewIndex));
      if (current) button.setAttribute('aria-current', 'step');
      const number = addLine(button, 'mission-list__number', completed ? '✓' : String(index + 1));
      number.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.className = 'mission-list__copy';
      addLine(copy, 'mission-list__kind', lesson.kind === 'experience' ? 'Explore' : 'Conversation');
      addLine(copy, 'mission-list__title', lesson.title);
      addLine(copy, 'mission-list__place', lesson.destination);
      button.append(copy);
      this.missionList.append(button);
    });

    const lesson = this.lessonDefinitions[this.missionPreviewIndex];
    if (!lesson) return;
    const completed = this.state.completedLessons.has(lesson.id);
    const current = this.state.phase !== 'complete' && this.missionPreviewIndex === this.state.lessonIndex;
    this.missionDetailStatus.textContent = completed
      ? `Mission ${this.missionPreviewIndex + 1} · completed`
      : current ? `Mission ${this.missionPreviewIndex + 1} · current` : `Mission ${this.missionPreviewIndex + 1} · coming up`;
    this.missionDetailTitle.textContent = lesson.title;
    this.missionDetailContext.textContent = lesson.context || lesson.guide;
    this.missionDetailNative.textContent = lesson.phraseHi;
    this.missionDetailEnglish.textContent = lesson.phraseEn;
    this.missionDetailDestination.textContent = `Destination: ${lesson.destination}`;
    this.missionDetailAction.disabled = completed || !current;
    this.missionDetailAction.textContent = completed
      ? 'Mission completed'
      : current
        ? this.state.phase === 'briefing' ? `Open ${this.config.guideName}’s lesson` : 'Return to current mission'
        : `Complete mission ${Math.max(1, this.state.lessonIndex + 1)} first`;
  }

  openTutorial() {
    if (!this.currentLesson || this.state.phase === 'complete') return false;
    const shouldAutoplayFirstLesson = this.firstWalkTutorialPending;
    this.firstWalkTutorialPending = false;
    this.canvas.dataset.firstWalkTutorialPending = 'false';
    this.tutorialOpen = true;
    this.guideCard.classList.add('tutorial-panel--visible');
    this.guideCard.setAttribute('aria-hidden', 'false');
    this.guideHelp.hidden = true;
    this.guideStart.textContent = this.state.phase === 'practice'
      ? `Continue ${this.currentLesson.kind === 'experience' ? 'mission' : 'practice'} · show me where`
      : this.currentLesson.kind === 'experience'
        ? 'Got it · show me where to go'
        : `I remember these · take me to ${this.currentLesson.role.split('·')[0].trim()}`;
    this.guideNarration.prepare({
      worldId: this.config.id,
      guideName: this.config.guideName,
      lessonId: this.currentLesson.id,
      autoplay: true,
      forceAutoplay: shouldAutoplayFirstLesson,
    });
    this.canvas.dataset.tutorialOpen = 'true';
    playAudioCue('ui_open');
    return true;
  }

  beginLesson() {
    if (!this.currentLesson) return false;
    this.firstWalkTutorialPending = false;
    this.canvas.dataset.firstWalkTutorialPending = 'false';
    this.state.phase = 'practice';
    this.tutorialOpen = false;
    this.guideNarration.stop();
    this.guideCard.classList.remove('tutorial-panel--visible');
    this.guideCard.setAttribute('aria-hidden', 'true');
    this.guideHelp.hidden = false;
    this.canvas.dataset.tutorialOpen = 'false';
    playAudioCue('ui_close');
    this.notify(this.currentLesson.kind === 'experience'
      ? `Mission started · ${this.currentLesson.objective}`
      : `Now practise with ${this.currentLesson.destination}`);
    playAudioCue('mission_start');
    this.persist();
    this.updateGuideCard();
    // Navigation should appear in the same interaction frame as the player
    // dismisses Asha, even on a low-power device between render frames.
    this.updateNavigation(this.player.position);
    this.updateMap(this.player.position);
    this.mapUpdateElapsed = 0;
    this.canvas.focus();
    return true;
  }

  advanceLesson() {
    this.state.lessonIndex += 1;
    if (this.state.lessonIndex >= this.lessonDefinitions.length) {
      this.state.phase = 'complete';
      this.guideHelp.hidden = true;
      this.notify(`${this.config.language} essentials complete · ${this.config.completeNative}`);
    } else {
      this.state.phase = 'briefing';
      this.notify(`New tutorial · ${this.currentLesson.title}`);
    }
    this.persist();
    this.updateGuideCard();
    if (this.state.phase === 'briefing') this.openTutorial();
  }

  completeExperientialMission(source) {
    const lesson = this.currentLesson;
    if (!lesson || lesson.kind !== 'experience' || this.state.phase !== 'practice') return false;
    this.state.completedLessons.add(lesson.id);
    playAudioCue('mission_complete');
    this.canvas.dataset.completedExperience = lesson.id;
    this.canvas.dataset.experienceCompletionSource = source;
    this.persist();
    this.advanceLesson();
    return true;
  }

  // slice-preview calls this only after a vehicle or transit boarding action
  // succeeds. Interaction and arrival challenges are completed inside this class.
  recordWorldEvent(type, payload = {}) {
    this.canvas.dataset.lastWorldEvent = String(type ?? '');
    const lesson = this.currentLesson;
    if (!lesson || lesson.kind !== 'experience' || this.state.phase !== 'practice') return false;
    if (lesson.completionEvent !== type) return false;
    const expected = lesson.completionPayload ?? {};
    const payloadMatches = Object.entries(expected).every(([key, value]) => payload?.[key] === value);
    if (!payloadMatches) return false;
    return this.completeExperientialMission(type);
  }

  interactionCandidates() {
    return [...this.interactions, ...this.signs, ...this.npcInteractions, ...this.vehicleCandidates];
  }

  updateHud() {
    const index = Math.min(this.state.lessonIndex + 1, this.lessonDefinitions.length);
    this.lessonStatus.textContent = this.state.phase === 'complete'
      ? `${this.lessonDefinitions.length}/${this.lessonDefinitions.length} missions`
      : `Mission ${index}/${this.lessonDefinitions.length}`;
    this.modeStatus.textContent = this.currentLesson?.kind === 'experience' ? 'World challenge' : 'Text practice';
    this.transportElement.textContent = this.currentTransport;
    this.canvas.dataset.lessonIndex = String(this.state.lessonIndex);
    this.canvas.dataset.lessonPhase = this.state.phase;
    this.canvas.dataset.completedLessons = String(this.state.completedLessons.size);
    if (this.missionBoardOpen) this.renderMissionBoard();
  }

  updateGuideCard() {
    const lesson = this.currentLesson;
    if (!lesson) {
      this.guideTitle.textContent = `${this.config.language} essentials complete`;
      this.guideMessage.textContent = 'You can revisit locals, signs, vehicles, and districts to keep practising and exploring.';
      this.guideContext.textContent = 'Your full mission journey is complete. Open the mission list whenever you want to review what you learned.';
      this.guideHindi.textContent = this.config.completeNative;
      this.guideRomaji.textContent = '';
      this.guideRomaji.hidden = true;
      this.guideEnglish.textContent = this.config.completeEnglish;
      this.guidePhraseList.replaceChildren();
      this.guideProgress.textContent = `${this.lessonDefinitions.length} of ${this.lessonDefinitions.length} missions complete`;
      this.guideNext.textContent = 'Explore and practise freely';
      this.objective.textContent = `${this.config.language} essentials complete · revisit any lesson NPC`;
      this.updateHud();
      return;
    }
    this.guideTitle.textContent = lesson.title;
    this.guideMessage.textContent = lesson.guide;
    this.guideContext.textContent = lesson.context || `Use this lesson while travelling to ${lesson.destination}.`;
    this.guideHindi.textContent = lesson.phraseHi;
    this.guideRomaji.textContent = lesson.phraseRomaji ?? '';
    this.guideRomaji.hidden = !lesson.phraseRomaji;
    this.guideEnglish.textContent = lesson.phraseEn;
    this.renderTeachingPhrases(lesson);
    this.guideProgress.textContent = `${this.state.completedLessons.size} of ${this.lessonDefinitions.length} missions complete`;
    if (this.state.phase === 'briefing') {
      this.guideNext.textContent = lesson.kind === 'experience'
        ? `Next: ${lesson.objective}`
        : `Next: practise with ${lesson.role.split('·')[0].trim()}`;
      this.objective.textContent = this.firstWalkTutorialPending
        ? `Start exploring · ${this.config.guideName} will guide you shortly`
        : `${this.config.guideName}’s tutorial · ${lesson.title}`;
    } else if (this.state.phase === 'practice') {
      this.guideNext.textContent = lesson.kind === 'experience'
        ? lesson.objective
        : `Practise with ${lesson.destination}`;
      this.objective.textContent = lesson.kind === 'experience'
        ? lesson.objective
        : `Go to ${lesson.destination} · press E to practise`;
    } else {
      this.guideNext.textContent = 'Continue for the next tutorial';
      this.objective.textContent = 'Conversation complete · continue to the next tutorial';
    }
    this.updateHud();
  }

  renderTeachingPhrases(lesson) {
    this.guidePhraseList.replaceChildren();
    const phrases = lesson.teachingPhrases?.length
      ? lesson.teachingPhrases
      : [{ hi: lesson.phraseHi, en: lesson.phraseEn }];
    for (const phrase of phrases) {
      const row = document.createElement('div');
      row.className = 'guide-phrase-row';
      addLine(row, 'guide-phrase-row__native', phrase.hi);
      if (phrase.romaji) addLine(row, 'guide-phrase-row__romaji', phrase.romaji);
      addLine(row, 'guide-phrase-row__english', phrase.en);
      this.guidePhraseList.append(row);
    }
  }

  notify(message, duration = 3600) {
    this.notification.textContent = message;
    this.notification.classList.add('notification--visible');
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => this.notification.classList.remove('notification--visible'), duration);
  }

  openPractice(lesson, item) {
    this.activePractice = { lesson, item };
    this.conversationOpen = true;
    this.practicePanel.classList.add('practice-panel--visible');
    this.practicePanel.setAttribute('aria-hidden', 'false');
    this.practicePanel.classList.remove('practice-panel--answered');
    this.practiceRole.textContent = lesson.role;
    this.practiceContext.textContent = lesson.context || `Use the phrase ${this.config.guideName} taught you while speaking with ${lesson.role.split('·')[0].trim()}.`;
    this.practiceNpcHindi.textContent = lesson.npcHi;
    this.practiceNpcRomaji.textContent = lesson.npcRomaji ?? '';
    this.practiceNpcRomaji.hidden = !lesson.npcRomaji;
    this.practiceNpcEnglish.textContent = lesson.npcEn;
    this.practiceFeedback.textContent = '';
    this.practiceFeedback.className = 'practice-feedback';
    this.practiceContinue.hidden = true;
    this.practiceChoices.innerHTML = '';
    lesson.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'practice-choice';
      button.dataset.choiceIndex = String(index);
      addLine(button, 'practice-choice__number', String(index + 1));
      const copy = document.createElement('span');
      copy.className = 'practice-choice__copy';
      addLine(copy, 'practice-choice__hindi', choice.hi);
      if (choice.romaji) addLine(copy, 'practice-choice__romaji', choice.romaji);
      addLine(copy, 'practice-choice__english', choice.en);
      button.append(copy);
      this.practiceChoices.append(button);
    });
    this.setPracticeMode('voice');
    this.realtimePractice.open({ worldId: this.config.id, language: this.config.language, lesson });
    this.canvas.dataset.practiceOpen = 'true';
    this.canvas.dataset.practiceLesson = lesson.id;
    playAudioCue('ui_open');
  }

  // Text choices and live voice feedback share the same lesson completion path.
  submitPracticeResponse(response, source = 'text') {
    if (!this.activePractice) return false;
    const { lesson } = this.activePractice;
    const choice = typeof response === 'number'
      ? lesson.choices[response]
      : lesson.choices.find((item) => item.hi.replace(/[।?!\s]/g, '') === String(response).replace(/[।?!\s]/g, ''));
    if (!choice) return false;
    if (!choice.correct) {
      this.practiceFeedback.className = 'practice-feedback practice-feedback--retry';
      this.practiceFeedback.textContent = `Not for this situation. Try ${this.config.guideName}’s phrase: ${lesson.phraseHi}`;
      this.notify('Try again · choose the phrase that fits this situation');
      return false;
    }
    return this.completePractice({
      source,
      feedback: `${lesson.replyHi}${lesson.replyRomaji ? ` · ${lesson.replyRomaji}` : ''} — ${lesson.replyEn}`,
    });
  }

  completeVoicePractice({ feedback }) {
    if (!this.activePractice) return false;
    return this.completePractice({ source: 'voice', feedback });
  }

  completePractice({ source, feedback }) {
    const lesson = this.activePractice?.lesson;
    if (!lesson) return false;
    this.practiceFeedback.className = 'practice-feedback practice-feedback--success';
    this.practiceFeedback.textContent = feedback;
    this.practicePanel.classList.add('practice-panel--answered');
    this.practicePanel.dataset.practiceMode = 'text';
    this.practiceChoices.innerHTML = '';
    this.practiceContinue.hidden = false;
    this.state.completedLessons.add(lesson.id);
    this.state.phase = 'return';
    playAudioCue('mission_complete');
    this.canvas.dataset.lastPracticeSource = source;
    this.canvas.dataset.lastPracticeResult = 'correct';
    this.practiceContinue.textContent = this.state.completedLessons.size >= this.lessonDefinitions.length
      ? `Finish ${this.config.language} essentials`
      : `Continue to ${this.config.guideName}’s next tutorial`;
    this.practiceHint.textContent = source === 'voice'
      ? 'Feedback is based on this short roleplay · keep practising aloud in the world'
      : `Text practice complete · voice remains available for ${this.config.language} conversations`;
    this.notify('Conversation complete · continue for the next tutorial');
    this.persist();
    this.updateGuideCard();
    return true;
  }

  closePractice(advanceCompleted = true) {
    const shouldAdvance = advanceCompleted && this.state.phase === 'return';
    this.practicePanel.classList.remove('practice-panel--visible');
    this.practicePanel.setAttribute('aria-hidden', 'true');
    this.conversationOpen = false;
    this.realtimePractice.disconnect();
    this.activePractice = null;
    this.canvas.dataset.practiceOpen = 'false';
    playAudioCue('ui_close');
    this.canvas.focus();
    if (shouldAdvance) this.advanceLesson();
  }

  handleKey(code) {
    if (this.missionBoardOpen) {
      if (code === 'Escape' || code === 'KeyM') this.toggleMissionBoard(false);
      return true;
    }
    if (this.tutorialOpen) {
      if (code === 'Enter' || code === 'Space') this.beginLesson();
      return true;
    }
    if (!this.conversationOpen) return false;
    if (/^Digit[1-3]$/.test(code) && this.practicePanel.dataset.practiceMode === 'text') this.submitPracticeResponse(Number(code.at(-1)) - 1, 'keyboard');
    else if (code === 'Enter' && this.state.phase === 'return') this.closePractice(true);
    else if (code === 'Escape') this.closePractice(true);
    return true;
  }

  interact(item) {
    if (!item) return { handled: false };
    if (item.action === 'enter_scooter') {
      return { handled: true, command: 'enter_scooter', vehicle: item.object };
    } else if (item.action === 'enter_bicycle') {
      return { handled: true, command: 'enter_bicycle', vehicle: item.object };
    } else if (item.action === 'board_train') {
      return { handled: true, command: 'board_train' };
    } else if (item.action === this.currentLesson?.action && this.state.phase === 'practice') {
      this.openPractice(this.currentLesson, item);
    } else if (item.action.startsWith('practice_')) {
      this.showDialogue({
        hindi: item.hindi,
        romaji: item.romaji,
        english: this.state.phase === 'briefing'
          ? `Review ${this.config.guideName}’s tutorial popup before starting this practice.`
          : `${this.config.guideName} will introduce this situation in a later lesson.`,
      });
    } else if (item.action === 'translate_sign') {
      this.showDialogue(item);
      this.notify(`${item.hindi} means “${item.english}”`);
      const lesson = this.currentLesson;
      const target = this.resolveLessonTarget(lesson, this.player.position);
      if (lesson?.kind === 'experience'
        && lesson.completionInteraction === 'translate_sign'
        && this.state.phase === 'practice'
        && item.object === target) {
        this.completeExperientialMission('sign_interaction');
      }
    } else if (item.action === 'ring_bell') {
      this.showDialogue(item);
      this.notify('The temple bell echoes across the mountain');
    } else if (item.action === 'scooter_tip') {
      this.showDialogue(item);
      this.notify('Every marked scooter is free to ride');
    } else {
      this.showDialogue(item);
    }
    this.canvas.dataset.lastInteraction = item.action;
    return { handled: true };
  }

  setTransport(label) {
    this.currentTransport = label;
    this.transportElement.textContent = label;
  }

  updateZone(position) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const district of this.districts) {
      const distance = Math.hypot(position.x - district.x, position.z - district.z);
      if (distance < nearestDistance) {
        nearest = district;
        nearestDistance = distance;
      }
    }
    const next = nearestDistance < 58 ? nearest.name : this.config.openRoad;
    if (next !== this.currentZone) {
      this.currentZone = next;
      this.locationChip.textContent = next;
      this.locationChip.classList.remove('location-chip--arriving');
      requestAnimationFrame(() => this.locationChip.classList.add('location-chip--arriving'));
      if (nearestDistance < 58 && !this.state.discovered.has(nearest.name)) {
        this.state.discovered.add(nearest.name);
        this.arrivalPulse = 2.4;
        this.notify(`Arrived in ${nearest.name}`);
        this.persist();
      }
    }
    const lesson = this.currentLesson;
    if (lesson?.kind === 'experience'
      && lesson.completionZone === nearest?.name
      && this.state.phase === 'practice'
      && nearestDistance < 58) {
      this.completeExperientialMission('district_arrival');
    }
    return this.currentZone;
  }

  updateLife(delta, viewerPosition) {
    for (const item of this.routines) {
      if (viewerPosition.distanceToSquared(item.origin) > 190 * 190) continue;
      const angle = this.elapsed * item.speed / Math.max(1, item.radius) + item.phase;
      item.object.position.x = item.origin.x + Math.cos(angle) * item.radius;
      item.object.position.z = item.origin.z + Math.sin(angle) * item.radius;
      const y = this.terrainY(item.object.position);
      if (Number.isFinite(y)) item.object.position.y = y;
      item.object.rotation.y = -angle;
      if (item.animal) item.object.rotation.z = Math.sin(this.elapsed * 7 + item.phase) * 0.035;
    }
    if (!this.roadCurve) return;
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    for (const auto of this.autos) {
      auto.progress = (auto.progress + delta * auto.speed / this.roadLength) % 2;
      const pingPong = auto.progress < 1 ? auto.progress : 2 - auto.progress;
      this.roadCurve.getPointAt(pingPong, point);
      this.roadCurve.getTangentAt(pingPong, tangent);
      if (auto.progress >= 1) tangent.negate();
      auto.object.position.copy(point);
      auto.object.position.y += 0.50;
      auto.object.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI * 0.5;
      // Detailed imported autos are relatively draw-call heavy. Beyond this
      // distance they are already visually lost in the world fog, so cull
      // them before spending browser GPU time on dozens of tiny submeshes.
      auto.object.visible = viewerPosition.distanceToSquared(auto.object.position) < 145 * 145;
    }
  }

  updateMap(position) {
    const mapX = THREE.MathUtils.clamp(position.x + 300, 0, 600);
    const mapY = THREE.MathUtils.clamp(position.z + 150, 0, 300);
    this.mapPlayer.style.left = `${(mapX / 600) * 100}%`;
    this.mapPlayer.style.top = `${(mapY / 300) * 100}%`;

    const miniScale = 0.82;
    const miniCenterX = (this.miniMapViewport?.clientWidth || 218) * 0.5;
    const miniCenterY = (this.miniMapViewport?.clientHeight || 142) * 0.5;
    this.miniMapWorld.style.transform = `translate(${miniCenterX - mapX * miniScale}px, ${miniCenterY - mapY * miniScale}px) scale(${miniScale})`;
    this.navigationHeading.set(0, 0, -1).applyQuaternion(this.player.quaternion).setY(0).normalize();
    const miniHeading = Math.atan2(this.navigationHeading.x, -this.navigationHeading.z);
    this.miniMapPlayer.style.left = `${miniCenterX}px`;
    this.miniMapPlayer.style.top = `${miniCenterY}px`;
    this.miniMapPlayer.style.transform = `translate(-50%, -50%) rotate(${miniHeading}rad)`;
    this.miniMapPlace.textContent = this.currentZone || this.config.worldName;

    const targetObject = this.navigationTarget();
    const target = targetObject?.getWorldPosition(this.mapTargetWorld) ?? null;
    if (!target || this.state.phase === 'complete') {
      this.missionRoute.classList.remove('world-map__mission-route--visible');
      this.miniMapRoute.classList.remove('mini-map__route--visible');
      this.miniMapWaypoint.classList.remove('mini-map__waypoint--visible');
      this.miniMapWaypoint.setAttribute('aria-hidden', 'true');
      this.miniMapDistance.textContent = this.state.phase === 'complete'
        ? 'All lessons complete'
        : this.firstWalkTutorialPending
          ? `Walk a few steps · ${this.config.guideName} will guide you`
          : `Open ${this.config.guideName}’s lesson`;
      this.canvas.dataset.miniMapWaypoint = '';
      return;
    }
    const endX = THREE.MathUtils.clamp(target.x + 300, 0, 600);
    const endY = THREE.MathUtils.clamp(target.z + 150, 0, 300);
    const routePath = `M ${mapX} ${mapY} Q ${(mapX + endX) * 0.5} ${Math.min(mapY, endY) - 24} ${endX} ${endY}`;
    this.missionRoute.setAttribute('d', routePath);
    this.missionRoute.classList.add('world-map__mission-route--visible');
    this.miniMapRoute.setAttribute('d', routePath);
    this.miniMapRoute.classList.add('mini-map__route--visible');
    this.miniMapWaypoint.style.left = `${endX}px`;
    this.miniMapWaypoint.style.top = `${endY}px`;
    this.miniMapWaypoint.classList.add('mini-map__waypoint--visible');
    this.miniMapWaypoint.setAttribute('aria-hidden', 'false');
    const distance = Math.hypot(target.x - position.x, target.z - position.z);
    const label = this.navigationLabel();
    this.miniMapWaypoint.title = label;
    this.miniMapDistance.textContent = `${Math.max(0, Math.round(distance))} m · ${label}`;
    this.canvas.dataset.miniMapWaypoint = label;
    this.canvas.dataset.miniMapDistance = distance.toFixed(2);
  }

  navigationTarget() {
    if (this.state.phase !== 'practice') return null;
    const lesson = this.lessons[this.state.lessonIndex];
    const target = this.resolveLessonTarget(lesson, this.player.position);
    if (lesson) lesson.target = target;
    return target;
  }

  navigationLabel() {
    const lesson = this.currentLesson;
    return lesson?.targetLabel ?? lesson?.role?.split('·')[0]?.trim() ?? 'Mission target';
  }

  updateNavigation(position) {
    const target = this.navigationTarget();
    const hidden = !target || !this.camera;
    this.objectiveNavigator.classList.toggle('objective-navigator--complete', hidden);
    this.targetMarker.classList.toggle('target-marker--visible', false);
    if (hidden) {
      this.canvas.dataset.navigationTarget = '';
      this.canvas.dataset.targetMarkerVisible = 'false';
      return;
    }

    target.getWorldPosition(this.navigationWorld);
    this.navigationDirection.copy(this.navigationWorld).sub(position).setY(0);
    const distance = this.navigationDirection.length();
    if (distance > 0.001) this.navigationDirection.normalize();
    this.navigationHeading.set(0, 0, -1).applyQuaternion(this.player.quaternion).setY(0).normalize();
    const dot = THREE.MathUtils.clamp(this.navigationHeading.dot(this.navigationDirection), -1, 1);
    const crossY = this.navigationHeading.z * this.navigationDirection.x
      - this.navigationHeading.x * this.navigationDirection.z;
    const arrowAngle = -Math.atan2(crossY, dot);
    this.objectiveArrow.style.transform = `rotate(${arrowAngle}rad)`;
    const label = this.navigationLabel();
    this.objectiveDistance.textContent = `${Math.max(0, Math.round(distance))} m · ${label} is your ${this.currentLesson?.kind === 'experience' ? 'destination' : 'next person'}`;

    this.navigationScreen.copy(this.navigationWorld);
    this.navigationScreen.y += 3.00;
    this.navigationScreen.project(this.camera);
    const inFront = this.navigationScreen.z > -1 && this.navigationScreen.z < 1;
    const onScreen = Math.abs(this.navigationScreen.x) < 0.95 && Math.abs(this.navigationScreen.y) < 0.94;
    const markerVisible = inFront && onScreen && target.visible && !this.conversationOpen;
    if (markerVisible) {
      this.targetMarker.style.left = `${(this.navigationScreen.x * 0.5 + 0.5) * window.innerWidth}px`;
      this.targetMarker.style.top = `${(-this.navigationScreen.y * 0.5 + 0.5) * window.innerHeight}px`;
      this.targetMarkerLabel.textContent = label.toUpperCase();
      this.targetMarker.classList.add('target-marker--visible');
    }
    this.canvas.dataset.navigationTarget = label;
    this.canvas.dataset.navigationDistance = distance.toFixed(2);
    this.canvas.dataset.navigationArrowRadians = arrowAngle.toFixed(4);
    this.canvas.dataset.targetMarkerVisible = String(markerVisible);
  }

  updateAreaVisibility(position) {
    this.visibilityElapsed = 0;
    for (const district of this.districts) {
      if (!district.object) continue;
      district.object.visible = Math.hypot(position.x - district.x, position.z - district.z) < 190;
    }
  }

  updateFirstWalkTutorial(position) {
    if (!this.firstWalkTutorialPending || this.state.phase !== 'briefing') return;
    const distance = Math.hypot(
      position.x - this.firstWalkOrigin.x,
      position.z - this.firstWalkOrigin.z,
    );
    this.canvas.dataset.firstWalkDistance = distance.toFixed(2);
    if (distance < FIRST_LESSON_WALK_DISTANCE) return;
    this.openTutorial();
    this.notify(`${this.config.guideName} is ready with your first ${this.config.language} lesson`);
  }

  update(delta, position) {
    this.elapsed += delta;
    this.arrivalPulse = Math.max(0, this.arrivalPulse - delta);
    this.visibilityElapsed += delta;
    this.mapUpdateElapsed += delta;
    this.updateFirstWalkTutorial(position);
    this.updateZone(position);
    this.updateNavigation(position);
    this.updateLife(delta, position);
    if (this.mapUpdateElapsed > 0.08) {
      this.updateMap(position);
      this.mapUpdateElapsed = 0;
    }
    if (this.visibilityElapsed > 0.30) this.updateAreaVisibility(position);
  }

  toggleMap() {
    const open = !this.map.classList.contains('world-map--open');
    this.map.classList.toggle('world-map--open', open);
    this.map.setAttribute('aria-hidden', String(!open));
    this.mapOpen = open;
    return open;
  }
}
