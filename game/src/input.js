// Midnight Vault — keyboard and mouse input.
//
// WASD or arrow keys move the thief. 1 drops a smoke bomb, 2 fires the
// camera jammer, a mouse click throws a coin at that floor point, Enter
// starts or advances, R retries a room, M mutes the sound.

export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    smoke: false,
    jammer: false,
    click: null, // { x, y } in playfield space, consumed by the game loop
    enter: false,
    retry: false,
    mute: false,
  };
}

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Digit1: 'smoke',
  Digit2: 'jammer',
  Enter: 'enter',
  KeyR: 'retry',
  KeyM: 'mute',
};

export function bindInput(input, canvas, toField) {
  window.addEventListener('keydown', (event) => {
    const field = KEYMAP[event.code];
    if (!field) return;
    if (field === 'enter' || field === 'retry' || field === 'mute' || field === 'smoke' || field === 'jammer') {
      if (!event.repeat) input[field] = true;
    } else {
      input[field] = true;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const field = KEYMAP[event.code];
    if (!field) return;
    if (field !== 'enter' && field !== 'retry' && field !== 'mute' && field !== 'smoke' && field !== 'jammer') {
      input[field] = false;
    }
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = toField(event.clientX - rect.left, event.clientY - rect.top);
    if (point) input.click = point;
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
  });
}
