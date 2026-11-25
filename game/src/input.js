// Keyboard + pointer input. DOM lives here; world.js stays pure.
export function createInput(canvas, hooks) {
  const keys = new Set();
  const down = new Set();

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    down.add(e.code);
    if (e.code === 'KeyE') hooks.onUse();
    if (e.code === 'Space' || e.code === 'Enter') hooks.onConfirm();
    if (e.code === 'KeyP' || e.code === 'Escape') hooks.onPause();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    hooks.onClick(x, y);
  });

  function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    return { x, y };
  }

  function consume(code) {
    if (down.has(code)) {
      down.delete(code);
      return true;
    }
    return false;
  }

  return { moveVector, consume };
}
