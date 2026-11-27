// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Everything is drawn from flat canvas shapes — the turkey, the
// farmer with his pitchfork, the oven, the knives, the farm, the barn and the kitchen —
// in one coherent autumn palette. Text that holds a number is rebuilt only when the
// number changes, so a frame allocates nothing.
import { ESCAPE_DISTANCE, FARMER, FIELD, FONT, LIVES, PALETTE, PLAYER } from './config.js';
import {
  KIND_CORN, KIND_FEATHER, KIND_FENCE, KIND_HAY, KIND_KNIFE, KIND_OVEN, KIND_PUMPKIN,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_ESCAPED = 'escaped';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const HEART_SIZE = 22;
const HEART_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const distanceLabel = cachedLabel('');
  const levelLabel = cachedLabel('Level ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function ellipse(x, y, rx, ry, color) {
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
  }

  function rect(x, y, width, height, color) {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }

  // --- The world behind the action: sky, hills, and the stage's own scenery. ---

  function drawSky(stage) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    if (stage.name === 'The Kitchen') {
      gradient.addColorStop(0, '#2a1f1c');
      gradient.addColorStop(1, '#4a2c1e');
    } else if (stage.name === 'The Barn') {
      gradient.addColorStop(0, '#241a12');
      gradient.addColorStop(1, '#4a2c14');
    } else {
      gradient.addColorStop(0, PALETTE.skyTop);
      gradient.addColorStop(0.55, PALETTE.skyMid);
      gradient.addColorStop(1, PALETTE.skyLow);
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    if (stage.name === 'Farmyard') {
      ellipse(850, 100, 48, 48, PALETTE.sun);
      ellipse(850, 100, 62, 62, 'rgba(255, 217, 122, 0.25)');
    }
  }

  function drawParallax(scrollX, stage) {
    // Far hills.
    context.fillStyle = PALETTE.hillFar;
    for (let hill = 0; hill < 4; hill += 1) {
      const base = ((hill * 420 - scrollX * 0.15) % 1680 + 1680) % 1680 - 200;
      context.beginPath();
      context.ellipse(base + 200, FIELD.groundY + 4, 260, 90, 0, Math.PI, 0);
      context.fill();
    }
    if (stage.name === 'Farmyard') {
      // A red farmhouse and bare autumn trees drift past, slower than the ground.
      for (let slot = 0; slot < 3; slot += 1) {
        const x = ((slot * 640 - scrollX * 0.35) % 1920 + 1920) % 1920 - 240;
        rect(x, FIELD.groundY - 150, 150, 150, PALETTE.barnWall);
        context.beginPath();
        context.moveTo(x - 14, FIELD.groundY - 150);
        context.lineTo(x + 75, FIELD.groundY - 210);
        context.lineTo(x + 164, FIELD.groundY - 150);
        context.closePath();
        context.fillStyle = PALETTE.barnWood;
        context.fill();
        rect(x + 58, FIELD.groundY - 92, 34, 92, PALETTE.barnWood);
        // Bare tree.
        context.strokeStyle = PALETTE.hillNear;
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(x + 230, FIELD.groundY);
        context.lineTo(x + 230, FIELD.groundY - 130);
        context.lineTo(x + 200, FIELD.groundY - 170);
        context.moveTo(x + 230, FIELD.groundY - 130);
        context.lineTo(x + 262, FIELD.groundY - 168);
        context.stroke();
      }
    } else if (stage.name === 'The Barn') {
      // Wooden beams across the barn's inside wall.
      rect(0, 60, FIELD.width, 26, PALETTE.barnWood);
      rect(0, 300, FIELD.width, 22, PALETTE.barnWood);
      for (let beam = 0; beam < 6; beam += 1) {
        const x = ((beam * 260 - scrollX * 0.3) % 1560 + 1560) % 1560 - 140;
        rect(x, 60, 18, FIELD.groundY - 60, PALETTE.barnWood);
      }
      // Hay bales stacked at the back.
      for (let slot = 0; slot < 3; slot += 1) {
        const x = ((slot * 520 - scrollX * 0.45) % 1560 + 1560) % 1560 - 120;
        ellipse(x, FIELD.groundY - 26, 70, 26, PALETTE.hay);
      }
    } else {
      // The kitchen: tiled wall, a table, hanging pans.
      rect(0, 0, FIELD.width, 14, PALETTE.kitchenTile);
      for (let tile = 0; tile < 16; tile += 1) rect(tile * 80, 120, 76, 4, PALETTE.kitchenTile);
      for (let slot = 0; slot < 4; slot += 1) {
        const x = ((slot * 380 - scrollX * 0.3) % 1520 + 1520) % 1520 - 100;
        ellipse(x, 150, 26, 8, '#2a2a30');
        rect(x - 2, 150, 4, 26, '#2a2a30');
        ellipse(x, 184, 22, 22, '#3a3a42');
      }
      rect(0, FIELD.groundY - 96, FIELD.width, 16, '#5e3a22');
    }
    // The ground itself.
    context.fillStyle = stage.name === 'The Kitchen' ? '#4a3226' : PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = stage.name === 'The Kitchen' ? '#5e4028' : PALETTE.groundTop;
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
    // Grass tufts / floor boards rushing past.
    context.fillStyle = stage.name === 'Farmyard' ? '#8a5a24' : 'rgba(0, 0, 0, 0.25)';
    for (let mark = 0; mark < 14; mark += 1) {
      const x = ((mark * 110 - scrollX) % 1540 + 1540) % 1540 - 130;
      context.fillRect(x, FIELD.groundY + 26 + ((mark * 37) % 30), 26, 4);
    }
  }

  // --- The actors. ---

  /** The turkey: a flat brown body under a fan of three tail colours, running legs that
   *  cycle with runPhase, a small head and a red wattle. Ducks flatten it; in the air
   *  the wings spread and the legs tuck. */
  function drawTurkey(player, now) {
    const cx = player.x + player.width / 2;
    const base = player.y + player.height;
    const legSwing = player.onGround ? Math.sin(player.runPhase * 6) * 10 : 0;
    const squash = player.ducking ? 0.55 : 1;
    // Legs.
    context.strokeStyle = PALETTE.beak;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(cx - 10, base - 6);
    context.lineTo(cx - 10 + legSwing, base + 2);
    context.moveTo(cx + 10, base - 6);
    context.lineTo(cx + 10 - legSwing, base + 2);
    context.stroke();
    // Tail fan.
    for (let index = 0; index < 3; index += 1) {
      context.fillStyle = PALETTE.tail[index];
      context.beginPath();
      context.arc(cx - 8, base - 12 * squash, player.width * (0.6 - index * 0.11), Math.PI * 1.05, Math.PI * 1.95);
      context.fill();
    }
    // Body, with a dark outline so it reads against the autumn ground.
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.ellipse(cx, base - 14 * squash, player.width * 0.34, player.height * 0.62 * squash, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#5e3a1e';
    context.lineWidth = 3;
    context.stroke();
    ellipse(cx + 6, base - 10 * squash, player.width * 0.2, player.height * 0.4 * squash, PALETTE.playerBelly);
    // Wing: spread in the air, folded on the ground.
    context.fillStyle = PALETTE.tail[0];
    context.beginPath();
    context.ellipse(cx - 4, base - 16 * squash, 16, player.onGround ? 8 : 16, player.onGround ? -0.4 : -1.1, 0, Math.PI * 2);
    context.fill();
    // Head, beak, wattle, eye.
    const headY = base - 34 * squash - (player.ducking ? 0 : 8);
    ellipse(cx + 16, headY, 11, 11, PALETTE.head);
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(cx + 24, headY - 2);
    context.lineTo(cx + 36, headY + 3);
    context.lineTo(cx + 24, headY + 6);
    context.closePath();
    context.fill();
    rect(cx + 24, headY + 4, 5, 9, PALETTE.wattle);
    ellipse(cx + 19, headY - 3, 2.4, 2.4, '#1a1210');
    void now;
  }

  /** The farmer, chasing from the left with his pitchfork: straw hat, blue shirt,
   *  overalls, angry brows. He only shows when the gap is small enough to see him. */
  function drawFarmer(x, runPhase) {
    const base = FIELD.groundY;
    const legSwing = Math.sin(runPhase * 7) * 12;
    const w = 84;
    const h = 118;
    // Legs.
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(x + w / 2 - 12, base - 52);
    context.lineTo(x + w / 2 - 12 + legSwing, base);
    context.moveTo(x + w / 2 + 12, base - 52);
    context.lineTo(x + w / 2 + 12 - legSwing, base);
    context.stroke();
    // Body: overalls over a blue shirt.
    rect(x + 12, base - h + 34, w - 24, 56, PALETTE.farmerShirt);
    rect(x + 16, base - h + 62, w - 32, 34, PALETTE.farmerOveralls);
    rect(x + 20, base - h + 34, 8, 30, PALETTE.farmerOveralls);
    rect(x + w - 28, base - h + 34, 8, 30, PALETTE.farmerOveralls);
    // Arms: one pumping, one holding the pitchfork.
    context.strokeStyle = PALETTE.farmerShirt;
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(x + 14, base - h + 48);
    context.lineTo(x - 6, base - h + 66 + legSwing * 0.5);
    context.stroke();
    // Pitchfork.
    context.strokeStyle = PALETTE.knife;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x + w - 4, base - h + 40);
    context.lineTo(x + w + 14, base - h - 26);
    context.stroke();
    context.beginPath();
    context.moveTo(x + w + 6, base - h - 26);
    context.lineTo(x + w + 2, base - h - 42);
    context.moveTo(x + w + 14, base - h - 26);
    context.lineTo(x + w + 14, base - h - 44);
    context.moveTo(x + w + 22, base - h - 26);
    context.lineTo(x + w + 26, base - h - 42);
    context.stroke();
    // Head with straw hat and angry brows.
    ellipse(x + w / 2, base - h + 16, 17, 17, PALETTE.farmerSkin);
    ellipse(x + w / 2, base - h + 2, 26, 7, PALETTE.farmerHat);
    rect(x + w / 2 - 16, base - h - 8, 32, 9, PALETTE.farmerHat);
    context.strokeStyle = '#1a1210';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x + w / 2 + 2, base - h + 12);
    context.lineTo(x + w / 2 + 12, base - h + 16);
    context.moveTo(x + w / 2 + 22, base - h + 12);
    context.lineTo(x + w / 2 + 12, base - h + 16);
    context.stroke();
    ellipse(x + w / 2 + 8, base - h + 20, 2, 2, '#1a1210');
    ellipse(x + w / 2 + 18, base - h + 20, 2, 2, '#1a1210');
  }

  // --- Obstacles and pickups. ---

  function drawFence(item) {
    context.fillStyle = PALETTE.fence;
    context.fillRect(item.x, item.y, 6, item.height);
    context.fillRect(item.x + item.width - 6, item.y, 6, item.height);
    context.fillRect(item.x - 4, item.y + 8, item.width + 8, 7);
    context.fillRect(item.x - 4, item.y + item.height - 18, item.width + 8, 7);
  }

  function drawHay(item) {
    ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, PALETTE.hay);
    context.strokeStyle = PALETTE.hayDark;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 3, item.height / 3, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 5, item.height / 5, 0, 0, Math.PI * 2);
    context.stroke();
  }

  /** The oven: a squat iron box with a door and chimney. When the flame is up, three
   *  tongues of fire roar from its top; just before it erupts, embers glow as a warning. */
  function drawOven(item, now) {
    const flicker = Math.sin(now / 90) * 6;
    rect(item.x, item.y, item.width, item.height, PALETTE.ovenBody);
    rect(item.x + 10, item.y + 8, 26, 10, PALETTE.ovenDoor);
    rect(item.x + item.width - 34, item.y + 8, 24, 10, PALETTE.ovenDoor);
    rect(item.x + 14, item.y + 26, item.width - 28, item.height - 34, PALETTE.ovenDoor);
    ellipse(item.x + item.width / 2, item.y + item.height / 2 + 6, 12, 12, '#1a1a20');
    rect(item.x + item.width - 30, item.y - 22, 18, 24, PALETTE.ovenBody);
    if (item.flameUp) {
      // A soft glow at the oven's mouth, then three tongues that lean and flicker.
      ellipse(item.x + item.width / 2, item.y - 4, item.width / 2, 10, 'rgba(255, 140, 26, 0.35)');
      for (let tongue = 0; tongue < 3; tongue += 1) {
        const fx = item.x + 14 + tongue * 32;
        const fh = 92 + flicker + tongue * 7;
        const lean = Math.sin(now / 160 + tongue * 1.7) * 8;
        context.fillStyle = PALETTE.flame[tongue % 3];
        context.beginPath();
        context.moveTo(fx, item.y);
        context.quadraticCurveTo(fx - 14, item.y - fh * 0.55, fx + 4 + lean, item.y - fh);
        context.quadraticCurveTo(fx + 8 + lean, item.y - fh * 0.4, fx + 20, item.y - fh * 0.75);
        context.quadraticCurveTo(fx + 24, item.y - fh * 0.3, fx + 16, item.y);
        context.closePath();
        context.fill();
      }
    } else {
      // Ember warning in the last half-second before the flame erupts.
      const cycle = 2.4;
      const phase = item.flameTimer % cycle;
      if (phase > 1.0 && phase < 1.5) {
        ellipse(item.x + item.width / 2, item.y - 6, 8 + flicker * 0.4, 5, PALETTE.flame[1]);
      }
    }
  }

  /** A falling carving knife, point down: a flat blade over a brown handle. Stuck ones
   *  lean in the ground where they landed. */
  function drawKnife(item) {
    const handle = item.height * 0.3;
    context.save();
    context.translate(item.x + item.width / 2, item.y + item.height / 2);
    if (item.stuck) context.rotate(0.12);
    context.fillStyle = PALETTE.handle;
    context.fillRect(-item.width * 0.1, -item.height / 2, item.width * 0.2, handle);
    context.fillStyle = PALETTE.knife;
    context.beginPath();
    context.moveTo(-item.width / 2, -item.height / 2 + handle);
    context.lineTo(item.width / 2, -item.height / 2 + handle);
    context.lineTo(0, item.height / 2);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.knifeEdge;
    context.fillRect(-1, -item.height / 2 + handle, 2, item.height - handle - 6);
    context.restore();
  }

  function drawCorn(item) {
    ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 3, item.height / 2, PALETTE.corn);
    context.fillStyle = PALETTE.cornHusk;
    context.beginPath();
    context.moveTo(item.x + 4, item.y + item.height - 4);
    context.lineTo(item.x + item.width / 2, item.y + item.height + 8);
    context.lineTo(item.x + item.width - 4, item.y + item.height - 4);
    context.closePath();
    context.fill();
  }

  function drawPumpkin(item, now) {
    const bob = Math.sin(now / 300 + item.x) * 2;
    ellipse(item.x + item.width / 2, item.y + item.height / 2 + bob, item.width / 2, item.height / 2, PALETTE.pumpkin);
    context.strokeStyle = PALETTE.pumpkinDark;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2 + bob, item.width / 4, item.height / 2, 0, 0, Math.PI * 2);
    context.stroke();
    rect(item.x + item.width / 2 - 3, item.y - 4 + bob, 6, 8, PALETTE.cornHusk);
  }

  function drawFeather(item, now) {
    const glow = 0.5 + Math.sin(now / 200) * 0.2;
    context.fillStyle = `rgba(255, 210, 62, ${glow.toFixed(2)})`;
    context.beginPath();
    context.arc(item.x + item.width / 2, item.y + item.height / 2, item.width * 0.75, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.feather;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, item.y + item.height / 2, 6, 13, 0.5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.feather;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(item.x + item.width / 2 + 6, item.y + item.height / 2 - 10);
    context.lineTo(item.x + item.width / 2 + 14, item.y + item.height / 2 - 18);
    context.stroke();
  }

  function drawField(state, now) {
    drawSky(state.stage);
    drawParallax(state.scrollX, state.stage);
    for (let index = 0; index < state.pickups.length; index += 1) {
      const item = state.pickups[index];
      if (!item.active) continue;
      if (item.kind === KIND_CORN) drawCorn(item);
      else if (item.kind === KIND_PUMPKIN) drawPumpkin(item, now);
      else if (item.kind === KIND_FEATHER) drawFeather(item, now);
    }
    for (let index = 0; index < state.obstacles.length; index += 1) {
      const item = state.obstacles[index];
      if (!item.active) continue;
      if (item.kind === KIND_FENCE) drawFence(item);
      else if (item.kind === KIND_HAY) drawHay(item);
      else if (item.kind === KIND_OVEN) drawOven(item, now);
      else if (item.kind === KIND_KNIFE) drawKnife(item);
    }
    // The farmer, when the gap is small enough to see him at the left edge.
    const farmerX = state.player.x - state.farmerGap - 84;
    if (farmerX > -90) drawFarmer(Math.max(farmerX, -70), state.player.runPhase);
    const player = state.player;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) {
      drawTurkey(player, now);
    }
  }

  // --- HUD and panels. ---

  function drawHeart(x, y, filled) {
    context.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
    context.beginPath();
    context.moveTo(x, y + 6);
    context.bezierCurveTo(x - 10, y - 4, x - 2, y - 12, x + 6, y - 4);
    context.bezierCurveTo(x + 14, y - 12, x + 22, y - 4, x + 12, y + 6);
    context.bezierCurveTo(x + 8, y + 12, x + 4, y + 14, x, y + 6);
    context.closePath();
    context.fill();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 30, PALETTE.text, 'left');
    text(`${distanceLabel(Math.floor(state.distance))} m`, 24, 54, 22, PALETTE.muted, 'left');
    text(levelLabel(state.level), FIELD.width / 2, 18, 26, PALETTE.text, 'center');
    text(state.stage.name, FIELD.width / 2, 50, 20, PALETTE.muted, 'center');
    // Distance progress to the escape, top centre under the level.
    const barX = FIELD.width / 2 - 130;
    const barY = 82;
    rect(barX, barY, 260, 10, PALETTE.meterBack);
    rect(barX, barY, Math.min(260, 260 * (state.distance / ESCAPE_DISTANCE)), 10, PALETTE.meterSafe);
    text(`ESCAPE ${ESCAPE_DISTANCE}m`, FIELD.width / 2, barY + 16, 15, PALETTE.muted, 'center');
    // Lives, top right.
    const firstHeart = FIELD.width - 24 - LIVES * (HEART_SIZE + HEART_GAP) + HEART_GAP;
    text('Lives', firstHeart - 14, 18, 26, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(firstHeart + life * (HEART_SIZE + HEART_GAP), 24, life < state.lives);
    }
    // The farmer meter: how far behind the farmer is, in metres. Red when he is close.
    const gapMetres = Math.max(0, Math.round(state.farmerGap / 12));
    const meterX = FIELD.width - 264;
    const meterY = 64;
    text('FARMER', meterX, meterY, 18, PALETTE.muted, 'left');
    rect(meterX + 84, meterY + 2, 156, 12, PALETTE.meterBack);
    const fillWidth = 156 * (state.farmerGap / FARMER.maxGap);
    rect(
      meterX + 84, meterY + 2, fillWidth, 12,
      state.farmerGap < 50 ? PALETTE.danger : PALETTE.meterSafe,
    );
    text(`${gapMetres}m behind`, meterX + 84, meterY + 18, 15, PALETTE.muted, 'left');
    // A flashing warning when the farmer is about to grab the turkey.
    if (state.farmerGap < 40 && Math.floor(Date.now() / 300) % 2 === 0) {
      text('HE IS RIGHT BEHIND YOU!', FIELD.width / 2, 130, 26, PALETTE.danger, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.corn, 'center');
  }

  const TITLE_LINES = [
    'Thanksgiving is coming. The farmer wants you for dinner.',
    'Run the farmyard, the barn and the kitchen — and get away!',
    'Jump fences and ovens, dodge the carving knives, grab corn.',
    'Steer with ← → or A D. Jump with Space, ↑ or click. Duck with ↓.',
    'The golden feather scares the farmer off. Escape at 2000 m.',
    '',
  ];
  const PAUSED_LINES = ['The farmer will wait for you. He is patient.'];
  const OVER_LINES = ['', ''];
  const ESCAPED_LINES = ['You made it to the Safe Woods!', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, now) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, now);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('TURKEY RUN', TITLE_LINES, 'Press Space or click to run for it');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to keep running');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Caught for dinner!', OVER_LINES, 'Press Space or click to try again');
    } else if (screen === SCREEN_ESCAPED) {
      ESCAPED_LINES[1] = finalLabel(state.score);
      ESCAPED_LINES[2] = bestLabel(best);
      drawPanel('ESCAPED!', ESCAPED_LINES, 'Press Space or click to run again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
