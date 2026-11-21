// Midnight Vault — deterministic screenshot states.
//
// The maker takes the entry's screenshots by loading the game with a
// ?shot= query: title, play, alarm or win. Each one sets the game to a
// fixed, readable moment — the same frame every time, so the cover shows
// the room, the cones, the loot and the alarm meter at their best.

export function applyShot(game, heist) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  const now = performance.now() / 1000;
  if (shot === 'title') {
    game.state = 'title';
    return;
  }
  if (shot === 'play') {
    heist.startGame();
    game.frozen = true;
    // Mid-room: the thief is halfway to the mask, a guard's cone sweeps
    // across the path ahead and a camera watches the far side.
    game.thief.x = 330;
    game.thief.y = 380;
    game.thief.angle = Math.PI / 4;
    game.guards[0].x = 250;
    game.guards[0].y = 260;
    game.guards[0].angle = Math.PI / 2;
    game.guards[0].pause = 2;
    game.guards[1].x = 700;
    game.guards[1].y = 300;
    game.guards[1].angle = -Math.PI / 2;
    game.guards[1].pause = 2;
    game.alarm = 12;
    game.score = 0;
    game.roomTime = 41;
    game.message = { text: 'Stay out of the red cones', until: now + 60 };
    return;
  }
  if (shot === 'alarm') {
    heist.loadRoom(1);
    game.state = 'play';
    game.frozen = true;
    // The vault, mid-crisis: the alarm is high, a guard is chasing, and a
    // smoke cloud is the only thing between the thief and the cones.
    game.thief.x = 480;
    game.thief.y = 480;
    game.thief.angle = -Math.PI / 2;
    game.thief.smokeLeft = 1;
    game.thief.smokes = [{ x: 480, y: 480, r: 72, until: now + 60 }];
    game.guards[2].x = 480;
    game.guards[2].y = 400;
    game.guards[2].angle = Math.PI / 2;
    game.guards[2].mode = 'chase';
    game.guards[2].lastSeen = { x: 480, y: 480 };
    game.guards[2].chaseTime = 60;
    game.guards[0].x = 420;
    game.guards[0].y = 120;
    game.guards[0].angle = Math.PI / 2;
    game.guards[0].pause = 2;
    game.guards[1].x = 700;
    game.guards[1].y = 520;
    game.guards[1].angle = -Math.PI / 2;
    game.guards[1].pause = 2;
    game.cameras[0].jammedUntil = now + 60;
    game.alarm = 74;
    game.lootCollected = true;
    game.score = 500;
    game.roomTime = 96;
    game.message = { text: 'SPOTTED — break line of sight!', until: now + 60 };
    return;
  }
  if (shot === 'win') {
    game.state = 'win';
    game.score = 2350;
    game.lootTaken = 3;
    game.totalTime = 274;
  }
}
