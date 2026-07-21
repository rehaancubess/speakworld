import { DAY_STORIES } from './state.js';

const response = (hindi, guide, feedback, effects = {}, extra = {}) => ({
  hindi, guide, feedback, effects, ...extra,
});

const retry = (hindi, guide, feedback) => response(hindi, guide, feedback, {}, { retry: true });

function homeQuest(day, title, prompt, toast, final = false) {
  return {
    id: `day-${day}-home`,
    day,
    target: 'leela',
    location: 'Sundar Van Guesthouse',
    kicker: `Day ${day} · Return home`,
    title,
    copy: 'Return to Leela’s guesthouse, put away today’s things, and end the day in your room.',
    hint: 'मैं वापस आ गया हूँ · I am back',
    nextToast: toast,
    dayEnd: true,
    final,
    effects: { setTime: DAY_STORIES[day - 1].endMinutes },
    steps: [
      {
        prompt,
        choices: [
          response(
            'मैं वापस आ गया हूँ। आज का दिन अच्छा था।',
            'Main vaapas aa gaya hoon · I am back. Today was good.',
            final
              ? 'Leela smiles. “अब आप मेहमान नहीं—परिवार हैं। You are not a guest now; you are family.”'
              : 'Leela marks you safely home. Your room lamp is already glowing upstairs.',
            { relationships: { leela: 1 }, time: 25 },
          ),
          response(
            'आज मैंने बहुत कुछ सीखा।',
            'Aaj maine bahut kuch seekha · I learned a lot today.',
            '“कल और सीखेंगे—we will learn more tomorrow.” Leela hands you your room key.',
            { relationships: { leela: 1 }, time: 25 },
          ),
          retry('मैं अभी भी स्टेशन हूँ।', 'I am still a station.', 'Leela looks outside for the tracks. Tell her that you have returned.'),
        ],
      },
    ],
  };
}

