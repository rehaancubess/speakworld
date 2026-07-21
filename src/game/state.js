const SAVE_KEY = 'nimbu-nagar-first-days-v2';

export const DAY_STORIES = [
  {
    day: 1,
    title: 'Arrival',
    subtitle: 'A room, a key, and your first evening in Nimbu Nagar',
    startMinutes: 15 * 60 + 20,
    endMinutes: 21 * 60 + 10,
    recap: 'You found Sundar Van, carried your luggage through town, and checked into Leela’s guesthouse.',
  },
  {
    day: 2,
    title: 'Getting connected',
    subtitle: 'Breakfast, identification, and a working local phone',
    startMinutes: 7 * 60 + 30,
    endMinutes: 20 * 60 + 35,
    recap: 'You ordered breakfast, recovered your passport, chose a mobile plan, and activated your first local number.',
  },
  {
    day: 3,
    title: 'Learning the city',
    subtitle: 'Timetables, platforms, and finding your own way home',
    startMinutes: 8 * 60 + 15,
    endMinutes: 21 * 60 + 25,
    recap: 'You read the railway, asked another passenger for help, crossed the globe, and returned after dark.',
  },
  {
    day: 4,
    title: 'Making a home',
    subtitle: 'A landlord, a broken fan, and neighbours who can help',
    startMinutes: 9 * 60,
    endMinutes: 20 * 60 + 50,
    recap: 'You explained a household problem, found the correct part, and solved it with help from your neighbours.',
  },
  {
    day: 5,
    title: 'Festival night',
    subtitle: 'Preparations, new friends, lights, and a place in the community',
    startMinutes: 10 * 60 + 30,
    endMinutes: 22 * 60,
    recap: 'You helped prepare Suraj Mela, shared food with friends, and ended your first week beneath the festival lights.',
  },
];

const DEFAULT_STATE = {
  version: 2,
  day: 1,
  minutes: DAY_STORIES[0].startMinutes,
  money: 2800,
  inventory: ['Suitcase'],
  contacts: [],
  relationships: {},
  memories: {},
  messages: [
    { from: 'Nimbu Nagar', text: 'Welcome. Your first task is to find the guesthouse.' },
  ],
  journal: ['Arrived in Nimbu Nagar with ₹2,800 and one very heavy suitcase.'],
  questIndex: 0,
  awaitingDay: false,
  complete: false,
  playerNormal: null,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!parsed || parsed.version !== DEFAULT_STATE.version) return clone(DEFAULT_STATE);
    return {
      ...clone(DEFAULT_STATE),
      ...parsed,
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
      relationships: parsed.relationships ?? {},
      memories: parsed.memories ?? {},
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      journal: Array.isArray(parsed.journal) ? parsed.journal : [],
    };
  } catch {
    return clone(DEFAULT_STATE);
  }
}

export function formatClock(minutes) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function timePeriod(minutes) {
  const hour = minutes / 60;
  if (hour < 5.4) return 'night';
  if (hour < 7.2) return 'morning';
  if (hour < 16.8) return 'day';
  if (hour < 19.1) return 'evening';
  return 'night';
}

export function createGameState() {
  let data = readSave();
  const listeners = new Set();
  let clockAccumulator = 0;
  let saveAccumulator = 0;

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // The adventure remains playable when storage is unavailable.
    }
  }

  function notify() {
    const snapshot = clone(data);
    listeners.forEach((listener) => listener(snapshot));
  }

  function mutate(callback, shouldNotify = true) {
    callback(data);
    save();
    if (shouldNotify) notify();
  }

  function addUnique(list, value) {
    if (value && !list.includes(value)) list.push(value);
  }

  function applyEffects(effects = {}) {
    mutate((state) => {
      if (Number.isFinite(effects.money)) state.money = Math.max(0, state.money + effects.money);
      (effects.addItems ?? []).forEach((item) => addUnique(state.inventory, item));
      if (effects.removeItems?.length) {
        state.inventory = state.inventory.filter((item) => !effects.removeItems.includes(item));
      }
      (effects.addContacts ?? []).forEach((contact) => addUnique(state.contacts, contact));
      Object.entries(effects.relationships ?? {}).forEach(([id, amount]) => {
        state.relationships[id] = Math.max(-3, Math.min(8, (state.relationships[id] ?? 0) + amount));
      });
      Object.assign(state.memories, effects.memories ?? {});
      const messages = effects.messages ?? [];
      messages.forEach((message) => state.messages.unshift(message));
      if (state.messages.length > 16) state.messages.length = 16;
      const journalEntries = Array.isArray(effects.journal)
        ? effects.journal
        : effects.journal ? [effects.journal] : [];
      journalEntries.forEach((entry) => addUnique(state.journal, entry));
      if (Number.isFinite(effects.time)) state.minutes = Math.min(22 * 60 + 45, state.minutes + effects.time);
      if (Number.isFinite(effects.setTime)) state.minutes = effects.setTime;
    });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(clone(data));
      return () => listeners.delete(listener);
    },
    get snapshot() {
      return clone(data);
    },
    get dayStory() {
      return DAY_STORIES[data.day - 1] ?? DAY_STORIES.at(-1);
    },
    get period() {
      return timePeriod(data.minutes);
    },
    hasItem(item) {
      return data.inventory.includes(item);
    },
    relationship(id) {
      return data.relationships[id] ?? 0;
    },
    memory(key) {
      return data.memories[key];
    },
    applyEffects,
    setQuestIndex(questIndex) {
      mutate((state) => { state.questIndex = questIndex; });
    },
    setTime(minutes) {
      mutate((state) => { state.minutes = Math.max(0, Math.min(22 * 60 + 45, minutes)); });
    },
    completeDay(day, finalDay = false) {
      const story = DAY_STORIES[day - 1];
      mutate((state) => {
        state.minutes = story?.endMinutes ?? state.minutes;
        state.awaitingDay = true;
        state.complete = finalDay;
        addUnique(state.journal, story?.recap);
      });
    },
    startNextDay() {
      mutate((state) => {
        if (state.complete) {
          state.awaitingDay = false;
          return;
        }
        state.day = Math.min(DAY_STORIES.length, state.day + 1);
        state.minutes = DAY_STORIES[state.day - 1].startMinutes;
        state.awaitingDay = false;
        state.messages.unshift({
          from: 'Today',
          text: DAY_STORIES[state.day - 1].subtitle,
        });
      });
    },
    setPlayerNormal(normal) {
      data.playerNormal = [normal.x, normal.y, normal.z];
      saveAccumulator += 1;
      if (saveAccumulator >= 5) {
        saveAccumulator = 0;
        save();
      }
    },
    update(delta, active = true) {
      if (!active || data.awaitingDay || data.complete) return;
      clockAccumulator += delta * 0.72;
      if (clockAccumulator < 1) return;
      const wholeMinutes = Math.floor(clockAccumulator);
      clockAccumulator -= wholeMinutes;
      data.minutes = Math.min(22 * 60 + 45, data.minutes + wholeMinutes);
      notify();
    },
    reset() {
      data = clone(DEFAULT_STATE);
      save();
      notify();
    },
  };
}
