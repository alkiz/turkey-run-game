// Keyboard and pointer input. Held keys give a steering direction and a held jump;
// one-shot presses (start or restart, pause, mute) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost and never counted
// twice. A click or tap jumps, and on a panel it confirms.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let left = false;
  let right = false;
  let jumpHeld = false;
  let duckHeld = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (JUMP.has(event.code)) {
      jumpHeld = true;
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DUCK.has(event.code)) duckHeld = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (JUMP.has(event.code)) jumpHeld = false;
    else if (DUCK.has(event.code)) duckHeld = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    jumpHeld = false;
    duckHeld = false;
  });
  target.addEventListener('pointerdown', () => {
    jumpHeld = true;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => {
    jumpHeld = false;
  });
  target.addEventListener('pointercancel', () => {
    jumpHeld = false;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    jumpHeld() {
      return jumpHeld;
    },
    duckHeld() {
      return duckHeld;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
