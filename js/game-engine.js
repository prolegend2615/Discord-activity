// Core Game State Engine for Short Circuit

const WIRE_TYPES = {
  LIVE: 'LIVE',
  DUD: 'DUD'
};

class GameEngine {
  constructor(options = {}) {
    this.maxHp = options.maxHp || 3;
    this.itemsPerRound = options.itemsPerRound || 1;
    this.round = 0;
    this.chamber = []; // Array of 'LIVE' or 'DUD'
    this.liveCount = 0;
    this.dudCount = 0;

    // Player states
    this.players = {
      p1: {
        id: options.p1?.id || 'p1',
        name: options.p1?.name || 'Player 1',
        avatar: options.p1?.avatar || null,
        hp: this.maxHp,
        items: [],
        isBot: options.p1?.isBot || false
      },
      p2: {
        id: options.p2?.id || 'p2',
        name: options.p2?.name || 'Player 2',
        avatar: options.p2?.avatar || null,
        hp: this.maxHp,
        items: [],
        isBot: options.p2?.isBot || false
      }
    };

    this.activePlayerKey = 'p1'; // 'p1' or 'p2'
    this.isBoosted = false; // Voltage booster active
    this.opponentStunned = false; // Insulated glove active
    this.lastPeekedWire = null; // Stored secret scan result for active player
    this.history = [];
    this.gameOver = false;
    this.winner = null;

    this.onStateChangeCallbacks = [];
    this.onLogCallbacks = [];
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  onLog(cb) {
    this.onLogCallbacks.push(cb);
  }

  emitStateChange(eventMeta = {}) {
    const snapshot = this.getSnapshot();
    this.onStateChangeCallbacks.forEach(cb => cb(snapshot, eventMeta));
  }

  log(message, type = 'info') {
    this.history.push({ message, type, time: Date.now() });
    this.onLogCallbacks.forEach(cb => cb(message, type));
  }

  getOpponentKey(key = this.activePlayerKey) {
    return key === 'p1' ? 'p2' : 'p1';
  }

  getActivePlayer() {
    return this.players[this.activePlayerKey];
  }

  getOpponentPlayer() {
    return this.players[this.getOpponentKey()];
  }

  // Start / initialize match
  startMatch() {
    this.round = 0;
    this.gameOver = false;
    this.winner = null;
    this.players.p1.hp = this.maxHp;
    this.players.p2.hp = this.maxHp;
    this.players.p1.items = [];
    this.players.p2.items = [];
    this.activePlayerKey = 'p1';
    this.isBoosted = false;
    this.opponentStunned = false;
    this.lastPeekedWire = null;

    this.log('⚡ HIGH VOLTAGE MATCH INITIATED. TERMINALS CONNECTED.', 'system');
    this.startNewRound();
  }

  // Generate wire pool for a new round
  generateWirePool(roundNumber) {
    // Progressive wire mixes: balanced high-stakes odds
    const mixes = [
      { live: 1, dud: 2 }, // Total 3
      { live: 2, dud: 2 }, // Total 4
      { live: 3, dud: 2 }, // Total 5
      { live: 3, dud: 3 }, // Total 6
      { live: 4, dud: 2 }, // Total 6
      { live: 4, dud: 3 }  // Total 7
    ];

    const mix = mixes[Math.min(roundNumber - 1, mixes.length - 1)];
    const wires = [];
    for (let i = 0; i < mix.live; i++) wires.push(WIRE_TYPES.LIVE);
    for (let i = 0; i < mix.dud; i++) wires.push(WIRE_TYPES.DUD);

    // Fisher-Yates secret shuffle
    for (let i = wires.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wires[i], wires[j]] = [wires[j], wires[i]];
    }

    return { wires, live: mix.live, dud: mix.dud };
  }

  startNewRound() {
    this.round++;
    const pool = this.generateWirePool(this.round);
    this.chamber = pool.wires;
    this.liveCount = pool.live;
    this.dudCount = pool.dud;
    this.isBoosted = false;
    this.opponentStunned = false;
    this.lastPeekedWire = null;

    // Grant items to both players (max 4 per player)
    ['p1', 'p2'].forEach(pKey => {
      const p = this.players[pKey];
      for (let i = 0; i < this.itemsPerRound; i++) {
        if (p.items.length < 4) {
          const newItem = window.getRandomItem ? window.getRandomItem() : 'multimeter';
          p.items.push(newItem);
        }
      }
    });

    this.log(`--- ROUND ${this.round} INITIALIZED ---`, 'round');
    this.log(`CHAMBER LOADED: ${this.liveCount} LIVE [⚡] | ${this.dudCount} DUD [⚪]`, 'chamber');

    this.emitStateChange({ type: 'ROUND_STARTED' });
  }