export const QUESTS = [
  // DAY 1 — ARRIVAL
  {
    id: 'arrival-platform', day: 1, target: 'rekha', location: 'Nadi Para Junction',
    effects: { setTime: 16 * 60 + 5 },
    kicker: 'Day 1 · 3:20 PM · Arrival', title: 'Find the guesthouse',
    copy: 'You have just arrived with one suitcase. Ask Rekha which train goes to Sundar Van Halt.',
    hint: 'सुंदर वन कैसे जाऊँ? · How do I get to Sundar Van?',
    nextToast: 'Route learned — Sundar Van is two stops away',
    steps: [
      {
        prompt: 'नमस्ते! आपको कहाँ जाना है?\nNamaste! Aapko kahaan jaana hai? — Where do you need to go?',
        choices: [
          response('मुझे सुंदर वन जाना है।', 'Mujhe Sundar Van jaana hai · I need to go to Sundar Van.', 'Rekha points to the painted local train map.', { relationships: { rekha: 1 }, time: 12 }),
          retry('मैं सुंदर वन हूँ।', 'I am Sundar Van.', 'Rekha looks around for trees. Say that you need to go there.'),
          retry('एक किलो स्टेशन।', 'One kilo of station.', '“Stations are not sold by weight.” Tell Rekha your destination.'),
        ],
      },
      {
        prompt: 'लोकल ट्रेन लीजिए। सुंदर वन दो स्टेशन बाद है।\nTake the local train. Sundar Van is after two stops.',
        choices: [
          response('क्या यह सही प्लेटफॉर्म है?', 'Kya yah sahi platform hai? · Is this the correct platform?', '“हाँ, प्लेटफॉर्म दो.” Rekha gives you a temporary arrival ticket.', { addItems: ['Arrival train ticket'], time: 10, journal: 'Learned to ask whether a platform is correct.' }),
          response('दो स्टेशन बाद, सही?', 'Do station baad, sahi? · After two stops, correct?', '“बिल्कुल सही.” Repeating important information prevents a wrong train.', { addItems: ['Arrival train ticket'], relationships: { rekha: 1 }, time: 10 }),
          retry('ट्रेन बहुत स्वादिष्ट है।', 'The train is delicious.', 'Rekha strongly recommends riding the train rather than eating it.'),
        ],
      },
    ],
  },
  {
    id: 'arrival-luggage', day: 1, target: 'dev', location: 'Sundar Van',
    effects: { setTime: 18 * 60 + 5 },
    kicker: 'Day 1 · Late afternoon', title: 'Carry your luggage uphill',
    copy: 'The forest road divides after the halt. Ask Dev for the guesthouse and accept help with your suitcase.',
    hint: 'अतिथि गृह कहाँ है? · Where is the guesthouse?',
    nextToast: 'Dev knows the shortcut — follow the lamps uphill',
    steps: [
      {
        prompt: 'आप रास्ता ढूँढ रहे हैं?\nAap raasta dhoondh rahe hain? — Are you looking for the way?',
        choices: [
          response('हाँ, अतिथि गृह कहाँ है?', 'Haan, atithi grih kahaan hai? · Where is the guesthouse?', 'Dev points past the green shelter: “ऊपर, फिर दाएँ—uphill, then right.”', { relationships: { dev: 1 }, time: 14 }),
          retry('अतिथि गृह मुझे ढूँढ रहा है।', 'The guesthouse is looking for me.', '“Then you should make its job easier.” Ask where it is.'),
          retry('मैं रास्ता खा रहा हूँ।', 'I am eating the road.', 'Dev moves your suitcase away from your imaginary meal. Ask for directions.'),
        ],
      },
      {
        prompt: 'आपका सामान भारी है। मैं मदद करूँ?\nYour luggage is heavy. Shall I help?',
        choices: [
          response('हाँ, कृपया। बहुत धन्यवाद।', 'Haan, kripya. Bahut dhanyavaad · Yes, please. Thank you.', 'Dev takes the heavy end and walks with you to Leela’s gate.', { removeItems: ['Suitcase'], addItems: ['Luggage at guesthouse'], relationships: { dev: 2 }, time: 18 }),
          response('धन्यवाद, मैं ले जाऊँगा।', 'Thank you, I will carry it.', 'Dev respects the answer and walks beside you so you do not miss the turn.', { relationships: { dev: 1 }, time: 22 }),
          retry('सामान दो किलो जंगल है।', 'The luggage is two kilos of forest.', 'Dev is fairly sure it is a suitcase. Accept or decline his help politely.'),
        ],
      },
    ],
  },
  {
    id: 'guesthouse-checkin', day: 1, target: 'leela', location: 'Sundar Van Guesthouse',
    kicker: 'Day 1 · Evening', title: 'Check into your room',
    copy: 'Confirm your reservation, pay the deposit, and choose the kind of room you want.',
    hint: 'मेरे नाम से कमरा बुक है · I have a room booked',
    nextToast: 'Day 1 complete — your room is ready', dayEnd: true,
    effects: {
      setTime: 21 * 60 + 10,
      removeItems: ['Suitcase'],
      addItems: ['Luggage at guesthouse'],
      addContacts: ['Leela'],
      messages: [{ from: 'Leela', text: 'Breakfast is 7–9 AM. Keep your brass room key with you.' }],
    },
    steps: [
      {
        prompt: 'नमस्ते! क्या आपने कमरा बुक किया है?\nDo you have a reservation?',
        choices: [
          response('हाँ, मेरे नाम से कमरा बुक है।', 'Mere naam se kamra book hai · A room is booked in my name.', 'Leela finds your name in the handwritten register.', { relationships: { leela: 1 }, time: 15 }),
          retry('मैं एक कमरा हूँ।', 'I am a room.', 'Leela checks whether you have a door handle. Tell her about the reservation.'),
          retry('मुझे ट्रेन बुक करनी है।', 'I need to book a train.', '“Rekha handles trains.” Tell Leela about your room.'),
        ],
      },
      {
        prompt: 'जमा राशि सात सौ रुपये है। ठीक है?\nThe deposit is ₹700. Is that okay?',
        choices: [
          response('ठीक है। यह सात सौ रुपये हैं।', 'Theek hai · Okay. Here is ₹700.', 'Leela writes a receipt and gives you a brass room key.', { money: -700, addItems: ['Guesthouse key'], removeItems: ['Arrival train ticket'], time: 18 }),
          response('क्या मैं कार्ड से भुगतान कर सकता हूँ?', 'Can I pay by card?', 'The machine works on the second attempt. Leela gives you the room key.', { money: -700, addItems: ['Guesthouse key'], removeItems: ['Arrival train ticket'], time: 20, memories: { paidByCard: true } }),
          retry('सात रुपये ठीक हैं?', 'Are seven rupees okay?', 'Leela turns the receipt around: ₹700, not ₹7.'),
        ],
      },
      {
        prompt: 'सड़क वाला कमरा या शांत आँगन वाला कमरा?\nRoad-side room or the quiet courtyard room?',
        choices: [
          response('एक शांत कमरा चाहिए, कृपया।', 'Ek shaant kamra chahiye · A quiet room, please.', 'Leela remembers your preference and gives you the courtyard room.', { memories: { roomPreference: 'quiet courtyard room' }, relationships: { leela: 2 }, time: 20, journal: 'Checked into the quiet courtyard room at Sundar Van.' }),
          response('सड़क वाला कमरा ठीक है।', 'The road-side room is fine.', 'Your window overlooks the railway lamps and the last evening train.', { memories: { roomPreference: 'railway-side room' }, relationships: { leela: 1 }, time: 20, journal: 'Checked into the railway-side room at Sundar Van.' }),
          retry('कमरा सड़क पीता है।', 'The room drinks the road.', 'Leela waits for a real room preference.'),
        ],
      },
    ],
  },

  // DAY 2 — GETTING CONNECTED
  {
    id: 'breakfast', day: 2, target: 'kabir', location: 'Chai Gali',
    effects: { setTime: 9 * 60 + 15 },
    kicker: 'Day 2 · Morning', title: 'Order breakfast',
    copy: 'Start your first full morning with chai and poha. Remember to ask the price before paying.',
    hint: 'एक प्लेट पोहा · one plate of poha',
    nextToast: 'Breakfast ordered — now find the mobile shop',
    steps: [
      {
        prompt: 'सुप्रभात! नाश्ते में क्या लेंगे?\nGood morning! What will you have for breakfast?',
        choices: [
          response('एक प्लेट पोहा और एक चाय, कृपया।', 'One plate of poha and one chai, please.', 'Kabir starts your order and remembers it for tomorrow.', { memories: { breakfastOrder: 'poha and chai' }, relationships: { kabir: 1 }, time: 25 }),
          response('एक चाय, कम चीनी।', 'One chai, less sugar.', 'Kabir nods. It is a small breakfast, but perfectly understood.', { memories: { breakfastOrder: 'low-sugar chai' }, relationships: { kabir: 1 }, time: 20 }),
          retry('मैं पोहा हूँ।', 'I am poha.', 'Kabir reaches for a plate, then gives you another chance to order.'),
        ],
      },
      {
        prompt: 'कुल सत्तर रुपये।\nThe total is ₹70.',
        choices: [
          response('ये लीजिए। धन्यवाद।', 'Ye lijiye. Dhanyavaad · Here you are. Thank you.', 'Kabir returns the correct change and points toward Rangila Junction.', { money: -70, relationships: { kabir: 1 }, time: 15 }),
          response('क्या मैं यूपीआई से दे सकता हूँ?', 'Can I pay by UPI?', '“Phone चालू होने के बाद.” You pay cash today; soon you will have UPI.', { money: -70, memories: { wantsUpi: true }, time: 15 }),
          retry('सत्तर किलो?', 'Seventy kilos?', 'Kabir points to the price board. It is ₹70, not a weight.'),
        ],
      },
    ],
  },
  {
    id: 'sim-first-visit', day: 2, target: 'mohan', location: 'Rangila Junction',
    effects: { setTime: 12 * 60 },
    kicker: 'Day 2 · Late morning', title: 'Choose a mobile plan',
    copy: 'Compare prepaid plans at Mohan’s shop. The application will reveal something you left in your room.',
    hint: 'मुझे नया सिम चाहिए · I need a new SIM',
    nextToast: 'Application paused — your passport is at the guesthouse',
    steps: [
      {
        prompt: 'आपको किस तरह का सिम चाहिए?\nWhat kind of SIM do you need?',
        choices: [
          response('प्रीपेड सिम चाहिए। रोज़ कितना डेटा मिलेगा?', 'I need prepaid. How much daily data will I get?', 'Mohan shows you a 2 GB daily plan and notes your preference.', { memories: { simPlan: 'prepaid 2 GB plan' }, relationships: { mohan: 1 }, time: 20 }),
          response('सबसे सस्ता प्लान कौन सा है?', 'Which is the cheapest plan?', 'Mohan shows a smaller 1 GB plan that costs less.', { memories: { simPlan: 'budget 1 GB plan' }, relationships: { mohan: 1 }, time: 20 }),
          retry('फोन मुझे खरीदना चाहता है।', 'The phone wants to buy me.', 'Mohan puts the phone down. Tell him what plan you need.'),
        ],
      },
      {
        prompt: 'सिम के लिए पासपोर्ट चाहिए। आपके पास है?\nI need your passport for the SIM. Do you have it?',
        choices: [
          response('ओह, पासपोर्ट कमरे में है। मैं लेकर आता हूँ।', 'My passport is in my room. I will bring it.', 'Mohan saves the application. Your chosen plan will still be waiting.', { memories: { simApplicationWaiting: true }, time: 8, messages: [{ from: 'Mohan', text: 'Bring your passport to finish SIM activation.' }] }),
          response('क्या कोई और पहचान पत्र चलेगा?', 'Will another identity document work?', '“हाँ, लेकिन passport आसान है.” Yours is back at the guesthouse.', { memories: { simApplicationWaiting: true }, relationships: { mohan: 1 }, time: 8 }),
          retry('मेरा पासपोर्ट दो जीबी है।', 'My passport is 2 GB.', 'Mohan needs a document, not its imaginary data allowance.'),
        ],
      },
    ],
  },
  {
    id: 'retrieve-passport', day: 2, target: 'leela', location: 'Sundar Van Guesthouse',
    effects: { setTime: 13 * 60 + 10 },
    kicker: 'Day 2 · Midday', title: 'Retrieve your passport',
    copy: 'Return to the guesthouse and explain why you need the document from your luggage.',
    hint: 'मेरा पासपोर्ट कमरे में है · My passport is in the room',
    nextToast: 'Passport recovered — return to Mohan before the shop closes',
    steps: [
      {
        prompt: ({ state }) => `आपका ${state.memories.roomPreference ?? 'कमरा'} साफ़ हो गया है। कुछ चाहिए?\nYour room is ready. Do you need anything?`,
        choices: [
          response('हाँ, मेरा पासपोर्ट कमरे में है। सिम के लिए चाहिए।', 'My passport is in the room. I need it for a SIM.', 'Leela opens the luggage cupboard and checks that you put it safely in your bag.', { addItems: ['Passport'], relationships: { leela: 1 }, time: 18 }),
          response('क्या आप मेरा पासपोर्ट दे सकती हैं?', 'Can you give me my passport?', 'Leela asks you to confirm your room number, then hands it over.', { addItems: ['Passport'], relationships: { leela: 1 }, time: 18 }),
          retry('मेरा कमरा पासपोर्ट है।', 'My room is a passport.', 'Leela asks what document you need from the room.'),
        ],
      },
    ],
  },
  {
    id: 'activate-sim', day: 2, target: 'mohan', location: 'Rangila Junction',
    effects: { setTime: 17 * 60 + 20 },
    kicker: 'Day 2 · Afternoon', title: 'Activate your phone',
    copy: 'Finish the saved application, confirm the plan, and receive your first local number.',
    hint: 'मेरा पासपोर्ट यहाँ है · My passport is here',
    nextToast: 'Phone activated — Mohan and Leela are now in your contacts',
    steps: [
      {
        prompt: ({ state }) => `आप वापस आ गए! ${state.memories.simPlan ?? 'आपका प्लान'} तैयार है। पासपोर्ट लाए?\nYou are back. Did you bring the passport?`,
        choices: [
          response('हाँ, मेरा पासपोर्ट यहाँ है।', 'Haan, mera passport yahaan hai · My passport is here.', 'Mohan verifies your name and completes the application.', { relationships: { mohan: 2 }, time: 22 }, { requires: ['Passport'] }),
          response('पहले कुल कीमत बताइए।', 'Please tell me the total price first.', '“₹399.” You confirm the price before showing your passport.', { relationships: { mohan: 1 }, time: 12 }, { requires: ['Passport'] }),
          retry('पासपोर्ट ट्रेन में सो रहा है।', 'The passport is sleeping on the train.', 'Mohan cannot activate the SIM without the document you retrieved.'),
        ],
      },
      {
        prompt: 'कुल तीन सौ निन्यानवे रुपये। नंबर अभी चालू हो जाएगा।\n₹399 total. The number will activate now.',
        choices: [
          response('ठीक है। क्या कॉल भी शामिल हैं?', 'Okay. Are calls included too?', '“हाँ, unlimited calls.” Your phone connects to the network.', { money: -399, addItems: ['Activated SIM', 'Phone'], addContacts: ['Leela', 'Mohan'], relationships: { mohan: 1 }, time: 25, journal: 'Activated a local SIM after retrieving the passport.' }),
          response('ठीक है। रसीद भेज दीजिए।', 'Okay. Please send the receipt.', 'The first message on your new phone is Mohan’s digital receipt.', { money: -399, addItems: ['Activated SIM', 'Phone'], addContacts: ['Leela', 'Mohan'], messages: [{ from: 'Mohan', text: 'SIM active · ₹399 paid · Welcome to Nimbu Mobile.' }], time: 25 }),
          retry('तीन सौ किलो डेटा।', 'Three hundred kilos of data.', 'Mohan repeats the price in rupees. Confirm or ask about the plan.'),
        ],
      },
    ],
  },
  homeQuest(2, 'Return after your first errands', 'फोन चल रहा है? पहला दिन कैसा रहा?\nIs the phone working? How was your day?', 'Day 2 complete — tomorrow you travel alone'),

  // DAY 3 — LEARNING THE CITY
  {
    id: 'read-timetable', day: 3, target: 'rekha', location: 'Nadi Para Junction',
    effects: { setTime: 10 * 60 },
    kicker: 'Day 3 · Morning', title: 'Read the railway',
    copy: 'Use the station board, buy a day pass, and confirm the correct direction without relying on the waypoint.',
    hint: 'रंगीला जाने वाली ट्रेन · the train going to Rangila',
    nextToast: 'Day pass added — board the Nimbu Express',
    steps: [
      {
        prompt: 'बोर्ड पर अगली ट्रेन कहाँ जा रही है?\nWhere is the next train on the board going?',
        choices: [
          response('अगली ट्रेन रंगीला जंक्शन जा रही है।', 'The next train is going to Rangila Junction.', '“सही.” You read the destination rather than guessing from the train colour.', { relationships: { rekha: 1 }, time: 15 }),
          retry('अगली ट्रेन कल जा रही है।', 'The next train is going tomorrow.', 'Rekha taps the destination column, not the time column.'),
          retry('बोर्ड ट्रेन चला रहा है।', 'The board is driving the train.', 'Read the destination shown on the board.'),
        ],
      },
      {
        prompt: 'एक दिन का पास पचास रुपये का है। चाहिए?\nA day pass costs ₹50. Would you like one?',
        choices: [
          response('हाँ, एक दिन का पास दीजिए।', 'Yes, please give me a day pass.', 'Rekha stamps it for every stop on the globe route.', { money: -50, addItems: ['Rail day pass'], time: 12 }),
          response('क्या इस पास से वापसी भी हो जाएगी?', 'Does the pass include the return trip?', '“हाँ, पूरे दिन.” You buy it after confirming.', { money: -50, addItems: ['Rail day pass'], relationships: { rekha: 1 }, time: 12 }),
          retry('पचास स्टेशन दीजिए।', 'Give me fifty stations.', 'You need one pass, not fifty railway stations.'),
        ],
      },
    ],
  },
  {
    id: 'ask-passenger', day: 3, target: 'aman', location: 'Rangila Farms',
    effects: { setTime: 13 * 60 + 15 },
    kicker: 'Day 3 · On the route', title: 'Check before you get lost',
    copy: 'Find Aman near Rangila and verify the route toward Suraj Mela. Asking early is part of travelling well.',
    hint: 'क्या यह रास्ता सही है? · Is this the right way?',
    nextToast: 'Route confirmed — Suraj Mela is beyond the mango cart',
    steps: [
      {
        prompt: 'आप किसी को ढूँढ रहे हैं?\nAre you looking for someone?',
        choices: [
          response('हाँ, मुझे सूरज मेला जाना है। क्या यह रास्ता सही है?', 'I need to go to Suraj Mela. Is this the right way?', 'Aman points across the fields: “सीधे, फिर आम के ठेले पर बाएँ.”', { relationships: { aman: 2 }, addContacts: ['Aman'], time: 18 }),
          response('सूरज मेला कितनी दूर है?', 'How far is Suraj Mela?', '“लगभग दस मिनट.” Aman shows you the shorter walking path.', { relationships: { aman: 1 }, time: 15 }),
          retry('क्या मैं रास्ता सही हूँ?', 'Am I the correct road?', 'Aman confirms that you are a person. Ask about the route.'),
        ],
      },
      {
        prompt: 'अगर पीला मंदिर दिखे, तो आप बहुत आगे निकल गए।\nIf you see the yellow temple, you have gone too far.',
        choices: [
          response('ठीक है—आम के ठेले पर बाएँ।', 'Okay—left at the mango cart.', 'You repeat the landmark correctly and can now travel without the floating marker.', { memories: { melaRoute: 'left at the mango cart' }, time: 8 }),
          response('रास्ता भूलूँ तो आपको फोन करूँ?', 'Can I call if I get lost?', 'Aman laughs and confirms that his number is now in your phone.', { messages: [{ from: 'Aman', text: 'Suraj Mela: left at the mango cart. Do not pass the yellow temple!' }], relationships: { aman: 1 }, time: 8 }),
          retry('पीला मंदिर खा लूँगा।', 'I will eat the yellow temple.', 'Aman recommends using the temple as a landmark instead.'),
        ],
      },
    ],
  },
  {
    id: 'social-invitation', day: 3, target: 'zoya', location: 'Suraj Mela',
    effects: { setTime: 18 * 60 + 35 },
    kicker: 'Day 3 · Afternoon', title: 'Accept a real invitation',
    copy: 'Zoya recognizes a newcomer and invites you to Friday’s festival preparations.',
    hint: 'मैं ज़रूर आऊँगा · I will definitely come',
    nextToast: 'Festival invitation saved in your phone',
    steps: [
      {
        prompt: 'शुक्रवार को यहाँ बड़ा मेला है। आप आएँगे?\nThere is a large festival here on Friday. Will you come?',
        choices: [
          response('हाँ, मैं ज़रूर आऊँगा। कितने बजे?', 'Yes, I will definitely come. What time?', '“तैयारी दो बजे, celebration सात बजे.” Zoya adds you to the group.', { memories: { festivalReply: 'coming to help' }, relationships: { zoya: 2 }, addContacts: ['Zoya'], messages: [{ from: 'Zoya', text: 'Friday: preparations 2 PM · festival 7 PM · Suraj Mela' }], time: 18 }),
          response('हाँ, लेकिन मैं थोड़ी देर से आऊँगा।', 'Yes, but I will arrive a little late.', 'Zoya says the evening celebration begins at seven and remembers your answer.', { memories: { festivalReply: 'coming in the evening' }, relationships: { zoya: 1 }, addContacts: ['Zoya'], time: 18 }),
          retry('मैं शुक्रवार खाऊँगा।', 'I will eat Friday.', 'Zoya asks whether you will attend the festival.'),
        ],
      },
    ],
  },
  homeQuest(3, 'Find your way home after dark', 'आपने रास्ता खुद ढूँढ लिया! सफ़र कैसा था?\nYou found the way yourself! How was the journey?', 'Day 3 complete — you can navigate the railway'),

  // DAY 4 — MAKING A HOME
  {
    id: 'report-fan', day: 4, target: 'vikram', location: 'Shikhar Dham Summit',
    effects: { setTime: 10 * 60 + 30 },
    kicker: 'Day 4 · Morning', title: 'Explain the broken fan',
    copy: 'Take the Shikhar Shuttle from Pahadi Road to Vikram’s mountain lodge, then clearly describe what is wrong in your room.',
    hint: 'शिखर जाने वाली बस कहाँ है? · Where is the bus to the summit?',
    nextToast: 'Problem understood — find Ramesh Uncle for a diagnosis',
    steps: [
      {
        prompt: 'आप शिखर तक आ गए! बस की यात्रा कैसी थी—और कमरा कैसा लग रहा है?\nYou made it to the summit. How was the bus ride, and how are you finding the room?',
        choices: [
          response('कमरा अच्छा है, लेकिन पंखा काम नहीं कर रहा।', 'The room is good, but the fan is not working.', 'Vikram appreciates the clear explanation and writes down the problem.', { memories: { roomProblem: 'broken fan' }, relationships: { vikram: 2 }, time: 15 }),
          response('कमरा अच्छा है। एक छोटी समस्या है।', 'The room is good. There is one small problem.', 'Vikram listens patiently and asks what is broken.', { relationships: { vikram: 1 }, time: 12 }),
          retry('कमरा मुझे घुमा रहा है।', 'The room is spinning me.', 'Vikram asks what object is not working.'),
        ],
      },
      {
        prompt: 'क्या आवाज़ आती है या पंखा बिल्कुल बंद है?\nDoes it make a noise, or is it completely off?',
        choices: [
          response('आवाज़ आती है, लेकिन पंखा घूमता नहीं है।', 'It makes a noise, but the fan does not turn.', '“शायद capacitor.” Vikram sends you to Ramesh Uncle for confirmation.', { memories: { fanSymptom: 'hums but does not turn' }, time: 12 }),
          response('पंखा बिल्कुल बंद है।', 'The fan is completely off.', 'Vikram thinks it may be the switch and asks Ramesh to inspect it.', { memories: { fanSymptom: 'completely off' }, time: 12 }),
          retry('पंखा बहुत स्वादिष्ट है।', 'The fan is delicious.', 'Vikram is asking about a mechanical symptom.'),
        ],
      },
    ],
  },
  {
    id: 'diagnose-fan', day: 4, target: 'uncle', location: 'Nimbu Maidan',
    effects: { setTime: 12 * 60 + 30 },
    kicker: 'Day 4 · Late morning', title: 'Ask a neighbour for help',
    copy: 'Describe the same problem to Ramesh Uncle without starting over or pointing at an answer.',
    hint: 'क्या आप देख सकते हैं? · Can you take a look?',
    nextToast: 'Diagnosis complete — buy one capacitor at Pahadi Road',
    steps: [
      {
        prompt: 'विक्रम ने बताया कि पंखे में समस्या है। क्या हो रहा है?\nVikram said there is a fan problem. What is happening?',
        choices: [
          response('पंखा आवाज़ करता है, लेकिन घूमता नहीं है।', 'The fan makes noise but does not turn.', 'Ramesh recognizes the symptom immediately: the capacitor is weak.', { relationships: { uncle: 2 }, time: 18 }),
          response('पंखा बिल्कुल बंद है। क्या आप देख सकते हैं?', 'The fan is completely off. Can you look?', 'Ramesh checks the switch and still recommends bringing a replacement capacitor.', { relationships: { uncle: 2 }, time: 18 }),
          retry('विक्रम पंखा है।', 'Vikram is a fan.', 'Ramesh asks what the actual fan is doing.'),
        ],
      },
      {
        prompt: 'पहाड़ी रोड से पाँच माइक्रोफैराड का कैपेसिटर लाइए।\nBring a five-microfarad capacitor from Pahadi Road.',
        choices: [
          response('पाँच माइक्रोफैराड। मैं लिख लेता हूँ।', 'Five microfarads. I will write it down.', 'Ramesh sends the specification to your phone so you do not buy the wrong part.', { messages: [{ from: 'Ramesh Uncle', text: 'Fan part: 5 µF capacitor · Pahadi Road repair counter' }], memories: { fanPart: '5 µF capacitor' }, addContacts: ['Ramesh Uncle'], time: 8 }),
          response('क्या आप नाम मेरे फोन पर भेज सकते हैं?', 'Can you send the name to my phone?', 'The part name arrives as a message with the correct number.', { messages: [{ from: 'Ramesh Uncle', text: 'Ask for: पाँच माइक्रोफैराड कैपेसिटर (5 µF)' }], memories: { fanPart: '5 µF capacitor' }, time: 8 }),
          retry('पाँच किलो पंखा।', 'Five kilos of fan.', 'The number describes the electrical part, not its weight.'),
        ],
      },
    ],
  },
  {
    id: 'buy-fan-part', day: 4, target: 'naina', location: 'Pahadi Road',
    effects: { setTime: 16 * 60 },
    kicker: 'Day 4 · Afternoon', title: 'Buy the correct replacement',
    copy: 'Use Ramesh’s message at Naina’s counter and confirm the part before paying.',
    hint: 'पाँच माइक्रोफैराड का कैपेसिटर · 5 µF capacitor',
    nextToast: 'Fan part acquired — take it back to Vikram',
    steps: [
      {
        prompt: 'नमस्ते! क्या चाहिए?\nHello! What do you need?',
        choices: [
          response('पंखे के लिए पाँच माइक्रोफैराड का कैपेसिटर चाहिए।', 'I need a 5 µF capacitor for a fan.', 'Naina compares the number on the box with Ramesh’s message.', { relationships: { naina: 2 }, time: 15 }),
          response('यह संदेश देखिए। मुझे यही पुर्जा चाहिए।', 'Please see this message. I need this part.', 'Naina reads the specification and finds an exact match.', { relationships: { naina: 1 }, time: 15 }),
          retry('मुझे पाँच पंखे चाहिए।', 'I need five fans.', 'That would be expensive. Ask for the small capacitor instead.'),
        ],
      },
      {
        prompt: 'एक सौ अस्सी रुपये। बदलना हो तो रसीद रखिए।\n₹180. Keep the receipt in case you need to exchange it.',
        choices: [
          response('ठीक है। रसीद भी दीजिए।', 'Okay. Please give me the receipt too.', 'Naina packs the part and receipt together.', { money: -180, addItems: ['5 µF fan capacitor', 'Repair receipt'], time: 12 }),
          response('क्या यह सही साइज़ है?', 'Is this the correct size?', 'Naina checks once more before you pay—a careful purchase.', { money: -180, addItems: ['5 µF fan capacitor', 'Repair receipt'], relationships: { naina: 1 }, time: 14 }),
          retry('एक सौ अस्सी किलो?', 'One hundred eighty kilos?', 'The price is ₹180. Confirm the part or ask a useful question.'),
        ],
      },
    ],
  },
  {
    id: 'repair-fan', day: 4, target: 'vikram', location: 'Pahadi Gaon',
    effects: { setTime: 19 * 60 + 10 },
    kicker: 'Day 4 · Evening', title: 'Finish what you started',
    copy: 'Return with the part, arrange the repair, and confirm when the room will be ready.',
    hint: 'पुर्जा मिल गया · I found the part',
    nextToast: 'Fan repaired — Vikram now treats you like a neighbour',
    steps: [
      {
        prompt: 'पुर्जा मिला?\nDid you find the part?',
        choices: [
          response('हाँ, पाँच माइक्रोफैराड का कैपेसिटर मिल गया।', 'Yes, I found the 5 µF capacitor.', 'Vikram checks the label and calls Ramesh over.', { removeItems: ['5 µF fan capacitor'], relationships: { vikram: 2 }, time: 20 }, { requires: ['5 µF fan capacitor'] }),
          response('हाँ, और रसीद भी रखी है।', 'Yes, and I kept the receipt.', '“बहुत अच्छा.” Vikram notices that you handled the errand carefully.', { removeItems: ['5 µF fan capacitor'], relationships: { vikram: 2 }, time: 20 }, { requires: ['5 µF fan capacitor'] }),
          retry('पुर्जा मुझे मिल गया है?', 'Has the part found me?', 'Show Vikram the capacitor in your inventory.'),
        ],
      },
      {
        prompt: 'पंखा अब चल रहा है। कमरा आज रात तैयार है।\nThe fan works now. The room is ready tonight.',
        choices: [
          response('बहुत धन्यवाद। आपने जल्दी मदद की।', 'Thank you very much. You helped quickly.', 'Vikram smiles. You handled the entire problem without needing English.', { memories: { fanFixed: true }, relationships: { vikram: 2 }, time: 18, journal: 'Solved the broken fan problem from diagnosis to repair.' }),
          response('धन्यवाद। क्या मैं रसीद आपको दे दूँ?', 'Thank you. Should I give you the receipt?', 'Vikram keeps it with the room records and thanks you.', { memories: { fanFixed: true }, removeItems: ['Repair receipt'], relationships: { vikram: 1 }, time: 18 }),
          retry('पंखा अब कमरा है।', 'The fan is now a room.', 'Vikram is telling you the repair succeeded.'),
        ],
      },
    ],
  },
  homeQuest(4, 'Come home to a working room', 'पंखा ठीक हो गया? आपने सब खुद संभाला?\nIs the fan fixed? Did you handle everything yourself?', 'Day 4 complete — tomorrow the whole town celebrates'),

  // DAY 5 — FESTIVAL NIGHT
  {
    id: 'festival-briefing', day: 5, target: 'zoya', location: 'Suraj Mela',
    effects: { setTime: 12 * 60 + 30 },
    kicker: 'Day 5 · Late morning', title: 'Join the preparations',
    copy: 'Meet Zoya as promised and choose how you will help prepare the festival grounds.',
    hint: 'मैं मदद करने आया हूँ · I came to help',
    nextToast: 'Festival jobs assigned — first collect a marigold garland',
    steps: [
      {
        prompt: ({ state }) => state.memories.festivalReply === 'coming to help'
          ? 'आप समय पर आ गए! मैंने कहा था तैयारी दो बजे शुरू होगी।\nYou came on time! Preparations begin at two.'
          : 'आप आ गए! शाम से पहले थोड़ी तैयारी बाकी है।\nYou made it! There is preparation left before evening.',
        choices: [
          response('मैं मदद करने आया हूँ। क्या करना है?', 'I came to help. What needs to be done?', 'Zoya gives you three real jobs instead of treating you like a visitor.', { relationships: { zoya: 2 }, time: 15 }),
          response('माफ़ कीजिए, थोड़ी देर हो गई।', 'Sorry, I am a little late.', '“कोई बात नहीं.” Zoya appreciates that you acknowledged it.', { relationships: { zoya: 1 }, time: 15 }),
          retry('मैं त्योहार हूँ।', 'I am the festival.', 'Zoya asks how you would like to help the festival.'),
        ],
      },
      {
        prompt: 'सुमन से गेंदे की माला लाइए, फिर आशा की सजावट में मदद कीजिए।\nBring a marigold garland from Suman, then help Asha decorate.',
        choices: [
          response('ठीक है—पहले माला, फिर सजावट।', 'Okay—first the garland, then decorations.', 'You repeat both jobs in order and save them in your phone.', { messages: [{ from: 'Festival group', text: '1. Buy marigold garland from Suman\n2. Help Asha decorate\n3. Meet Kabir at food stall' }], time: 8 }),
          response('गेंदे की माला कितनी चाहिए?', 'How many marigold garlands are needed?', '“एक बड़ी माला.” Zoya appreciates the useful follow-up.', { memories: { garlandSize: 'one large garland' }, time: 8 }),
          retry('पहले सजावट खाऊँगा।', 'First I will eat the decorations.', 'Repeat the two jobs in a safer order.'),
        ],
      },
    ],
  },
  {
    id: 'buy-garland', day: 5, target: 'suman', location: 'Sabzi Bazaar',
    effects: { setTime: 14 * 60 + 30 },
    kicker: 'Day 5 · Early afternoon', title: 'Buy the festival garland',
    copy: 'Ask Suman for the correct flowers, negotiate politely, and keep enough money for the evening.',
    hint: 'गेंदे की एक बड़ी माला · one large marigold garland',
    nextToast: 'Garland acquired — take it to Asha in Nimbu Chowk',
    steps: [
      {
        prompt: 'त्योहार के लिए क्या चाहिए?\nWhat do you need for the festival?',
        choices: [
          response('गेंदे की एक बड़ी माला चाहिए।', 'I need one large marigold garland.', 'Suman chooses a fresh saffron-and-yellow garland.', { relationships: { suman: 1 }, time: 15 }),
          response('ज़ोया ने एक बड़ी माला मँगाई है।', 'Zoya asked for one large garland.', 'Suman recognizes the festival order and wraps it carefully.', { relationships: { suman: 2 }, time: 15 }),
          retry('एक किलो त्योहार चाहिए।', 'I need one kilo of festival.', 'Suman sells flowers, not festivals. Ask for the garland.'),
        ],
      },
      {
        prompt: 'ढाई सौ रुपये।\n₹250.',
        choices: [
          response('थोड़ा कम कीजिए—मैं मेले में मदद कर रहा हूँ।', 'Please reduce it—I am helping at the festival.', 'Suman gives the volunteer price: ₹210.', { money: -210, addItems: ['Marigold garland'], relationships: { suman: 1 }, time: 12 }),
          response('ठीक है। फूल बहुत सुंदर हैं।', 'Okay. The flowers are beautiful.', 'Suman includes a few extra flowers after the compliment.', { money: -250, addItems: ['Marigold garland', 'Loose marigolds'], relationships: { suman: 2 }, time: 12 }),
          retry('ढाई रुपये ठीक हैं?', 'Is ₹2.50 okay?', 'Suman points to the handwritten ₹250 sign.'),
        ],
      },
    ],
  },
  {
    id: 'festival-decorations', day: 5, target: 'asha', location: 'Nimbu Chowk',
    effects: { setTime: 17 * 60 + 30 },
    kicker: 'Day 5 · Afternoon', title: 'Decorate the town',
    copy: 'Deliver the garland and follow Asha’s two-step instructions while the streets begin changing for evening.',
    hint: 'माला कहाँ लगानी है? · Where should the garland go?',
    nextToast: 'The town is decorated — report to Kabir’s food stall',
    steps: [
      {
        prompt: 'वाह, माला आ गई! इसे कहाँ लगाएँ?\nThe garland is here! Where should we put it?',
        choices: [
          response('माला कहाँ लगानी है?', 'Where should the garland go?', 'Asha points above the square entrance, between the two blue lamps.', { relationships: { asha: 1 }, time: 12 }, { requires: ['Marigold garland'] }),
          response('इसे मुख्य दरवाज़े पर लगाएँ?', 'Shall we put it at the main entrance?', '“हाँ, बिल्कुल.” You identified the best place yourself.', { relationships: { asha: 2 }, time: 12 }, { requires: ['Marigold garland'] }),
          retry('माला ट्रेन चलाएगी।', 'The garland will drive the train.', 'Asha needs help placing the flowers.'),
        ],
      },
      {
        prompt: 'पहले बायाँ सिरा बाँधिए, फिर दायाँ सिरा ऊपर कीजिए।\nTie the left end first, then raise the right end.',
        choices: [
          response('पहले बायाँ, फिर दायाँ। समझ गया।', 'First left, then right. Understood.', 'The garland hangs evenly. By sunset, the entire square looks different.', { removeItems: ['Marigold garland'], memories: { decoratedFestival: true }, relationships: { asha: 2 }, time: 55, journal: 'Helped decorate Nimbu Chowk for the festival.' }),
          response('क्या आप दायाँ सिरा पकड़ेंगी?', 'Will you hold the right end?', 'Asha holds it while you tie the other side—a natural cooperative request.', { removeItems: ['Marigold garland'], memories: { decoratedFestival: true }, relationships: { asha: 2 }, time: 55 }),
          retry('पहले ऊपर, फिर माला बाएँ है।', 'First up, then the garland is left.', 'Repeat the two instructions in the order Asha gave them.'),
        ],
      },
    ],
  },
  {
    id: 'festival-food', day: 5, target: 'kabir', location: 'Chai Gali',
    effects: { setTime: 19 * 60 + 15 },
    kicker: 'Day 5 · Evening', title: 'Help at the food stall',
    copy: 'Kabir’s stall is overwhelmed. Take a real customer order and confirm its quantity.',
    hint: 'आपका ऑर्डर दोहराता हूँ · I will repeat your order',
    nextToast: 'Food stall rescued — Suraj Mela is glowing after dark',
    steps: [
      {
        prompt: 'भीड़ आ गई! इस ग्राहक का ऑर्डर सुनिए: दो चाय, एक बिना चीनी।\nListen: two chais, one without sugar.',
        choices: [
          response('दो चाय—एक सामान्य, एक बिना चीनी।', 'Two chais—one regular, one without sugar.', 'Kabir gives you the correct two glasses. The customer nods.', { relationships: { kabir: 2 }, time: 20 }),
          response('आपका ऑर्डर दोहराता हूँ: दो चाय, सही?', 'I will repeat your order: two chais, correct?', 'The customer confirms, preventing a mistake in the noise.', { relationships: { kabir: 2 }, time: 20 }),
          retry('दो चीनी, एक चाय बिना ग्राहक।', 'Two sugars, one chai without a customer.', 'Kabir repeats the actual order slowly.'),
        ],
      },
      {
        prompt: ({ state }) => `आपको याद है? पहले दिन आपने ${state.memories.breakfastOrder ?? 'चाय'} लिया था। अब आप दुकान चला रहे हैं!\nYou remember? Now you are helping run the shop!`,
        choices: [
          response('आपने मुझे अच्छी तरह सिखाया।', 'You taught me well.', 'Kabir gives you a festival sweet and calls you his newest regular.', { addItems: ['Festival sweet'], relationships: { kabir: 2 }, time: 45 }),
          response('अब मैं यूपीआई से भुगतान कर सकता हूँ!', 'Now I can pay with UPI!', 'Kabir laughs and displays your first successful QR payment.', { money: -20, memories: { firstUpiPayment: true }, relationships: { kabir: 2 }, time: 45 }),
          retry('अब दुकान मुझे चला रही है।', 'Now the shop is running me.', 'Kabir agrees that it feels that way, but waits for a real response.'),
        ],
      },
    ],
  },
  {
    id: 'festival-night', day: 5, target: 'zoya', location: 'Suraj Mela',
    effects: { setTime: 21 * 60 + 30 },
    kicker: 'Day 5 · Night', title: 'Celebrate with your new friends',
    copy: 'Return to the transformed mela, offer your festival gift, and join the group without needing a scripted excuse.',
    hint: 'आप सब से मिलकर खुशी हुई · I am happy to have met you all',
    nextToast: 'Festival memory added — return to Leela one last time',
    steps: [
      {
        prompt: 'आपने पूरा शहर सजा दिया! अब हमारे साथ खाना खाएँगे?\nYou decorated the whole town! Will you eat with us?',
        choices: [
          response('हाँ, ज़रूर। आप सब से मिलकर खुशी हुई।', 'Yes, of course. I am happy to have met you all.', 'Zoya makes space in the circle. The people you helped greet you by name.', { relationships: { zoya: 3 }, time: 30 }),
          response('हाँ, लेकिन थोड़ा सा। धन्यवाद।', 'Yes, but only a little. Thank you.', 'Zoya remembers your preference and brings a small plate.', { relationships: { zoya: 2 }, time: 30 }),
          retry('मैं खाना हूँ, मुझे खाइए।', 'I am food; please eat me.', 'The group protects you from your own sentence. Accept politely.'),
        ],
      },
      {
        prompt: 'निम्बू नगर में आपका पहला हफ़्ता कैसा था?\nHow was your first week in Nimbu Nagar?',
        choices: [
          response('शुरू में मुश्किल था, लेकिन अब यह घर जैसा लगता है।', 'It was difficult at first, but now it feels like home.', 'The train lights circle the tiny planet as music begins in the square.', { memories: { finalFeeling: 'Nimbu Nagar feels like home' }, relationships: { zoya: 2 }, addContacts: ['Kabir', 'Asha', 'Vikram', 'Naina'], time: 35, journal: 'Celebrated the festival with friends after five connected days.' }),
          response('मैंने बहुत सी गलतियाँ कीं, और बहुत कुछ सीखा।', 'I made many mistakes and learned a lot.', '“यही सबसे अच्छा तरीका है—that is the best way.” Zoya raises a cup of chai.', { memories: { finalFeeling: 'mistakes became learning' }, relationships: { zoya: 2 }, time: 35 }),
          retry('पहला हफ़्ता दो किलो था।', 'The first week was two kilos.', 'Zoya asks how the week felt, not how much it weighed.'),
        ],
      },
    ],
  },
  homeQuest(5, 'Come home as part of Nimbu Nagar', 'इतनी देर! मेला कैसा था?\nSo late! How was the festival?', 'Your first five days are complete', true),
];

