// Automated Headless Test Suite for Short Circuit Game Engine & AI Logic
const assert = require('assert');

// Mock window and soundFX for headless node execution
global.window = global;
global.getRandomItem = () => ['multimeter', 'wire_cutters', 'voltage_booster', 'insulated_glove'][Math.floor(Math.random() * 4)];
global.soundFX = {
  playScannerBeep: () => {},
  playCutters: () => {},
  playBooster: () => {},
  playGlove: () => {},
  playCapacitorHum: () => {},
  playShockZap: () => {},
  playDudClick: () => {}
};

// Load modules by evaluating or reading
const fs = require('fs');
const path = require('path');

eval(fs.readFileSync(path.join(__dirname, '../js/items.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/game-engine.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/bot-ai.js'), 'utf8'));

console.log('[TEST] Starting Short Circuit Game Engine tests...');

// Test 1: Wire Pool Generation
const engine = new global.GameEngine({ maxHp: 3, itemsPerRound: 2 });
assert.strictEqual(engine.maxHp, 3);
assert.strictEqual(engine.itemsPerRound, 2);

const pool1 = engine.generateWirePool(1);
assert.strictEqual(pool1.wires.length, 3);
assert.strictEqual(pool1.live, 1);
assert.strictEqual(pool1.dud, 2);
console.log('✓ Test 1 Passed: Wire pool generation correct.');

// Test 2: Start Match and Initial State
engine.startMatch();
assert.strictEqual(engine.round, 1);
assert.strictEqual(engine.players.p1.items.length, 2);
assert.strictEqual(engine.players.p2.items.length, 2);
assert.strictEqual(engine.players.p1.hp, 3);
assert.strictEqual(engine.players.p2.hp, 3);
assert.strictEqual(engine.activePlayerKey, 'p1');
console.log('✓ Test 2 Passed: Match started, inventories populated.');

// Test 3: Multimeter and Wire Cutters
engine.chamber = ['LIVE', 'DUD'];
engine.liveCount = 1;
engine.dudCount = 1;
engine.players.p1.items = ['multimeter', 'wire_cutters'];

const scanRes = engine.useItem('p1', 0);
assert.strictEqual(scanRes.peek, 'LIVE');
assert.strictEqual(engine.chamber.length, 2); // Wire still in chamber
console.log('✓ Test 3 Passed: Multimeter accurately peeks wire.');

const cutRes = engine.useItem('p1', 0); // Next item is now wire_cutters
assert.strictEqual(cutRes.cutWire, 'LIVE');
assert.strictEqual(engine.chamber.length, 1);
assert.strictEqual(engine.liveCount, 0);
console.log('✓ Test 3 Passed: Wire cutters safely snipped live wire.');

// Test 4: Voltage Booster + Shock Opponent
engine.chamber = ['LIVE'];
engine.liveCount = 1;
engine.dudCount = 0;
engine.players.p1.items = ['voltage_booster'];
engine.useItem('p1', 0);
assert.strictEqual(engine.isBoosted, true);

const shockRes = engine.shockOpponent('p1');
assert.strictEqual(shockRes.isLive, true);
assert.strictEqual(shockRes.damage, 2);
assert.strictEqual(engine.players.p2.hp, 1); // 3 - 2 = 1 HP
assert.strictEqual(engine.isBoosted, false);
console.log('✓ Test 4 Passed: Voltage booster dealt 2 HP damage.');

// Test 5: Self-Shock Dud Gambit (Bonus Turn)
engine.chamber = ['DUD'];
engine.liveCount = 0;
engine.dudCount = 1;
engine.activePlayerKey = 'p1';

const selfShockRes = engine.shockSelf('p1');
assert.strictEqual(selfShockRes.extraTurn, true);
assert.strictEqual(engine.players.p1.hp, 3); // No damage taken
assert.strictEqual(engine.activePlayerKey, 'p1'); // Retained active turn!
console.log('✓ Test 5 Passed: Self-shock on Dud grants extra turn.');

// Test 6: AI Bot decision test
const bot = new global.BotAI(engine, 'p2');
assert.strictEqual(typeof bot.thinkAndAct, 'function');
console.log('✓ Test 6 Passed: Bot AI instantiated correctly.');

console.log('\n>>> ALL 6 UNIT TESTS PASSED SUCCESSFULLY! <<<');
