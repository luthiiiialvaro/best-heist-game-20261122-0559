// Midnight Vault — the thief, the tools and the alarm.
//
// The thief moves with WASD or the arrow keys and carries three tools, each
// with a cost: smoke bombs and jammers are limited per room, and a thrown
// coin needs a few seconds to recharge. The alarm meter is the heart of the
// game — it climbs fast inside a vision cone and cools down in the dark, so
// a careful thief is never caught by one mistake, but a careless one is.

import { FIELD_W, FIELD_H } from './levels.js';

export const THIEF_SPEED = 150;
export const THIEF_RADIUS = 13;
export const ALARM_MAX = 100;
export const ALARM_GUARD_RATE = 42;
export const ALARM_CAMERA_RATE = 34;
export const ALARM_DECAY = 14;
export const SMOKE_DURATION = 4.5;
export const SMOKE_RADIUS = 72;
export const JAMMER_DURATION = 6;
export const COIN_COOLDOWN = 3;
export const COIN_RANGE = 320;

export function spawnThief(start) {
  return {
    x: start.x,
    y: start.y,
    angle: -Math.PI / 2,
    moving: false,
    smokeLeft: 2,
    jammersLeft: 1,
    coinReadyIn: 0,
    smokes: [],
    coins: [],
    jammerUntil: 0,
  };
}

// Move the thief by one frame. Walls and cover block movement; the room
// border does too. Returns nothing; mutates the thief.
export function moveThief(thief, input, dt, walls) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  const len = Math.hypot(dx, dy);
  thief.moving = len > 0;
  if (!thief.moving) return;
  dx /= len;
  dy /= len;
  thief.angle = Math.atan2(dy, dx);
  const step = THIEF_SPEED * dt;
  tryMove(thief, dx * step, 0, walls);
  tryMove(thief, 0, dy * step, walls);
}

function tryMove(thief, dx, dy, walls) {
  const nx = thief.x + dx;
  const ny = thief.y + dy;
  if (nx < THIEF_RADIUS || nx > FIELD_W - THIEF_RADIUS) return;
  if (ny < THIEF_RADIUS || ny > FIELD_H - THIEF_RADIUS) return;
  for (const w of walls) {
    if (circleHitsRect(nx, ny, THIEF_RADIUS, w)) return;
  }
  thief.x = nx;
  thief.y = ny;
}

function circleHitsRect(cx, cy, r, rect) {
  const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return Math.hypot(cx - nearX, cy - nearY) < r;
}

// Drop a smoke bomb at the thief's feet. Returns true when one was spent.
export function triggerSmoke(thief, now) {
  if (thief.smokeLeft <= 0) return false;
  thief.smokeLeft -= 1;
  thief.smokes.push({ x: thief.x, y: thief.y, r: SMOKE_RADIUS, until: now + SMOKE_DURATION });
  return true;
}

// Jam every camera in the room for a few seconds. Returns true when spent.
export function jamCameras(thief, cameras, now) {
  if (thief.jammersLeft <= 0) return false;
  thief.jammersLeft -= 1;
  thief.jammerUntil = now + JAMMER_DURATION;
  for (const c of cameras) c.jammedUntil = now + JAMMER_DURATION;
  return true;
}

// Throw a coin at a floor point. Returns true when one was thrown.
export function throwCoin(thief, point, now) {
  if (thief.coinReadyIn > 0) return false;
  const dist = Math.hypot(point.x - thief.x, point.y - thief.y);
  if (dist > COIN_RANGE) return false;
  thief.coinReadyIn = COIN_COOLDOWN;
  thief.coins.push({ x: point.x, y: point.y, until: now + 3 });
  return true;
}

// Age the thief's timers by dt seconds and drop expired smoke and coins.
export function ageThiefTools(thief, dt, now) {
  if (thief.coinReadyIn > 0) thief.coinReadyIn -= dt;
  thief.smokes = thief.smokes.filter((s) => now < s.until);
  thief.coins = thief.coins.filter((c) => now < c.until);
}

// One alarm step: climb while seen, cool down while hidden. Returns the
// new alarm value, clamped to 0..ALARM_MAX.
export function updateAlarm(alarm, seenByGuard, seenByCamera, dt) {
  if (seenByGuard) alarm += ALARM_GUARD_RATE * dt;
  else if (seenByCamera) alarm += ALARM_CAMERA_RATE * dt;
  else alarm -= ALARM_DECAY * dt;
  return Math.max(0, Math.min(ALARM_MAX, alarm));
}
