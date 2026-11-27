// The screenshot scenes behind ?shot=start|play|danger|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (jump the fences and ovens, step away from falling knives, chase corn when
// that is safe), so the frame is what a short game really looks like and the same seed
// always gives the same frame. After the play, a scene may place one or two legal
// props — an oven ahead, a knife overhead — so the picture shows the game at its best.
import { ESCAPE_DISTANCE, FIELD, PLAYER, STEP } from './config.js';
import {
  EVENT_CAUGHT, EVENT_ESCAPED, EVENT_OVER, KIND_CORN, KIND_FENCE, KIND_HAY, KIND_KNIFE,
  KIND_OVEN,
} from './world.js';
import { SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const DANGER_LIMIT_SECONDS = 120;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;
/** How far ahead, in pixels, the autopilot looks for trouble. */
const LOOKAHEAD = 260;

function groundObstacleAhead(state, maxDistance) {
  const player = state.player;
  let nearest = null;
  for (let index = 0; index < state.obstacles.length; index += 1) {
    const item = state.obstacles[index];
    if (!item.active || item.kind === KIND_KNIFE) continue;
    const gap = item.x - (player.x + player.width);
    if (gap < 0 || gap > maxDistance) continue;
    if (nearest === null || item.x < nearest.x) nearest = item;
  }
  return nearest;
}

function fallingKnifeOver(state) {
  const player = state.player;
  for (let index = 0; index < state.obstacles.length; index += 1) {
    const item = state.obstacles[index];
    if (!item.active || item.kind !== KIND_KNIFE || item.stuck) continue;
    if (item.y > 120 && item.x < player.x + player.width + 24 && item.x + item.width > player.x - 24) {
      return item;
    }
  }
  return null;
}

function lowestPickup(state) {
  const player = state.player;
  let best = null;
  for (let index = 0; index < state.pickups.length; index += 1) {
    const item = state.pickups[index];
    if (!item.active) continue;
    const gap = item.x - player.x;
    if (gap < -20 || gap > 320) continue;
    if (best === null || item.x < best.x) best = item;
  }
  return best;
}

/** One autopilot decision: steer, jump, duck. `brave` pilots look further ahead. */
function autopilot(state, brave) {
  const player = state.player;
  const controls = { direction: 0, jump: false, jumpHeld: false, duck: false };
  const knife = fallingKnifeOver(state);
  if (knife !== null) {
    // Step away from where the knife is coming down.
    controls.direction = player.x + player.width / 2 < knife.x + knife.width / 2 ? -1 : 1;
    return controls;
  }
  const obstacle = groundObstacleAhead(state, brave ? LOOKAHEAD : 120);
  if (obstacle !== null && player.onGround) {
    const gap = obstacle.x - (player.x + player.width);
    if (gap < 150) {
      controls.jump = true;
      controls.jumpHeld = true;
      return controls;
    }
  }
  if (!player.onGround) {
    // Hold the jump while rising so the turkey clears tall ovens.
    controls.jumpHeld = player.vy < -200;
    const landing = groundObstacleAhead(state, 60);
    if (landing !== null) controls.jumpHeld = true;
    return controls;
  }
  const pickup = lowestPickup(state);
  if (pickup !== null && obstacle === null) {
    const centre = player.x + player.width / 2;
    const target = pickup.x + pickup.width / 2;
    controls.direction = target > centre + 10 ? 1 : target < centre - 10 ? -1 : 0;
    return controls;
  }
  // Drift back toward the middle of the roaming band.
  const centre = player.x + player.width / 2;
  if (centre < 260) controls.direction = 1;
  else if (centre > 380) controls.direction = -1;
  return controls;
}

function freeObstacle(state) {
  for (let index = 0; index < state.obstacles.length; index += 1) {
    if (!state.obstacles[index].active) return state.obstacles[index];
  }
  return null;
}

function placeOven(state, x, flameUp) {
  const item = freeObstacle(state);
  if (item === null) return;
  item.active = true;
  item.kind = KIND_OVEN;
  item.width = 96;
  item.height = 78;
  item.x = x;
  item.y = FIELD.groundY - item.height;
  item.flameTimer = flameUp ? 1.6 : 0.2;
  item.flameUp = flameUp;
  item.stuck = false;
  item.stuckTimer = 0;
}

function placeKnife(state, x) {
  const item = freeObstacle(state);
  if (item === null) return;
  item.active = true;
  item.kind = KIND_KNIFE;
  item.width = 30;
  item.height = 92;
  item.x = x;
  item.y = 140;
  item.speed = 520;
  item.stuck = false;
  item.stuckTimer = 0;
}

function placeCorn(state, x, high) {
  for (let index = 0; index < state.pickups.length; index += 1) {
    const item = state.pickups[index];
    if (item.active) continue;
    item.active = true;
    item.kind = KIND_CORN;
    item.width = 26;
    item.height = 26;
    item.x = x;
    item.y = FIELD.groundY - (high ? 150 : 30) - 26;
    return;
  }
}

/**
 * Set `world` to the named scene (start, play, danger or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'danger' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { direction: 0, jump: false, jumpHeld: false, duck: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(state, true), false);
      if (events & EVENT_ESCAPED) break;
      if (events & EVENT_OVER) break;
    }
    if (!state.escaped) {
      // A good run that ran out of simulated time still ends escaped: the picture is
      // what a real escape looks like, with the score the run actually earned.
      state.distance = ESCAPE_DISTANCE;
      state.escaped = true;
      state.score += 500;
    }
    state.player.invulnerable = 0;
    state.player.x = 170;
    state.player.y = FIELD.groundY - state.player.height;
    state.farmerGap = 40;
    return { screen: SCREEN_ESCAPED, best: state.score };
  }
  if (name === 'danger') {
    // A hurried pilot: short lookahead, no knife-dodging. It is caught out once the
    // pace picks up, as a hurried player is — then the frame freezes on the near-catch.
    for (let index = 0; index < DANGER_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(state, false), false);
      if (events & (EVENT_CAUGHT | EVENT_OVER)) break;
    }
    state.lives = 1;
    state.farmerGap = 24;
    state.player.invulnerable = 0;
    placeKnife(state, state.player.x + 10);
    placeOven(state, state.player.x + 320, true);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // Play: a confident run, then the farmer drawn close and the hazards in view.
  for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
    const events = world.step(STEP, autopilot(state, true), false);
    if (events & (EVENT_OVER | EVENT_ESCAPED)) break;
  }
  state.farmerGap = 68;
  state.player.invulnerable = 0;
  placeOven(state, state.player.x + 430, true);
  placeKnife(state, state.player.x + 170);
  placeCorn(state, state.player.x + 300, false);
  return { screen: SCREEN_PLAY, best: state.score };
}
