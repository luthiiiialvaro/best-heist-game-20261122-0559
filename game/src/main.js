// Midnight Vault — game state, loop and rules.
//
// One room at a time: grab the loot, then reach the exit while the alarm
// stays under 100%. Getting seen fills the alarm and makes guards chase;
// breaking line of sight cools it down again. Clearing all three rooms
// wins the heist.

import { ROOMS } from './levels.js';
import { spawnGuard, spawnCamera, patrolGuard, sweepCamera, visionConeSees, lineOfSightClear, GUARD_RANGE, GUARD_FOV, CAMERA_RANGE, CAMERA_FOV } from './guards.js';
import { spawnThief, moveThief, triggerSmoke, jamCameras, throwCoin, ageThiefTools, updateAlarm, ALARM_MAX } from './thief.js';
import { createInput, bindInput } from './input.js';
import { drawGame, CANVAS_W, CANVAS_H, FIELD_Y } from './render.js';
import { applyShot } from './shots.js';
import * as audio from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const input = createInput();
bindInput(input, canvas, (px, py) => {
  const fx = px - 0;
  const fy = py - FIELD_Y;
  if (fx < 0 || fx > 960 || fy < 0 || fy > 640) return null;
  return { x: fx, y: fy };
});

const game = {
  state: 'title', // title | play | caught | roomclear | win
  roomIndex: 0,
  room: ROOMS[0],
  guards: [],
  cameras: [],
  thief: null,
  alarm: 0,
  lootCollected: false,
  lootTaken: 0,
  score: 0,
  roomTime: 0,
  totalTime: 0,
  clearBonus: 0,
  message: null,
  seenFlash: 0,
  maxAlarmThisRoom: 0,
};

function loadRoom(index) {
  game.roomIndex = index;
  game.room = ROOMS[index];
  game.guards = game.room.guards.map((def, i) => spawnGuard(def, i));
  game.cameras = game.room.cameras.map((def) => spawnCamera(def));
  game.thief = spawnThief(game.room.thiefStart);
  game.alarm = 0;
  game.lootCollected = false;
  game.roomTime = 0;
  game.maxAlarmThisRoom = 0;
  game.message = null;
}

function showMessage(text, seconds = 2.4) {
  game.message = { text, until: performance.now() / 1000 + seconds };
}

function startGame() {
  game.score = 0;
  game.lootTaken = 0;
  game.totalTime = 0;
  loadRoom(0);
  game.state = 'play';
}

function roomCleared() {
  const timeBonus = Math.max(0, 300 - Math.floor(game.roomTime) * 2);
  const ghostBonus = game.maxAlarmThisRoom < 50 ? 150 : 0;
  game.clearBonus = 250 + timeBonus + ghostBonus;
  game.score += game.clearBonus;
  game.lootTaken += 1;
  audio.playClear();
  game.state = 'roomclear';
}

function nextRoom() {
  if (game.roomIndex + 1 >= ROOMS.length) {
    game.state = 'win';
  } else {
    loadRoom(game.roomIndex + 1);
    game.state = 'play';
    showMessage(`${game.room.name} — ${game.room.sub}`, 2.4);
  }
}

function caught() {
  audio.playCaught();
  game.state = 'caught';
}

function exitContains(point) {
  const e = game.room.exit;
  return point.x >= e.x && point.x <= e.x + e.w && point.y >= e.y && point.y <= e.y + e.h;
}

