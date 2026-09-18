// Automated Test for 4-Player Battle Turn Rotation & Strict Out-of-Turn Item Blocking
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = global;
global.getRandomItem = () => 'multimeter';
global.soundFX = { playScannerBeep: () => {}, playCutters: () => {}, playBooster: () => {}, playGlove: () => {}, playShockZap: () => {}, playDudClick: () => {} };

eval(fs.readFileSync(path.join(__dirname, '../js/items.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/game-engine.js'), 'utf8'));

console.log('[TEST] Testing 4-Player Battle Turn Rotation & Item Locks...');

const pList = [
  { id: 'p1', name: 'Player 1' },
  { id: 'p2', name: 'Player 2' },
  { id: 'p3', name: 'Player 3' },
  { id: 'p4', name: 'Player 4' }
];

const engine = new global.GameEngine({ maxHp: 3, itemsPerRound: 1, players: pList });
engine.startMatch();

assert.strictEqual(engine.playerList.length, 4);
assert.strictEqual(engine.activePlayerKey, 'p1');

// Test 1: Out-of-Turn Item Usage Blocked!
const outOfTurnUse = engine.useItem('p2', 0);
assert.strictEqual(outOfTurnUse.success, false);
assert.strictEqual(outOfTurnUse.reason.includes('Not your turn'), true);
console.log('✓ Test 1 Passed: Out-of-turn item usage strictly BLOCKED!');

// Test 2: Active player uses item successfully
const inTurnUse = engine.useItem('p1', 0);
assert.strictEqual(inTurnUse.success, true);
console.log('✓ Test 2 Passed: In-turn item usage succeeds.');

// Test 3: Turn Rotation p1 -> p2 -> p3 -> p4
engine.chamber = ['LIVE', 'LIVE', 'LIVE', 'LIVE'];
engine.liveCount = 4;
engine.dudCount = 0;

engine.shockTarget('p1', 'p2');
assert.strictEqual(engine.activePlayerKey, 'p2');

engine.shockTarget('p2', 'p3');
assert.strictEqual(engine.activePlayerKey, 'p3');

engine.shockTarget('p3', 'p4');
assert.strictEqual(engine.activePlayerKey, 'p4');

engine.shockTarget('p4', 'p1');
assert.strictEqual(engine.activePlayerKey, 'p1');
console.log('✓ Test 3 Passed: 4-Player Round-Robin Turn Rotation operates cleanly.');

console.log('\n>>> N-PLAYER BATTLE ENGINE TESTS PASSED! <<<');
