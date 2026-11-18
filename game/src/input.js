// Keyboard and mouse input. Held keys give a movement vector; one-shot presses
// (confirm, pause, interact, punch, shop, mute, number keys) are queued as bit
// flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice. The mouse position is tracked for aiming.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOP = 16;
export const ACTION_MUTE = 32;
export const ACTION_SHOOT = 64;
export const ACTION_TAXI = 128;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const INTERACT = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const SHOP = new Set(['KeyB']);
const TAXI = new Set(['KeyT']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let newGame = false;
  const numberKeys = new Set();

  function queue(flag, event) {
    if (!event.repeat) actions |= flag;
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) { queue(ACTION_CONFIRM, event); event.preventDefault(); }
    else if (PAUSE.has(event.code)) queue(ACTION_PAUSE, event);
    else if (INTERACT.has(event.code)) queue(ACTION_INTERACT, event);
    else if (PUNCH.has(event.code)) queue(ACTION_PUNCH, event);
    else if (SHOP.has(event.code)) queue(ACTION_SHOP, event);
    else if (TAXI.has(event.code)) queue(ACTION_TAXI, event);
    else if (MUTE.has(event.code)) queue(ACTION_MUTE, event);
    else if (/^Digit[1-9]$/.test(event.code)) numberKeys.add(event.code);
    if (event.code === 'KeyS' && !event.repeat) newGame = true;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    if (/^Digit[1-9]$/.test(event.code)) numberKeys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    actions |= ACTION_SHOOT;
    if (event.target === canvas) actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => { mouseDown = false; });

  function has(codes) {
    for (const code of codes) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Movement vector, each component -1, 0 or 1. */
    move() {
      return {
        x: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0),
        y: (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0),
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeNumbers() {
      const taken = new Set(numberKeys);
      numberKeys.clear();
      return taken;
    },
    /** True once when S is pressed (new game on the title screen). */
    takeNewGame() {
      const taken = newGame;
      newGame = false;
      return taken;
    },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    /** Read the queued actions without clearing them. */
    peekActions() { return actions; },
    /** Inject a synthetic action (used by the screenshot stager and tests). */
    inject(flag) { actions |= flag; },
  };
}