function update(dt, now) {
  // Screenshot staging (?shot=) freezes the simulation so the staged
  // frame holds exactly as the maker placed it.
  if (game.state !== 'play' || game.frozen) return;
  game.roomTime += dt;
  game.totalTime += dt;

  // Tools.
  if (input.smoke) {
    input.smoke = false;
    if (triggerSmoke(game.thief, now)) {
      audio.playSmoke();
      showMessage('Smoke out — their cones cannot see through it', 1.8);
    } else {
      showMessage('No smoke bombs left', 1.5);
    }
  }
  if (input.jammer) {
    input.jammer = false;
    if (jamCameras(game.thief, game.cameras, now)) {
      audio.playJammer();
      showMessage('Cameras jammed — 6 seconds of dark lenses', 1.8);
    } else {
      showMessage('No jammers left', 1.5);
    }
  }
  if (input.click) {
    const point = input.click;
    input.click = null;
    if (throwCoin(game.thief, point, now)) {
      audio.playCoin();
      const near = nearestGuard(point, 280);
      if (near) {
        near.mode = 'investigate';
        near.lastSeen = { x: point.x, y: point.y };
        near.investigateTime = 3;
      }
    }
  }
  if (input.mute) {
    input.mute = false;
    audio.setMuted(!audio.isMuted());
    showMessage(audio.isMuted() ? 'Sound off' : 'Sound on', 1.2);
  }
  ageThiefTools(game.thief, dt, now);

  // Movement.
  moveThief(game.thief, input, dt, game.room.walls);

  // Watchers move and sweep.
  for (const guard of game.guards) patrolGuard(guard, dt, now, game.thief, game.room.walls, game.thief.smokes);
  for (const camera of game.cameras) sweepCamera(camera, dt, now);

  // Detection: any guard or camera with the thief in its cone.
  const smokes = game.thief.smokes;
  let seenByGuard = false;
  let seenByCamera = false;
  for (const guard of game.guards) {
    if (visionConeSees(guard, GUARD_RANGE, GUARD_FOV, game.thief, game.room.walls, smokes)) {
      seenByGuard = true;
      guard.mode = 'chase';
      guard.lastSeen = { x: game.thief.x, y: game.thief.y };
      guard.chaseTime = 4;
    }
  }
  for (const camera of game.cameras) {
    if (now >= camera.jammedUntil && visionConeSees(camera, CAMERA_RANGE, CAMERA_FOV, game.thief, game.room.walls, smokes)) {
      seenByCamera = true;
    }
  }
  const wasSeen = seenByGuard || seenByCamera;
  game.alarm = updateAlarm(game.alarm, seenByGuard, seenByCamera, dt);
  game.maxAlarmThisRoom = Math.max(game.maxAlarmThisRoom, game.alarm);
  if (wasSeen && game.seenFlash <= 0) {
    audio.playAlert();
    game.seenFlash = 0.5;
  }
  if (game.seenFlash > 0) game.seenFlash -= dt;
  if (game.alarm >= ALARM_MAX) {
    caught();
    return;
  }

  // A chasing guard that touches the thief ends the job on the spot.
  for (const guard of game.guards) {
    if (guard.mode === 'chase' && Math.hypot(guard.x - game.thief.x, guard.y - game.thief.y) < 24) {
      caught();
      return;
    }
  }

  // Loot pickup.
  if (!game.lootCollected && Math.hypot(game.thief.x - game.room.loot.x, game.thief.y - game.room.loot.y) < 28) {
    game.lootCollected = true;
    game.score += 500;
    audio.playPickup();
    showMessage(`${game.room.loot.label} secured — get to the EXIT`, 2.6);
  }

  // Exit: locked until the loot is taken.
  if (exitContains(game.thief)) {
    if (game.lootCollected) {
      roomCleared();
    } else if (!game.message || now > game.message.until) {
      showMessage('Exit locked — grab the loot first', 1.6);
    }
  }
}

function nearestGuard(point, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const guard of game.guards) {
    const d = Math.hypot(guard.x - point.x, guard.y - point.y);
    if (d < bestDist) {
      best = guard;
      bestDist = d;
    }
  }
  return best;
}

function handleMenus() {
  if (input.enter) {
    input.enter = false;
    if (game.state === 'title' || game.state === 'win') startGame();
    else if (game.state === 'roomclear') nextRoom();
  }
  if (input.retry) {
    input.retry = false;
    if (game.state === 'caught') {
      loadRoom(game.roomIndex);
      game.state = 'play';
      showMessage('Same room, fresh start — the alarm is quiet again', 2.0);
    }
  }
}

let last = performance.now();
function frame(nowMs) {
  const now = nowMs / 1000;
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  handleMenus();
  update(dt, now);
  drawGame(ctx, game, now);
  requestAnimationFrame(frame);
}

// Test hook: the automated play-test drives the game through this object.
window.__heist = {
  game,
  input,
  startGame,
  loadRoom,
  setAlarm(value) {
    game.alarm = value;
  },
};

// A ?shot= query (title, play, alarm, win) stages a fixed moment for the
// entry's screenshots; without one the game opens on its title screen.
applyShot(game, window.__heist);

requestAnimationFrame(frame);