  // Use toolbox item
  useItem(playerKey, itemIndex) {
    if (this.gameOver) return { success: false, reason: 'Game is over' };
    if (playerKey !== this.activePlayerKey) return { success: false, reason: 'Not your turn' };

    const player = this.players[playerKey];
    if (itemIndex < 0 || itemIndex >= player.items.length) {
      return { success: false, reason: 'Invalid item index' };
    }

    const itemId = player.items[itemIndex];
    // Remove item from inventory
    player.items.splice(itemIndex, 1);

    let result = { success: true, itemId };

    switch (itemId) {
      case 'multimeter': {
        const nextWire = this.chamber[0];
        this.lastPeekedWire = nextWire;
        result.peek = nextWire;
        this.log(`${player.name} activated MULTIMETER to scan next wire.`, 'item');
        break;
      }

      case 'wire_cutters': {
        const cutWire = this.chamber.shift();
        if (cutWire === WIRE_TYPES.LIVE) {
          this.liveCount--;
        } else {
          this.dudCount--;
        }
        this.isBoosted = false; // Cutter dissipates boost
        this.lastPeekedWire = null;
        result.cutWire = cutWire;
        this.log(`✂️ ${player.name} used WIRE CUTTERS! Safely snipped a ${cutWire} wire!`, 'item');

        // Check if chamber emptied
        if (this.chamber.length === 0) {
          this.startNewRound();
        }
        break;
      }

      case 'voltage_booster': {
        this.isBoosted = true;
        this.log(`⚡ ${player.name} connected VOLTAGE BOOSTER! Next Live wire does 2 HP!`, 'item');
        break;
      }

      case 'insulated_glove': {
        this.opponentStunned = true;
        const opp = this.getOpponentPlayer();
        this.log(`🧤 ${player.name} equipped INSULATED GLOVE! ${opp.name}'s next turn will be SKIPPED!`, 'item');
        break;
      }
    }

    this.emitStateChange({ type: 'ITEM_USED', itemId, result, playerKey });
    return result;
  }

  // Action: Shock Opponent
  shockOpponent(playerKey) {
    if (this.gameOver) return { success: false, reason: 'Game is over' };
    if (playerKey !== this.activePlayerKey) return { success: false, reason: 'Not your turn' };
    if (this.chamber.length === 0) return { success: false, reason: 'Chamber empty' };

    const shooter = this.players[playerKey];
    const targetKey = this.getOpponentKey(playerKey);
    const target = this.players[targetKey];

    const wire = this.chamber.shift();
    const wasBoosted = this.isBoosted;
    this.lastPeekedWire = null;

    let damage = 0;
    let isLive = (wire === WIRE_TYPES.LIVE);

    if (isLive) {
      this.liveCount--;
      damage = wasBoosted ? 2 : 1;
      target.hp = Math.max(0, target.hp - damage);
      this.log(`💥 LIVE WIRE! ${shooter.name} SHOCKS ${target.name} for ${damage} HP!`, 'shock-hit');
    } else {
      this.dudCount--;
      this.log(`*CLICK* DUD WIRE. ${target.name} takes no damage.`, 'shock-dud');
    }

    this.isBoosted = false;

    // Check for match over
    if (target.hp <= 0) {
      this.gameOver = true;
      this.winner = playerKey;
      this.log(`🏆 MATCH OVER! ${shooter.name} WINS THE DUEL!`, 'winner');
      this.emitStateChange({
        type: 'ACTION_SHOCK_OPPONENT',
        wire,
        damage,
        wasBoosted,
        isLive,
        shooterKey: playerKey,
        targetKey
      });
      return { success: true, wire, damage, gameOver: true, winner: playerKey };
    }

    // Determine turn passing
    let turnPassed = true;
    if (this.opponentStunned) {
      this.opponentStunned = false;
      turnPassed = false;
      this.log(`🧤 ${target.name}'s turn was SKIPPED by Insulated Glove! ${shooter.name} continues!`, 'stun');
    } else {
      this.activePlayerKey = targetKey;
    }

    // Check chamber status
    const chamberEmpty = this.chamber.length === 0;
    this.emitStateChange({
      type: 'ACTION_SHOCK_OPPONENT',
      wire,
      damage,
      wasBoosted,
      isLive,
      shooterKey: playerKey,
      targetKey,
      turnPassed
    });

    if (chamberEmpty && !this.gameOver) {
      this.startNewRound();
    }

    return { success: true, wire, damage, isLive, turnPassed };
  }

