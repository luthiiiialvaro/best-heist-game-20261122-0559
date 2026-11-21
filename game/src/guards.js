// Midnight Vault — guards, cameras and vision.
//
// A watcher (guard or camera) sees the thief only when three things are
// true: the thief is inside the vision cone, inside its range, and the
// straight line between them is not cut by a wall, a cover object or a
// smoke cloud. Guards patrol their waypoints, pause to look around, get
// suspicious when the alarm climbs, chase the last seen position, and
// investigate a thrown coin.

export const GUARD_RANGE = 190;
export const GUARD_FOV = (75 * Math.PI) / 180;
export const CAMERA_RANGE = 230;
export const CAMERA_FOV = (55 * Math.PI) / 180;
export const GUARD_PATROL_SPEED = 56;
export const GUARD_CHASE_SPEED = 96;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the segment p1->p2 crosses the rectangle r (or either end is
// inside it). Used for line-of-sight checks against walls and cover.
export function segmentHitsRect(p1, p2, r) {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  if (p1.x >= r.x && p1.x <= r.x + r.w && p1.y >= r.y && p1.y <= r.y + r.h) return true;
  if (p2.x >= r.x && p2.x <= r.x + r.w && p2.y >= r.y && p2.y <= r.y + r.h) return true;
  const edges = [
    [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }],
    [{ x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }],
    [{ x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }],
    [{ x: r.x, y: r.y + r.h }, { x: r.x, y: r.y }],
  ];
  return edges.some(([a, b]) => segmentsCross(p1, p2, a, b));
}

function segmentsCross(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (d === 0) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// True when the segment p1->p2 passes through the smoke circle.
export function segmentHitsSmoke(p1, p2, smoke) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return false;
  let t = ((smoke.x - p1.x) * dx + (smoke.y - p1.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = p1.x + t * dx;
  const cy = p1.y + t * dy;
  const dist = Math.hypot(smoke.x - cx, smoke.y - cy);
  return dist < smoke.r;
}

export function lineOfSightClear(from, to, walls, smokes) {
  for (const w of walls) {
    if (segmentHitsRect(from, to, w)) return false;
  }
  for (const s of smokes) {
    if (segmentHitsSmoke(from, to, s)) return false;
  }
  return true;
}

// The cone test for one watcher: range, field of view and line of sight.
export function visionConeSees(watcher, range, fov, thief, walls, smokes) {
  const dx = thief.x - watcher.x;
  const dy = thief.y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 14) return lineOfSightClear(watcher, thief, walls, smokes);
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angle, watcher.angle)) > fov / 2) return false;
  return lineOfSightClear(watcher, thief, walls, smokes);
}

// Build a guard's live state from its room definition.
export function spawnGuard(def, index) {
  const start = def.patrol[0];
  return {
    x: start.x,
    y: start.y,
    angle: 0,
    target: 1 % def.patrol.length,
    pause: 0,
    pauseTime: def.pause ?? 0.8,
    patrol: def.patrol,
    mode: 'patrol', // patrol | chase | investigate
    lastSeen: null,
    chaseTime: 0,
    investigateTime: 0,
    index,
  };
}

// Build a camera's live state from its room definition.
export function spawnCamera(def) {
  return {
    x: def.x,
    y: def.y,
    base: def.base,
    sweep: def.sweep,
    period: def.period,
    phase: Math.random() * Math.PI * 2,
    angle: def.base,
    jammedUntil: 0,
  };
}

// Advance one guard by dt seconds. Returns nothing; mutates the guard.
export function patrolGuard(guard, dt, now, thief, walls, smokes) {
  if (guard.mode === 'investigate') {
    guard.investigateTime -= dt;
    moveToward(guard, guard.lastSeen, GUARD_PATROL_SPEED, dt);
    if (guard.investigateTime <= 0 || reached(guard, guard.lastSeen, 8)) {
      guard.mode = 'patrol';
    }
    return;
  }
  if (guard.mode === 'chase') {
    guard.chaseTime -= dt;
    moveToward(guard, guard.lastSeen, GUARD_CHASE_SPEED, dt);
    if (guard.chaseTime <= 0 || reached(guard, guard.lastSeen, 10)) {
      guard.mode = 'patrol';
    }
    return;
  }
  // Patrol: walk to the next waypoint, pause and look around there.
  if (guard.pause > 0) {
    guard.pause -= dt;
    guard.angle += dt * 1.6; // scan the room while waiting
    return;
  }
  const wp = guard.patrol[guard.target];
  const arrived = moveToward(guard, wp, GUARD_PATROL_SPEED, dt);
  if (arrived) {
    guard.pause = guard.pauseTime;
    guard.target = (guard.target + 1) % guard.patrol.length;
  }
}

function moveToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  return step >= dist;
}

function reached(guard, target, eps) {
  return Math.hypot(target.x - guard.x, target.y - guard.y) <= eps;
}

// Advance a camera's sweep by dt seconds (frozen while jammed).
export function sweepCamera(camera, dt, now) {
  if (now < camera.jammedUntil) return;
  camera.angle = camera.base + Math.sin((now / camera.period) * Math.PI * 2 + camera.phase) * camera.sweep;
}
