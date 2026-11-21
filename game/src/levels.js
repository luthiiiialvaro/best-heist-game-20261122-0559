// Midnight Vault — room definitions.
//
// Every room is one floor plan the thief must cross: a loot target to grab
// and a getaway exit to reach, with patrolling guards, sweeping cameras and
// cover objects that block both movement and line of sight. All coordinates
// are in playfield space: 960 wide by 640 tall. Walls and cover are
// axis-aligned rectangles; the room border is a wall of its own.

export const FIELD_W = 960;
export const FIELD_H = 640;

export const ROOMS = [
  {
    name: 'The Gallery',
    sub: 'Museum of Modern Gold',
    tint: '#1c2436',
    floor: '#232c42',
    thiefStart: { x: 80, y: 560 },
    loot: { x: 868, y: 92, label: 'GOLDEN MASK', kind: 'mask' },
    exit: { x: 908, y: 548, w: 52, h: 92, label: 'EXIT' },
    walls: [
      { x: 400, y: 120, w: 140, h: 56, kind: 'case' },
      { x: 400, y: 300, w: 140, h: 56, kind: 'case' },
      { x: 180, y: 180, w: 96, h: 42, kind: 'bench' },
      { x: 688, y: 420, w: 112, h: 42, kind: 'bench' },
      { x: 620, y: 140, w: 52, h: 52, kind: 'pedestal' },
      { x: 120, y: 92, w: 44, h: 44, kind: 'plant' },
      { x: 848, y: 300, w: 44, h: 44, kind: 'plant' },
    ],
    guards: [
      { patrol: [{ x: 250, y: 120 }, { x: 250, y: 520 }], pause: 0.9 },
      { patrol: [{ x: 700, y: 500 }, { x: 700, y: 120 }], pause: 0.9 },
    ],
    cameras: [
      { x: 480, y: 4, base: Math.PI / 2, sweep: 0.9, period: 5.0 },
      { x: 956, y: 300, base: Math.PI, sweep: 0.8, period: 6.0 },
    ],
  },
  {
    name: 'The Vault',
    sub: 'First National Bank',
    tint: '#1a2029',
    floor: '#252b33',
    thiefStart: { x: 80, y: 80 },
    loot: { x: 480, y: 320, label: 'THE DIAMOND', kind: 'gem' },
    exit: { x: 0, y: 548, w: 52, h: 92, label: 'EXIT' },
    walls: [
      { x: 300, y: 150, w: 60, h: 60, kind: 'pillar' },
      { x: 600, y: 150, w: 60, h: 60, kind: 'pillar' },
      { x: 300, y: 430, w: 60, h: 60, kind: 'pillar' },
      { x: 600, y: 430, w: 60, h: 60, kind: 'pillar' },
      { x: 150, y: 295, w: 100, h: 50, kind: 'desk' },
      { x: 710, y: 295, w: 100, h: 50, kind: 'desk' },
    ],
    guards: [
      { patrol: [{ x: 200, y: 120 }, { x: 760, y: 120 }], pause: 0.7 },
      { patrol: [{ x: 760, y: 520 }, { x: 200, y: 520 }], pause: 0.7 },
      { patrol: [{ x: 480, y: 180 }, { x: 480, y: 460 }], pause: 1.2 },
    ],
    cameras: [
      { x: 480, y: 4, base: Math.PI / 2, sweep: 1.0, period: 4.5 },
      { x: 4, y: 320, base: 0, sweep: 0.8, period: 5.5 },
    ],
  },
  {
    name: 'The Penthouse',
    sub: 'The Crowning Job',
    tint: '#241d18',
    floor: '#2e2620',
    thiefStart: { x: 480, y: 590 },
    loot: { x: 480, y: 80, label: 'THE CROWN', kind: 'crown' },
    exit: { x: 440, y: 596, w: 80, h: 44, label: 'EXIT' },
    walls: [
      { x: 200, y: 200, w: 160, h: 60, kind: 'sofa' },
      { x: 600, y: 200, w: 160, h: 60, kind: 'sofa' },
      { x: 420, y: 320, w: 120, h: 60, kind: 'table' },
      { x: 150, y: 450, w: 120, h: 50, kind: 'bar' },
      { x: 690, y: 450, w: 120, h: 50, kind: 'bar' },
      { x: 90, y: 90, w: 44, h: 44, kind: 'plant' },
      { x: 826, y: 90, w: 44, h: 44, kind: 'plant' },
    ],
    guards: [
      { patrol: [{ x: 180, y: 120 }, { x: 780, y: 120 }], pause: 0.7 },
      { patrol: [{ x: 180, y: 520 }, { x: 780, y: 520 }], pause: 0.7 },
      { patrol: [{ x: 480, y: 200 }, { x: 480, y: 420 }], pause: 1.2 },
    ],
    cameras: [
      { x: 4, y: 100, base: 0, sweep: 0.8, period: 5.0 },
      { x: 956, y: 100, base: Math.PI, sweep: 0.8, period: 5.0 },
      { x: 480, y: 4, base: Math.PI / 2, sweep: 0.9, period: 4.0 },
    ],
  },
];