  // Action: Shock Yourself
  shockSelf(playerKey) {
    if (this.gameOver) return { success: false, reason: 'Game is over' };
    if (playerKey !== this.activePlayerKey) return { success: false, reason: 'Not your turn' };
    if (this.chamber.length === 0) return { success: false, reason: 'Chamber empty' };

    const shooter = this.players[playerKey];
    const targetKey = this.getOpponentKey(playerKey);
    const opponent = this.players[targetKey];

    const wire = this.chamber.shift();
    const wasBoosted = this.isBoosted;
    this.lastPeekedWire = null;

    let damage = 0;
    let isLive = (wire === WIRE_TYPES.LIVE);
    let extraTurn = false;

    if (isLive) {
      this.liveCount--;
      damage = wasBoosted ? 2 : 1;
      shooter.hp = Math.max(0, shooter.hp - damage);
      this.log(`💥 LIVE WIRE! ${shooter.name} SHOCKED THEMSELVES for ${damage} HP!`, 'shock-hit');

      this.isBoosted = false;

      // Check match over
      if (shooter.hp <= 0) {
        this.gameOver = true;
        this.winner = targetKey;
        this.log(`🏆 MATCH OVER! ${opponent.name} WINS!`, 'winner');
        this.emitStateChange({
          type: 'ACTION_SHOCK_SELF',
          wire,
          damage,
          wasBoosted,
          isLive,
          extraTurn: false,
          shooterKey: playerKey
        });
        return { success: true, wire, damage, gameOver: true, winner: targetKey };
      }

      // Live self-shock passes turn (unless opponent stunned)
      if (this.opponentStunned) {
        this.opponentStunned = false;
        this.log(`🧤 Stun consumed! ${shooter.name} keeps turn despite self-shock!`, 'stun');
      } else {
        this.activePlayerKey = targetKey;
      }
    } else {
      // DUD! Free bonus turn!
      this.dudCount--;
      extraTurn = true;
      this.isBoosted = false;
      this.log(`*CLICK* DUD WIRE! ${shooter.name} survived self-shock and EARNS AN EXTRA TURN!`, 'shock-dud');
      // Player retains activePlayerKey
    }

    const chamberEmpty = this.chamber.length === 0;
    this.emitStateChange({
      type: 'ACTION_SHOCK_SELF',
      wire,
      damage,
      wasBoosted,
      isLive,
      extraTurn,
      shooterKey: playerKey
    });

    if (chamberEmpty && !this.gameOver) {
      this.startNewRound();
    }

    return { success: true, wire, damage, isLive, extraTurn };
  }

  getSnapshot() {
    return {
      round: this.round,
      maxHp: this.maxHp,
      itemsPerRound: this.itemsPerRound,
      chamberRemaining: this.chamber.length,
      liveCount: this.liveCount,
      dudCount: this.dudCount,
      isBoosted: this.isBoosted,
      opponentStunned: this.opponentStunned,
      activePlayerKey: this.activePlayerKey,
      gameOver: this.gameOver,
      winner: this.winner,
      players: {
        p1: {
          id: this.players.p1.id,
          name: this.players.p1.name,
          avatar: this.players.p1.avatar,
          hp: this.players.p1.hp,
          items: [...this.players.p1.items],
          isBot: this.players.p1.isBot
        },
        p2: {
          id: this.players.p2.id,
          name: this.players.p2.name,
          avatar: this.players.p2.avatar,
          hp: this.players.p2.hp,
          items: [...this.players.p2.items],
          isBot: this.players.p2.isBot
        }
      }
    };
  }
}

window.WIRE_TYPES = WIRE_TYPES;
window.GameEngine = GameEngine;
