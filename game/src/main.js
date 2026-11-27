// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, caught and escaped.
// Sounds are wired to the world's events: jumps, pickups, hits, the oven's roar, the
// farmer's grab, and the escape fanfare.
//
// ?seed=N fixes the run's pattern. ?shot=start|play|danger|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. window.__turkeyRun exposes the live state for playtesting.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  createWorld, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_FEATHER, EVENT_FLAME, EVENT_HIT,
  EVENT_LAND, EVENT_OVER, EVENT_PICKUP,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import {
  createRenderer, SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.resume();
    audio.gobble();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Escape at 2000 metres.`);
  }

  function endGame(escaped) {
    if (escaped) {
      screen = SCREEN_ESCAPED;
      audio.escape();
      announce(`Escaped! Score ${world.state.score}. Best ${best}.`);
    } else {
      screen = SCREEN_OVER;
      audio.caught();
      announce(`Caught for dinner. Score ${world.state.score}. Best ${best}.`);
    }
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_ESCAPED)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function playSounds(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_FEATHER) audio.feather();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_LAND) audio.land();
    if (events & EVENT_FLAME) audio.oven();
    if (events & EVENT_CAUGHT) audio.knife();
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { direction: 0, jump: false, jumpHeld: false, duck: false }, true);
      return;
    }
    const jump = (actions & ACTION_CONFIRM) !== 0;
    const events = world.step(STEP, {
      direction: input.direction(),
      jump,
      jumpHeld: input.jumpHeld(),
      duck: input.duckHeld(),
    }, false);
    playSounds(events);
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_CAUGHT) {
      announce(world.state.lives === 1 ? 'The farmer grabbed you! 1 life left.' : `The farmer grabbed you! ${world.state.lives} lives left.`);
    } else if (events & EVENT_HIT) {
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now);
  }

  // Leaving the tab pauses a running game rather than letting knives fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A small live hook for playtesting: score, distance, lives and the screen.
  window.__turkeyRun = {
    state: () => world.state,
    screen: () => screen,
    best: () => best,
  };

  announce('Turkey Run. Press Space or click to run for it.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
