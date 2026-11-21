// Midnight Vault — canvas rendering.
//
// One canvas, one visual language: a dark night floor, cover in deep teal
// so safe hiding spots read at a glance, danger as translucent red and
// amber vision cones, loot in glowing gold, the getaway exit in green.
// The HUD lives on the canvas too, so every screenshot carries the room,
// the alarm meter, the loot and the gadgets in a single frame.

import { FIELD_W, FIELD_H } from './levels.js';
import { GUARD_RANGE, GUARD_FOV, CAMERA_RANGE, CAMERA_FOV } from './guards.js';
import { ALARM_MAX } from './thief.js';

export const CANVAS_W = 960;
export const CANVAS_H = 700;
export const HUD_H = 60;
export const FIELD_Y = HUD_H;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw one vision cone: a wedge with a radial fade, red for a guard and
// amber for a camera, grey and dashed while a camera is jammed.
export function drawVisionCone(ctx, watcher, range, fov, color, jammed) {
  ctx.save();
  ctx.translate(watcher.x, watcher.y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, watcher.angle - fov / 2, watcher.angle + fov / 2);
  ctx.closePath();
  if (jammed) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.10)';
    ctx.fill();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, range);
    gradient.addColorStop(0, color.replace('A', '0.34'));
    gradient.addColorStop(1, color.replace('A', '0.02'));
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  ctx.restore();
}

function drawFloor(ctx, room) {
  ctx.fillStyle = room.floor;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= FIELD_H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
  // A room rug under the loot, so the target's neighbourhood reads clearly.
  ctx.fillStyle = 'rgba(120, 40, 60, 0.25)';
  roundRect(ctx, room.loot.x - 90, room.loot.y - 70, 180, 140, 12);
  ctx.fill();
}

function drawCover(ctx, wall) {
  const colors = {
    case: '#2f4b6e',
    bench: '#3a2f52',
    pedestal: '#4a3a28',
    plant: '#14532d',
    pillar: '#334155',
    desk: '#3f3a2a',
    sofa: '#5b2a3a',
    table: '#4a3520',
    bar: '#3a2a4a',
  };
  ctx.fillStyle = colors[wall.kind] || '#334155';
  roundRect(ctx, wall.x, wall.y, wall.w, wall.h, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (wall.kind === 'plant') {
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(wall.x + wall.w / 2, wall.y + wall.h / 2, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (wall.kind === 'case' || wall.kind === 'desk' || wall.kind === 'table') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    roundRect(ctx, wall.x + 8, wall.y + 8, wall.w - 16, wall.h - 16, 4);
    ctx.fill();
  }
}

function drawLoot(ctx, loot, collected, now) {
  if (collected) return;
  const pulse = 1 + Math.sin(now * 3) * 0.12;
  ctx.save();
  ctx.translate(loot.x, loot.y);
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -16 * pulse);
  ctx.lineTo(12 * pulse, 0);
  ctx.lineTo(0, 16 * pulse);
  ctx.lineTo(-12 * pulse, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(loot.label, 0, 40);
  ctx.restore();
}

function drawExit(ctx, exit, unlocked, now) {
  const glow = unlocked ? 0.5 + Math.sin(now * 4) * 0.25 : 0.15;
  ctx.save();
  ctx.fillStyle = unlocked ? `rgba(34, 197, 94, ${glow})` : 'rgba(34, 197, 94, 0.12)';
  roundRect(ctx, exit.x, exit.y, exit.w, exit.h, 6);
  ctx.fill();
  ctx.strokeStyle = unlocked ? '#4ade80' : '#166534';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = unlocked ? '#dcfce7' : '#86efac';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(unlocked ? 'EXIT →' : '🔒 EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 4);
  ctx.restore();
}

function drawGuard(ctx, guard, now) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.arc(0, -3, 8, Math.PI, 0);
  ctx.fill();
  // Facing tick so the patrol direction reads even outside the cone.
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(guard.angle) * 20, Math.sin(guard.angle) * 20);
  ctx.stroke();
  ctx.restore();
  if (guard.mode === 'chase') {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 22);
  } else if (guard.mode === 'investigate') {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 22);
  }
}

