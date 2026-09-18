// Core Multi-Player Game Engine for Short Circuit (2 to 6 Players Battle)

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

    // Initialize list of 2 to 6 players
    const inputPlayers = (options.players && options.players.length >= 2)
      ? options.players
      : [options.p1 || { name: 'Player 1' }, options.p2 || { name: 'Player 2' }];

    this.playerList = inputPlayers.slice(0, 6).map((p, idx) => ({
      key: `p${idx + 1}`,
      id: p.id || `p${idx + 1}`,
      name: p.name || `Player ${idx + 1}`,
      avatar: p.avatar || null,
      hp: this.maxHp,
      items: [],
      isBot: !!p.isBot,
      isJammed: false
    }));

    // Map for fast key lookup
    this.players = {};
    this.playerList.forEach(p => { this.players[p.key] = p; });

    this.activePlayerIndex = 0;
    this.activePlayerKey = this.playerList[0].key;

    this.isBoosted = false; // Voltage booster active
    this.opponentStunned = false; // Insulated glove active
    this.lastPeekedWire = null;
    this.history = [];
    this.gameOver = false;
    this.winnerKey = null;

    this.onStateChangeCallbacks = [];
    this.onLogCallbacks = [];
    this.onEmoteCallbacks = [];
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  onLog(cb) {
    this.onLogCallbacks.push(cb);
  }

  onEmote(cb) {
    this.onEmoteCallbacks.push(cb);
  }

  emitStateChange(eventMeta = {}) {
    const snapshot = this.getSnapshot();
    this.onStateChangeCallbacks.forEach(cb => cb(snapshot, eventMeta));
  }

  log(message, type = 'info') {
    this.history.push({ message, type, time: Date.now() });
    this.onLogCallbacks.forEach(cb => cb(message, type));
  }

  sendEmote(playerKey, emoteText) {
    const sender = this.players[playerKey];
    if (!sender) return;
    this.onEmoteCallbacks.forEach(cb => cb({ playerKey, name: sender.name, emote: emoteText }));
    this.log(`💬 ${sender.name}: "${emoteText}"`, 'emote');
  }

  getActivePlayer() {
    return this.playerList[this.activePlayerIndex];
  }

  getAlivePlayers() {
    return this.playerList.filter(p => p.hp > 0);
  }

  getNextAlivePlayerIndex(fromIndex = this.activePlayerIndex) {
    let nextIdx = (fromIndex + 1) % this.playerList.length;
    let count = 0;
    while (this.playerList[nextIdx].hp <= 0 && count < this.playerList.length) {
      nextIdx = (nextIdx + 1) % this.playerList.length;
      count++;
    }
    return nextIdx;
  }

  // Start / initialize match
  startMatch() {
    this.round = 0;
    this.gameOver = false;
    this.winnerKey = null;

    this.playerList.forEach(p => {
      p.hp = this.maxHp;
      p.items = [];
      p.isJammed = false;
    });

    this.activePlayerIndex = 0;
    this.activePlayerKey = this.playerList[0].key;
    this.isBoosted = false;
    this.opponentStunned = false;
    this.lastPeekedWire = null;

    this.log(`⚡ HIGH VOLTAGE BATTLE INITIATED. ${this.playerList.length} TERMINALS CONNECTED.`, 'system');
    this.startNewRound();
  }

  // Generate wire pool for a new round
  generateWirePool(roundNumber, playerCount = this.playerList.length) {
    const scale = Math.max(1, Math.floor(playerCount / 2));
    const mixes = [
      { live: 1 * scale, dud: 2 * scale },
      { live: 2 * scale, dud: 2 * scale },
      { live: 3 * scale, dud: 2 * scale },
      { live: 3 * scale, dud: 3 * scale },
      { live: 4 * scale, dud: 3 * scale }
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

    // Grant items to all alive players (max 8 per player)
    this.getAlivePlayers().forEach(p => {
      p.isJammed = false;
      for (let i = 0; i < this.itemsPerRound; i++) {
        if (p.items.length < 8) {
          const newItem = window.getRandomItem ? window.getRandomItem() : 'multimeter';
          p.items.push(newItem);
        }
      }
    });

    this.log(`--- ROUND ${this.round} INITIALIZED ---`, 'round');
    this.log(`CHAMBER LOADED: ${this.liveCount} LIVE [⚡] | ${this.dudCount} DUD [⚪]`, 'chamber');

    this.emitStateChange({ type: 'ROUND_STARTED' });
  }

  // Use toolbox item - STRICT TURN CHECK
  useItem(playerKey, itemIndex) {
    if (this.gameOver) return { success: false, reason: 'Game is over' };
    if (playerKey !== this.activePlayerKey) {
      return { success: false, reason: 'Not your turn! You can only use items during your turn.' };
    }

    const player = this.players[playerKey];
    if (player.isJammed) {
      return { success: false, reason: 'Toolbox jammed by Signal Jammer!' };
    }

    if (itemIndex < 0 || itemIndex >= player.items.length) {
      return { success: false, reason: 'Invalid item index' };
    }

    const itemId = player.items[itemIndex];
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
        this.isBoosted = false;
        this.lastPeekedWire = null;
        result.cutWire = cutWire;
        this.log(`✂️ ${player.name} used WIRE CUTTERS! Safely snipped a ${cutWire} wire!`, 'item');

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
        const nextIdx = this.getNextAlivePlayerIndex();
        const nextPlayer = this.playerList[nextIdx];
        this.log(`🧤 ${player.name} equipped INSULATED GLOVE! ${nextPlayer.name}'s next turn will be SKIPPED!`, 'item');
        break;
      }

      case 'circuit_tap': {
        if (this.chamber.length > 1) {
          const shiftedWire = this.chamber.shift();
          this.chamber.push(shiftedWire);
          this.lastPeekedWire = null;
          this.log(`🔁 ${player.name} activated CIRCUIT TAP! Current wire recycled to back of chamber.`, 'item');
        } else {
          this.log(`🔁 ${player.name} activated CIRCUIT TAP (only 1 wire remaining).`, 'item');
        }
        break;
      }

      case 'signal_jammer': {
        const nextIdx = this.getNextAlivePlayerIndex();
        const nextPlayer = this.playerList[nextIdx];
        nextPlayer.isJammed = true;
        this.log(`📡 ${player.name} deployed SIGNAL JAMMER! ${nextPlayer.name}'s toolbox is JAMMED for next turn!`, 'item');
        break;
      }
    }

    this.emitStateChange({ type: 'ITEM_USED', itemId, result, playerKey });
    return result;
  }

  // Shock Action: Target specific player
  shockTarget(shooterKey, targetKey) {
    if (this.gameOver) return { success: false, reason: 'Game is over' };
    if (shooterKey !== this.activePlayerKey) return { success: false, reason: 'Not your turn' };
    if (this.chamber.length === 0) return { success: false, reason: 'Chamber empty' };

    const shooter = this.players[shooterKey];
    const target = this.players[targetKey];
    if (!target || target.hp <= 0) return { success: false, reason: 'Invalid or eliminated target' };

    const isSelf = (shooterKey === targetKey);
    const wire = this.chamber.shift();
    const wasBoosted = this.isBoosted;
    this.lastPeekedWire = null;

    let damage = 0;
    let isLive = (wire === WIRE_TYPES.LIVE);
    let extraTurn = false;

    if (isLive) {
      this.liveCount--;
      damage = wasBoosted ? 2 : 1;
      target.hp = Math.max(0, target.hp - damage);

      if (isSelf) {
        this.log(`💥 LIVE WIRE! ${shooter.name} SHOCKED THEMSELVES for ${damage} HP!`, 'shock-hit');
      } else {
        this.log(`💥 LIVE WIRE! ${shooter.name} SHOCKS ${target.name} for ${damage} HP!`, 'shock-hit');
      }
    } else {
      this.dudCount--;
      if (isSelf) {
        extraTurn = true;
        this.log(`*CLICK* DUD WIRE! ${shooter.name} survived self-shock and EARNS AN EXTRA TURN!`, 'shock-dud');
      } else {
        this.log(`*CLICK* DUD WIRE. ${target.name} takes no damage.`, 'shock-dud');
      }
    }

    this.isBoosted = false;

    // Check target elimination
    if (target.hp <= 0) {
      this.log(`💀 ${target.name} WAS FLATLINED AND ELIMINATED FROM THE CIRCUIT!`, 'shock-hit');
    }

    // Check for match over (only 1 player alive)
    const aliveList = this.getAlivePlayers();
    if (aliveList.length <= 1) {
      this.gameOver = true;
      this.winnerKey = aliveList[0] ? aliveList[0].key : shooterKey;
      const winnerName = this.players[this.winnerKey]?.name || 'Survivor';
      this.log(`🏆 MATCH OVER! ${winnerName} SURVIVED AND WINS THE DUEL!`, 'winner');

      this.emitStateChange({
        type: isSelf ? 'ACTION_SHOCK_SELF' : 'ACTION_SHOCK_OPPONENT',
        wire, damage, wasBoosted, isLive, extraTurn, shooterKey, targetKey
      });

      return { success: true, wire, damage, gameOver: true, winnerKey: this.winnerKey };
    }

    // Determine turn transition
    let turnPassed = true;
    if (isSelf && !isLive) {
      // Dud self-shock: shooter retains turn
      turnPassed = false;
    } else if (this.opponentStunned) {
      this.opponentStunned = false;
      // Glove stun active: skip next player!
      const skippedIdx = this.getNextAlivePlayerIndex();
      const skippedPlayer = this.playerList[skippedIdx];
      this.log(`🧤 ${skippedPlayer.name}'s turn was SKIPPED by Insulated Glove!`, 'stun');
      this.activePlayerIndex = this.getNextAlivePlayerIndex(skippedIdx);
      this.activePlayerKey = this.playerList[this.activePlayerIndex].key;
    } else {
      // Normal turn pass to next alive player
      this.activePlayerIndex = this.getNextAlivePlayerIndex();
      this.activePlayerKey = this.playerList[this.activePlayerIndex].key;
    }

    // Clear jammer on current active player
    const currentActive = this.getActivePlayer();
    currentActive.isJammed = false;

    const chamberEmpty = this.chamber.length === 0;
    this.emitStateChange({
      type: isSelf ? 'ACTION_SHOCK_SELF' : 'ACTION_SHOCK_OPPONENT',
      wire, damage, wasBoosted, isLive, extraTurn, shooterKey, targetKey, turnPassed
    });

    if (chamberEmpty && !this.gameOver) {
      this.startNewRound();
    }

    return { success: true, wire, damage, isLive, extraTurn, turnPassed };
  }

  // Alias helpers for backwards compatibility
  shockOpponent(playerKey, targetKey = null) {
    if (!targetKey) {
      // Default target: next alive player
      const nextIdx = this.getNextAlivePlayerIndex();
      targetKey = this.playerList[nextIdx].key;
    }
    return this.shockTarget(playerKey, targetKey);
  }

  shockSelf(playerKey) {
    return this.shockTarget(playerKey, playerKey);
  }

  getSnapshot() {
    const aliveCount = this.getAlivePlayers().length;
    const isCritical = this.playerList.some(p => p.hp === 1 && p.hp > 0);

    const snapshotPlayers = {};
    this.playerList.forEach(p => {
      snapshotPlayers[p.key] = {
        key: p.key,
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        hp: p.hp,
        items: [...p.items],
        isBot: p.isBot,
        isJammed: p.isJammed,
        isEliminated: p.hp <= 0
      };
    });

    return {
      round: this.round,
      maxHp: this.maxHp,
      itemsPerRound: this.itemsPerRound,
      chamberRemaining: this.chamber.length,
      liveCount: this.liveCount,
      dudCount: this.dudCount,
      isBoosted: this.isBoosted,
      opponentStunned: this.opponentStunned,
      isCriticalVoltage: isCritical,
      activePlayerKey: this.activePlayerKey,
      activePlayerIndex: this.activePlayerIndex,
      playerListKeys: this.playerList.map(p => p.key),
      aliveCount,
      gameOver: this.gameOver,
      winnerKey: this.winnerKey,
      winner: this.winnerKey ? snapshotPlayers[this.winnerKey] : null,
      players: snapshotPlayers
    };
  }
}

window.WIRE_TYPES = WIRE_TYPES;
window.GameEngine = GameEngine;
