// Every sound is synthesised with WebAudio: no audio files, no network, nothing to
// load. The context is created lazily on the first user gesture (browsers refuse
// audio before one), and M toggles mute. Each effect is a few oscillators or a short
// burst of filtered noise, kept quiet so it never startles.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function resume() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  /** A short tone that slides from one frequency to another. */
  function tone(from, to, seconds, type, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(1, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  /** A burst of noise through a low-pass filter: thuds, whooshes and the oven's roar. */
  function noise(seconds, filterFrom, filterTo, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrom, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterTo), start + seconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.8, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + seconds + 0.05);
  }

  return {
    resume,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** The turkey's happy gobble on the title screen and after an escape. */
    gobble() {
      tone(320, 180, 0.09, 'square');
      tone(420, 240, 0.09, 'square', 0.1);
      tone(300, 160, 0.14, 'square', 0.2);
    },
    jump() {
      tone(280, 620, 0.16, 'sine');
    },
    land() {
      noise(0.07, 500, 120);
    },
    pickup() {
      tone(660, 660, 0.07, 'triangle');
      tone(990, 990, 0.09, 'triangle', 0.07);
    },
    pumpkin() {
      tone(523, 523, 0.08, 'triangle');
      tone(659, 659, 0.08, 'triangle', 0.08);
      tone(784, 784, 0.12, 'triangle', 0.16);
    },
    feather() {
      tone(880, 1320, 0.12, 'sine');
      tone(1174, 1760, 0.14, 'sine', 0.1);
      tone(1568, 2093, 0.18, 'sine', 0.2);
    },
    hit() {
      noise(0.18, 900, 100);
      tone(160, 60, 0.22, 'sawtooth');
    },
    knife() {
      noise(0.12, 4000, 800);
      tone(900, 300, 0.1, 'square');
    },
    oven() {
      noise(0.5, 300, 2400);
    },
    caught() {
      tone(392, 392, 0.16, 'triangle');
      tone(330, 330, 0.16, 'triangle', 0.16);
      tone(262, 196, 0.4, 'triangle', 0.32);
    },
    escape() {
      tone(523, 523, 0.12, 'triangle');
      tone(659, 659, 0.12, 'triangle', 0.12);
      tone(784, 784, 0.12, 'triangle', 0.24);
      tone(1046, 1046, 0.3, 'triangle', 0.36);
    },
    click() {
      tone(520, 520, 0.05, 'sine');
    },
  };
}