function drawCamera(ctx, camera, jammed) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = jammed ? '#475569' : '#92400e';
  roundRect(ctx, -9, -9, 18, 18, 4);
  ctx.fill();
  ctx.fillStyle = jammed ? '#94a3b8' : '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawThief(ctx, thief, now) {
  ctx.save();
  ctx.translate(thief.x, thief.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d9488';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  // Hood point in the direction of travel.
  ctx.fillStyle = '#14b8a6';
  ctx.beginPath();
  ctx.moveTo(Math.cos(thief.angle) * 20, Math.sin(thief.angle) * 20);
  ctx.lineTo(Math.cos(thief.angle + 2.5) * 10, Math.sin(thief.angle + 2.5) * 10);
  ctx.lineTo(Math.cos(thief.angle - 2.5) * 10, Math.sin(thief.angle - 2.5) * 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0fdfa';
  ctx.beginPath();
  ctx.arc(Math.cos(thief.angle - 0.4) * 5, Math.sin(thief.angle - 0.4) * 5, 2, 0, Math.PI * 2);
  ctx.arc(Math.cos(thief.angle + 0.4) * 5, Math.sin(thief.angle + 0.4) * 5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSmoke(ctx, smoke) {
  ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
  ctx.beginPath();
  ctx.arc(smoke.x, smoke.y, smoke.r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
  ctx.beginPath();
  ctx.arc(smoke.x - 24, smoke.y + 10, smoke.r * 0.5, 0, Math.PI * 2);
  ctx.arc(smoke.x + 26, smoke.y - 12, smoke.r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, game) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, HUD_H - 2, CANVAS_W, 2);
  ctx.textBaseline = 'middle';
  // Room name.
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(game.room.name.toUpperCase(), 16, 22);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${game.room.sub} · ROOM ${game.roomIndex + 1}/3`, 16, 44);
  // Alarm meter.
  const alarm = game.alarm;
  const meterX = 330;
  const meterW = 300;
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', meterX, 18);
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, meterX, 28, meterW, 16, 8);
  ctx.fill();
  const ratio = alarm / ALARM_MAX;
  const color = alarm < 40 ? '#22c55e' : alarm < 70 ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = color;
  if (ratio > 0) {
    roundRect(ctx, meterX, 28, Math.max(16, meterW * ratio), 16, 8);
    ctx.fill();
  }
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(alarm)}%`, meterX + meterW + 10, 36);
  // Loot, gadgets, score.
  ctx.textAlign = 'right';
  ctx.fillStyle = game.lootCollected ? '#fbbf24' : '#94a3b8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(game.lootCollected ? '◆ LOOT SECURED' : '◇ LOOT: ' + game.room.loot.label, 946, 20);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px system-ui, sans-serif';
  const smoke = `💨×${game.thief.smokeLeft}`;
  const jam = `📡×${game.thief.jammersLeft}`;
  const coin = game.thief.coinReadyIn > 0 ? '🪙…' : '🪙✓';
  ctx.fillText(`${smoke}  ${jam}  ${coin}   SCORE ${game.score}   ⏱ ${Math.floor(game.roomTime)}s`, 946, 44);
  ctx.textBaseline = 'alphabetic';
}

function drawMessage(ctx, game, now) {
  if (!game.message || now > game.message.until) return;
  const alpha = Math.min(1, (game.message.until - now) * 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  roundRect(ctx, CANVAS_W / 2 - 260, 84, 520, 40, 8);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.message.text, CANVAS_W / 2, 110);
  ctx.restore();
}

function drawCenteredPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_W / 2, 250);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, 300 + i * 30);
  });
}

// Draw the whole game for the current state.
export function drawGame(ctx, game, now) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (game.state === 'title') {
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawCenteredPanel(ctx, 'MIDNIGHT VAULT', [
      'A three-room heist. Grab the loot. Dodge the cones. Vanish.',
      '',
      'WASD / arrows — move      Click — throw a coin to distract',
      '1 — smoke bomb (×2)      2 — camera jammer (×1)',
      'Watch the ALARM meter: seen too long and the job is blown.',
      '',
      'Press ENTER to start the heist',
    ], '#fbbf24');
    return;
  }
  if (game.state === 'win') {
    drawCenteredPanel(ctx, 'THE PERFECT HEIST', [
      `Every room cleared. Total score: ${game.score}`,
      `Loot taken: ${game.lootTaken} of 3 · Time: ${Math.floor(game.totalTime)}s`,
      '',
      'Press ENTER to run it again',
    ], '#4ade80');
    return;
  }

  // Playfield.
  ctx.save();
  ctx.translate(0, FIELD_Y);
  drawFloor(ctx, game.room);
  for (const guard of game.guards) {
    drawVisionCone(ctx, guard, GUARD_RANGE, GUARD_FOV, 'rgba(239, 68, 68, A)', false);
  }
  for (const camera of game.cameras) {
    const jammed = now < camera.jammedUntil;
    drawVisionCone(ctx, camera, CAMERA_RANGE, CAMERA_FOV, 'rgba(245, 158, 11, A)', jammed);
  }
  for (const wall of game.room.walls) drawCover(ctx, wall);
  drawLoot(ctx, game.room.loot, game.lootCollected, now);
  drawExit(ctx, game.room.exit, game.lootCollected, now);
  for (const coin of game.thief.coins) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const smoke of game.thief.smokes) drawSmoke(ctx, smoke);
  for (const camera of game.cameras) drawCamera(ctx, camera, now < camera.jammedUntil);
  for (const guard of game.guards) drawGuard(ctx, guard, now);
  drawThief(ctx, game.thief, now);
  ctx.restore();

  drawHud(ctx, game);
  drawMessage(ctx, game, now);

  if (game.state === 'caught') {
    drawCenteredPanel(ctx, 'CAUGHT!', [
      'The alarm hit 100% — the guards closed in.',
      `Score so far: ${game.score}`,
      '',
      'Press R to retry this room',
    ], '#ef4444');
  }
  if (game.state === 'roomclear') {
    drawCenteredPanel(ctx, 'ROOM CLEAR', [
      `${game.room.loot.label} secured. ${game.clearBonus} bonus points.`,
      `Score: ${game.score}`,
      '',
      'Press ENTER for the next room',
    ], '#4ade80');
  }
}
