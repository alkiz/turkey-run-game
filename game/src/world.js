// The game's rules and state, with no drawing and no browser in it: the turkey that
// auto-runs to the right, the farmer chasing from behind, the obstacles and pickups
// scrolling in, collisions, score, distance, lives and stages. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react without
// the world knowing about screens or sound. Nothing here allocates after createWorld
// returns: obstacles and pickups live in pools allocated once, at boot.
import {
  CORN, ESCAPE_DISTANCE, FARMER, FEATHER, FIELD, FENCE, HAY, KNIFE, LEVEL, LIVES,
  OVEN, PLAYER, POOL_SIZE, PUMPKIN, PX_PER_METRE, SCORE, SPEED, STAGES,
} from './config.js';

export const KIND_FENCE = 0;
export const KIND_HAY = 1;
export const KIND_OVEN = 2;
export const KIND_KNIFE = 3;
export const KIND_CORN = 4;
export const KIND_PUMPKIN = 5;
export const KIND_FEATHER = 6;

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_OVER = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_LAND = 32;
export const EVENT_FEATHER = 64;
export const EVENT_FLAME = 128;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function stageFor(distance) {
  for (let index = STAGES.length - 1; index >= 0; index -= 1) {
    if (distance >= STAGES[index].from) return STAGES[index];
  }
  return STAGES[0];
}

