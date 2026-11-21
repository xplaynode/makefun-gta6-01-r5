// input.js — keyboard and mouse state for Caldera Bay: Vice Tide.
// Keys are tracked as a held-set plus a pressed-this-frame set so menus, the weapon
// wheel and crew abilities can react to taps while driving reads the held set.

export function makeInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 640, y: 360, wx: 0, wy: 0, down: false };
  window.addEventListener('keydown', (e) => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) mouse.down = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // Touch fallback: left half steers/walks, right half is the fire button. The
  // bounty targets desktop Chrome, but a phone preview should still move.
  const touches = { moveId: null, fireId: null, moveX: 0, moveY: 0 };
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const x = (t.clientX - rect.left) * (canvas.width / rect.width);
      if (x < canvas.width / 2 && touches.moveId === null) { touches.moveId = t.identifier; touches.moveX = x; touches.moveY = t.clientY; held.add('KeyW'); }
      else if (touches.fireId === null) { touches.fireId = t.identifier; mouse.down = true; }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== touches.moveId) continue;
      const rect = canvas.getBoundingClientRect();
      const x = (t.clientX - rect.left) * (canvas.width / rect.width);
      held.delete('KeyA'); held.delete('KeyD');
      if (x < touches.moveX - 14) held.add('KeyA');
      if (x > touches.moveX + 14) held.add('KeyD');
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touches.moveId) { touches.moveId = null; held.delete('KeyW'); held.delete('KeyA'); held.delete('KeyD'); }
      if (t.identifier === touches.fireId) { touches.fireId = null; mouse.down = false; }
    }
  });
  // Gamepad: left stick drives/walks, A interacts, X fires, Y cycles weapons.
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && [...pads].find(Boolean);
    if (!pad) return;
    const [lx, ly] = [pad.axes[0] || 0, pad.axes[1] || 0];
    const set = (code, on) => { if (on) { if (!held.has(code)) pressed.add(code); held.add(code); } else held.delete(code); };
    set('KeyA', lx < -0.35); set('KeyD', lx > 0.35);
    set('KeyW', ly < -0.35); set('KeyS', ly > 0.35);
    if (pad.buttons[0]?.pressed) pressed.add('KeyE');
    if (pad.buttons[2]?.pressed) mouse.down = true; else if (mouse.down && touches.fireId === null) mouse.down = false;
    if (pad.buttons[3]?.pressed) pressed.add('KeyQ');
  }
  setInterval(pollGamepad, 50);
  return {
    held, mouse,
    isDown: (code) => held.has(code),
    wasPressed: (code) => pressed.has(code),
    anyPressed: (codes) => codes.some(c => pressed.has(c)),
    endFrame: () => pressed.clear(),
    moveAxis() {
      let x = 0, y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      return { x, y };
    },
  };
}