function resolve(value, gameState) {
  return typeof value === 'function' ? value({ state: gameState.snapshot }) : value;
}

function relationshipLabel(score) {
  if (score >= 5) return 'Friend';
  if (score >= 3) return 'Friendly';
  if (score >= 1) return 'Acquaintance';
  return 'New face';
}

export function createQuestController({
  npcs,
  marker,
  ui,
  gameState,
  onDialogueChange,
  onDayComplete,
  onDayStart,
}) {
  let questIndex = Math.min(gameState.snapshot.questIndex, QUESTS.length);
  let stepIndex = 0;
  let activeNpc = null;
  let phase = 'idle';
  let selectedChoice = null;
  let completed = gameState.snapshot.complete || questIndex >= QUESTS.length;
  let pausedForDay = gameState.snapshot.awaitingDay;

  function quest() {
    return QUESTS[Math.min(questIndex, QUESTS.length - 1)];
  }

  function targetNpc() {
    return npcs.find((npc) => npc.id === quest()?.target);
  }

  function updateQuestUI() {
    if (completed && !pausedForDay) {
      ui.questKicker.textContent = 'First five days complete';
      ui.questTitle.textContent = 'Nimbu Nagar feels like home';
      ui.questCopy.textContent = 'The railway still runs, your friends remember you, and the whole globe remains open to explore.';
      ui.questHint.textContent = 'Explore freely · revisit friends · ride the railway';
      return;
    }
    if (pausedForDay) {
      const story = DAY_STORIES[Math.max(0, gameState.snapshot.day - 1)];
      ui.questKicker.textContent = completed ? 'First five days complete' : `Day ${story.day} complete`;
      ui.questTitle.textContent = completed ? 'Nimbu Nagar feels like home' : story.title;
      ui.questCopy.textContent = story.recap;
      ui.questHint.textContent = completed ? 'Explore freely · revisit friends · ride the railway' : 'Return to your room and begin the next morning';
      return;
    }
    const data = quest();
    ui.questKicker.textContent = data.kicker;
    ui.questTitle.textContent = data.title;
    ui.questCopy.textContent = data.copy;
    ui.questHint.textContent = data.hint;
  }

  function clearChoices() {
    ui.dialogueChoices.replaceChildren();
    ui.dialogue.classList.remove('dialogue--choosing');
  }

  function renderStep() {
    const step = quest().steps[stepIndex];
    phase = 'choosing';
    selectedChoice = null;
    ui.dialogueText.textContent = resolve(step.prompt, gameState);
    ui.dialogueNext.textContent = 'Choose 1, 2 or 3';
    clearChoices();
    ui.dialogue.classList.add('dialogue--choosing');

    step.choices.forEach((choice, index) => {
      const missing = (choice.requires ?? []).filter((item) => !gameState.hasItem(item));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dialogue__choice';
      button.disabled = missing.length > 0;
      button.innerHTML = `
        <span class="dialogue__choice-index">${index + 1}</span>
        <strong>${resolve(choice.hindi, gameState)}</strong>
        <small>${missing.length ? `Need: ${missing.join(', ')}` : resolve(choice.guide, gameState)}</small>
      `;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        choose(index);
      });
      ui.dialogueChoices.append(button);
    });
  }

  function beginDialogue(npc) {
    activeNpc = npc;
    stepIndex = 0;
    const score = gameState.relationship(npc.id);
    ui.dialogueName.textContent = `${npc.name} · ${relationshipLabel(score)}`;
    ui.dialogue.classList.add('dialogue--visible');
    ui.prompt.classList.remove('interaction-prompt--visible');
    npc.facePlayer(ui.player.worldPosition);
    onDialogueChange(true);
    renderStep();
  }

  function closeDialogue() {
    clearChoices();
    ui.dialogue.classList.remove('dialogue--visible');
    activeNpc?.resetFacing();
    activeNpc = null;
    phase = 'idle';
    onDialogueChange(false);
  }

  function finishQuest() {
    const finishedQuest = quest();
    closeDialogue();
    gameState.applyEffects(finishedQuest.effects);
    questIndex += 1;
    gameState.setQuestIndex(questIndex);

    if (finishedQuest.dayEnd) {
      completed = Boolean(finishedQuest.final || questIndex >= QUESTS.length);
      pausedForDay = true;
      marker.hide();
      gameState.completeDay(finishedQuest.day, completed);
      updateQuestUI();
      ui.showToast(finishedQuest.nextToast);
      onDayComplete(DAY_STORIES[finishedQuest.day - 1], completed);
      return;
    }

    marker.attachTo(targetNpc());
    updateQuestUI();
    ui.showToast(finishedQuest.nextToast);
  }

  function choose(index) {
    if (!activeNpc || phase !== 'choosing') return false;
    const step = quest().steps[stepIndex];
    const choice = step.choices[index];
    if (!choice || (choice.requires ?? []).some((item) => !gameState.hasItem(item))) return false;
    selectedChoice = choice;
    phase = 'feedback';
    if (!choice.retry) gameState.applyEffects(choice.effects);
    activeNpc.react?.(choice.retry ? 'confused' : 'happy');
    ui.playChoice?.();
    clearChoices();
    ui.dialogueText.textContent = resolve(choice.feedback, gameState);
    ui.dialogueNext.textContent = choice.retry ? 'E / click to try again' : 'E / click to continue';
    return true;
  }

  function advanceDialogue() {
    if (!activeNpc || phase === 'choosing') return false;
    if (selectedChoice?.retry) {
      renderStep();
      return true;
    }
    stepIndex += 1;
    if (stepIndex < quest().steps.length) {
      renderStep();
      return true;
    }
    finishQuest();
    return true;
  }

  function interact() {
    if (activeNpc) return advanceDialogue();
    if (completed || pausedForDay) return false;
    const target = targetNpc();
    if (target.worldPosition.distanceTo(ui.player.worldPosition) <= 2.35) {
      beginDialogue(target);
      return true;
    }
    return false;
  }

  function update() {
    if (activeNpc || completed || pausedForDay) return;
    const target = targetNpc();
    const visible = target.worldPosition.distanceTo(ui.player.worldPosition) <= 2.35;
    ui.prompt.classList.toggle('interaction-prompt--visible', visible);
    if (visible) ui.promptText.textContent = `Talk to ${target.name}`;
  }

  function init() {
    if (completed || pausedForDay) marker.hide();
    else marker.attachTo(targetNpc());
    updateQuestUI();
  }

  function startNextDay() {
    if (!pausedForDay) return false;
    if (completed) {
      gameState.startNextDay();
      pausedForDay = false;
      updateQuestUI();
      return true;
    }
    gameState.startNextDay();
    pausedForDay = false;
    marker.attachTo(targetNpc());
    updateQuestUI();
    onDayStart(gameState.snapshot.day);
    ui.showToast(`Day ${gameState.snapshot.day} — ${gameState.dayStory.title}`);
    return true;
  }

  function showPendingDayComplete() {
    if (!pausedForDay) return;
    onDayComplete(DAY_STORIES[gameState.snapshot.day - 1], completed);
  }

  return {
    init,
    update,
    interact,
    choose,
    startNextDay,
    showPendingDayComplete,
    get isChoosing() { return phase === 'choosing'; },
    get dialogueActive() { return Boolean(activeNpc); },
    get complete() { return completed; },
    get pausedForDay() { return pausedForDay; },
    get questIndex() { return questIndex; },
    get totalQuests() { return QUESTS.length; },
    get targetWorldPosition() { return completed || pausedForDay ? null : targetNpc().worldPosition; },
    get targetName() { return completed || pausedForDay ? '' : targetNpc().name; },
    get targetId() { return completed || pausedForDay ? '' : quest().target; },
    get targetLocation() { return completed || pausedForDay ? '' : quest().location; },
  };
}