export function createWorld(random) {
  const player = {
    x: 220, y: FIELD.groundY - PLAYER.height, width: PLAYER.width, height: PLAYER.height,
    vy: 0, onGround: true, ducking: false, invulnerable: 0, runPhase: 0,
  };
  const obstacles = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    obstacles.push({
      active: false, kind: KIND_FENCE, x: 0, y: 0, width: 0, height: 0,
      speed: 0, flameTimer: 0, flameUp: false, stuck: false, stuckTimer: 0,
    });
  }
  const pickups = [];
  for (let index = 0; index < POOL_SIZE / 2; index += 1) {
    pickups.push({ active: false, kind: KIND_CORN, x: 0, y: 0, width: 0, height: 0 });
  }
  const state = {
    player, obstacles, pickups,
    score: 0, scoreCarry: 0, lives: LIVES, level: 1, elapsed: 0,
    distance: 0, farmerGap: FARMER.startGap, escaped: false, over: false,
    stage: STAGES[0], scrollX: 0,
    fenceTimer: FENCE.interval, hayTimer: HAY.interval * 1.6, ovenTimer: OVEN.interval,
    knifeTimer: KNIFE.interval * 1.5, cornTimer: CORN.interval, pumpkinTimer: PUMPKIN.interval,
    featherTimer: FEATHER.interval,
  };

  function reset() {
    player.x = 220;
    player.y = FIELD.groundY - PLAYER.height;
    player.vy = 0;
    player.onGround = true;
    player.ducking = false;
    player.invulnerable = 0;
    player.runPhase = 0;
    for (const item of obstacles) item.active = false;
    for (const item of pickups) item.active = false;
    state.score = 0;
    state.scoreCarry = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.distance = 0;
    state.farmerGap = FARMER.startGap;
    state.escaped = false;
    state.over = false;
    state.stage = STAGES[0];
    state.scrollX = 0;
    state.fenceTimer = FENCE.interval;
    state.hayTimer = HAY.interval * 1.6;
    state.ovenTimer = OVEN.interval;
    state.knifeTimer = KNIFE.interval * 1.5;
    state.cornTimer = CORN.interval;
    state.pumpkinTimer = PUMPKIN.interval;
    state.featherTimer = FEATHER.interval;
  }

  function freeObstacle() {
    for (let index = 0; index < obstacles.length; index += 1) {
      if (!obstacles[index].active) return obstacles[index];
    }
    return null;
  }

  function freePickup() {
    for (let index = 0; index < pickups.length; index += 1) {
      if (!pickups[index].active) return pickups[index];
    }
    return null;
  }

  function spawnGround(kind, width, height) {
    const item = freeObstacle();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.width = width;
    item.height = height;
    item.x = FIELD.width + 40 + random() * 120;
    item.y = FIELD.groundY - height;
    item.speed = 0;
    item.flameTimer = 0;
    item.flameUp = false;
    item.stuck = false;
    item.stuckTimer = 0;
  }

  function spawnKnife() {
    const item = freeObstacle();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_KNIFE;
    item.width = KNIFE.width;
    item.height = KNIFE.height;
    // Aim near the turkey, sometimes wide: dodging is a real choice, not a guess.
    const aim = random() < 0.6 ? player.x + (random() * 160 - 60) : random() * (FIELD.width - KNIFE.width);
    item.x = Math.max(0, Math.min(FIELD.width - KNIFE.width, aim));
    item.y = -item.height;
    item.speed = KNIFE.fallSpeed + KNIFE.speedPerLevel * (state.level - 1) + random() * 60;
    item.stuck = false;
    item.stuckTimer = 0;
  }

  function spawnPickup(kind, size, heightAboveGround) {
    const item = freePickup();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.width = size;
    item.height = size;
    item.x = FIELD.width + 40 + random() * 80;
    item.y = FIELD.groundY - heightAboveGround - size;
  }

  function spawnCornArc() {
    const count = 2 + Math.floor(random() * 3);
    const high = random() < 0.4;
    for (let index = 0; index < count; index += 1) {
      const item = freePickup();
      if (item === null) return;
      item.active = true;
      item.kind = KIND_CORN;
      item.width = CORN.size;
      item.height = CORN.size;
      item.x = FIELD.width + 40 + index * 44;
      item.y = FIELD.groundY - (high ? 150 : 30) - CORN.size;
    }
  }

  function scrollSpeed() {
    return Math.min(SPEED.max, SPEED.base + SPEED.perLevel * (state.level - 1));
  }

  function loseGap(amount, events) {
    state.farmerGap -= amount;
    if (state.farmerGap > FARMER.catchGap) return events;
    // The farmer grabs the turkey: a life goes, and the turkey bursts away with a
    // feather's worth of panic — unless that was the last life.
    state.lives -= 1;
    if (state.lives <= 0) {
      state.over = true;
      return events | EVENT_CAUGHT | EVENT_OVER;
    }
    state.farmerGap = FARMER.startGap;
    player.invulnerable = Math.max(player.invulnerable, PLAYER.invulnerable);
    return events | EVENT_CAUGHT;
  }

  /**
   * One fixed step. `controls` is {direction, jump, jumpHeld, duck}: jump is true only
   * on the frame the jump key was pressed. With `harmless` set (the title screen's
   * backdrop) things scroll and fall but nothing touches the player and nothing scores.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    const speed = scrollSpeed();
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    state.scrollX += speed * dt;

    if (!harmless) {
      const metres = (speed * dt) / PX_PER_METRE;
      state.distance += metres;
      state.scoreCarry += metres * (SCORE.per10m / 10);
      if (state.scoreCarry >= 1) {
        const whole = Math.floor(state.scoreCarry);
        state.score += whole;
        state.scoreCarry -= whole;
      }
      state.farmerGap = Math.min(
        FARMER.maxGap,
        state.farmerGap + metres * (FARMER.cleanGainPer100m / 100),
      );
      state.stage = stageFor(state.distance);
      if (state.distance >= ESCAPE_DISTANCE && !state.escaped) {
        state.escaped = true;
        state.score += SCORE.escapeBonus;
        return events | EVENT_ESCAPED;
      }
    }

    // --- The turkey: steer, jump with a held key for extra height, duck to slide low. ---
    player.x = Math.min(
      PLAYER.maxX,
      Math.max(PLAYER.minX, player.x + controls.direction * PLAYER.runSpeed * dt),
    );
    player.ducking = controls.duck && player.onGround;
    player.height = player.ducking ? PLAYER.duckHeight : PLAYER.height;
    if (player.onGround) player.y = FIELD.groundY - player.height;
    if (controls.jump && player.onGround && !harmless) {
      player.vy = -PLAYER.jumpSpeed;
      player.onGround = false;
    }
    const gravityScale = controls.jumpHeld && player.vy < 0 ? 0.45 : 1;
    player.vy += PLAYER.gravity * gravityScale * dt;
    player.y += player.vy * dt;
    if (player.y >= FIELD.groundY - player.height) {
      if (!player.onGround && player.vy > 200 && !harmless) events |= EVENT_LAND;
      player.y = FIELD.groundY - player.height;
      player.vy = 0;
      player.onGround = true;
    }
    player.runPhase += dt * (player.onGround ? speed / 28 : 0);
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    // --- Spawning, on timers that tighten as the level rises. ---
    const levelScale = 1 - Math.min(0.45, (state.level - 1) * 0.05);
    state.fenceTimer -= dt;
    if (state.fenceTimer <= 0) {
      spawnGround(KIND_FENCE, FENCE.width, FENCE.height);
      state.fenceTimer = Math.max(FENCE.minInterval, FENCE.interval * levelScale) + random() * FENCE.intervalJitter;
    }
    state.hayTimer -= dt;
    if (state.hayTimer <= 0) {
      spawnGround(KIND_HAY, HAY.width, HAY.height);
      state.hayTimer = Math.max(HAY.minInterval, HAY.interval * levelScale) + random() * HAY.intervalJitter;
    }
    state.ovenTimer -= dt;
    if (state.ovenTimer <= 0 && state.level >= 2) {
      spawnGround(KIND_OVEN, OVEN.width, OVEN.height);
      state.ovenTimer = Math.max(OVEN.minInterval, OVEN.interval * levelScale) + random() * OVEN.intervalJitter;
    }
    state.knifeTimer -= dt;
    if (state.knifeTimer <= 0) {
      spawnKnife();
      state.knifeTimer = Math.max(KNIFE.minInterval, KNIFE.interval * levelScale) + random() * KNIFE.intervalJitter;
    }
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      spawnCornArc();
      state.cornTimer = CORN.interval + random() * CORN.intervalJitter;
    }
    state.pumpkinTimer -= dt;
    if (state.pumpkinTimer <= 0) {
      spawnPickup(KIND_PUMPKIN, PUMPKIN.size, 130 + random() * 60);
      state.pumpkinTimer = PUMPKIN.interval + random() * PUMPKIN.intervalJitter;
    }
    state.featherTimer -= dt;
    if (state.featherTimer <= 0) {
      spawnPickup(KIND_FEATHER, FEATHER.size, 90 + random() * 90);
      state.featherTimer = FEATHER.interval + random() * FEATHER.intervalJitter;
    }

    // --- Obstacles scroll in, knives fall, ovens breathe fire. ---
    for (let index = 0; index < obstacles.length; index += 1) {
      const item = obstacles[index];
      if (!item.active) continue;
      if (item.kind === KIND_KNIFE) {
        if (!item.stuck) {
          item.y += item.speed * dt;
          if (item.y >= FIELD.groundY - item.height * 0.35) {
            item.y = FIELD.groundY - item.height * 0.35;
            item.stuck = true;
            item.stuckTimer = KNIFE.stuckTime;
            if (!harmless) state.score += SCORE.dodgeKnife;
          }
        } else {
          item.stuckTimer -= dt;
          if (item.stuckTimer <= 0) item.active = false;
        }
        item.x -= speed * dt * 0.55;
      } else {
        item.x -= speed * dt;
        if (item.kind === KIND_OVEN) {
          const wasUp = item.flameUp;
          item.flameTimer += dt;
          const cycle = OVEN.flameDown + OVEN.flameUp;
          item.flameUp = (item.flameTimer % cycle) > OVEN.flameDown;
          if (item.flameUp && !wasUp && !harmless) events |= EVENT_FLAME;
        }
      }
      if (item.x + item.width < -20) item.active = false;
    }

    // --- Pickups scroll in. ---
    for (let index = 0; index < pickups.length; index += 1) {
      const item = pickups[index];
      if (!item.active) continue;
      item.x -= speed * dt;
      if (item.x + item.width < -20) item.active = false;
    }

    if (harmless) return events;

    // --- Collisions: stumbling costs farmer gap, pickups pay. ---
    const body = { x: player.x, y: player.y, width: player.width, height: player.height };
    for (let index = 0; index < obstacles.length; index += 1) {
      const item = obstacles[index];
      if (!item.active) continue;
      if (item.kind === KIND_OVEN && item.flameUp) {
        // The flame column above the oven burns too.
        const flame = { x: item.x + 8, y: item.y - 150, width: item.width - 16, height: 150 };
        if (overlaps(flame, body) && player.invulnerable === 0) {
          item.active = false;
          events = loseGap(FARMER.stumbleLoss, events | EVENT_HIT);
          if (events & EVENT_OVER) return events;
          player.invulnerable = PLAYER.invulnerable;
          continue;
        }
      }
      if (!overlaps(item, body)) continue;
      if (player.invulnerable > 0) continue;
      if (item.kind === KIND_KNIFE) {
        item.active = false;
        events = loseGap(FARMER.knifeLoss, events | EVENT_HIT);
      } else {
        item.active = false;
        events = loseGap(FARMER.stumbleLoss, events | EVENT_HIT);
      }
      player.invulnerable = PLAYER.invulnerable;
      if (events & EVENT_OVER) return events;
    }
    for (let index = 0; index < pickups.length; index += 1) {
      const item = pickups[index];
      if (!item.active || !overlaps(item, body)) continue;
      item.active = false;
      if (item.kind === KIND_CORN) {
        state.score += CORN.points;
        events |= EVENT_PICKUP;
      } else if (item.kind === KIND_PUMPKIN) {
        state.score += PUMPKIN.points;
        events |= EVENT_PICKUP;
      } else {
        state.score += FEATHER.points;
        state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + FARMER.featherGain);
        player.invulnerable = Math.max(player.invulnerable, FEATHER.shieldSeconds);
        events |= EVENT_FEATHER;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, scrollSpeed };
}
