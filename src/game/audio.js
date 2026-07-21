export function createAudioSystem() {
  let context = null;
  let master = null;
  let ambienceStarted = false;
  let nightAmount = 0;

  function ensureContext() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.12;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
  }

  function tone(frequency, duration = 0.12, volume = 0.22, type = 'sine', delay = 0) {
    ensureContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function startAmbience() {
    ensureContext();
    if (ambienceStarted) return;
    ambienceStarted = true;

    const droneGain = context.createGain();
    droneGain.gain.value = 0.06;
    droneGain.connect(master);
    [110, 165].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      const gain = context.createGain();
      gain.gain.value = index ? 0.18 : 0.26;
      oscillator.connect(gain);
      gain.connect(droneGain);
      oscillator.start();
    });

    const scheduleBird = () => {
      if (!context) return;
      if (nightAmount > 0.58) {
        tone(2300 + Math.random() * 650, 0.035, 0.022, 'square');
        tone(2500 + Math.random() * 500, 0.035, 0.018, 'square', 0.08);
      } else {
        tone(1250 + Math.random() * 500, 0.08, 0.045, 'sine');
        tone(1550 + Math.random() * 450, 0.07, 0.035, 'sine', 0.11);
      }
      window.setTimeout(scheduleBird, 3500 + Math.random() * 6500);
    };
    window.setTimeout(scheduleBird, 1800);
  }

  return {
    startAmbience,
    setNightAmount(amount) {
      nightAmount = amount;
    },
    click() {
      tone(520, 0.07, 0.16, 'triangle');
    },
    dialogue() {
      tone(330, 0.055, 0.1, 'triangle');
    },
    success() {
      tone(440, 0.16, 0.15, 'triangle');
      tone(660, 0.2, 0.14, 'triangle', 0.12);
      tone(880, 0.3, 0.12, 'sine', 0.26);
    },
  };
}
