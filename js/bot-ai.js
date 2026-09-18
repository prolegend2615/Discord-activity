// Strategic AI Bot ("BOLT-v9") for Short Circuit N-Player Battle

class BotAI {
  constructor(engine, botKey = 'p2') {
    this.engine = engine;
    this.botKey = botKey;
    this.knownCurrentWire = null;
    this.isThinking = false;
  }

  reset() {
    this.knownCurrentWire = null;
    this.isThinking = false;
  }

  getBestTargetKey() {
    const aliveOpponents = this.engine.playerList.filter(p => p.hp > 0 && p.key !== this.botKey);
    if (aliveOpponents.length === 0) return this.botKey;
    // Target opponent with lowest HP to land eliminations
    aliveOpponents.sort((a, b) => a.hp - b.hp);
    return aliveOpponents[0].key;
  }

  getRandomChatter(context) {
    const chatters = {
      scan: [
        'BOLT-v9: Calibrating sensor needles...',
        'BOLT-v9: Running telemetry check on node...',
        'BOLT-v9: Signal spectrum analyzed.'
      ],
      boost: [
        'BOLT-v9: Overriding capacitor safety breaker!',
        'BOLT-v9: Diverting all reserve cells to lethal output.',
        'BOLT-v9: Maximum voltage authorized.'
      ],
      cut: [
        'BOLT-v9: Snipping suspect loop. Safety protocol 404.',
        'BOLT-v9: Deploying wire cutters.'
      ],
      glove: [
        'BOLT-v9: Ground clamp deployed. Next rival locked out.',
        'BOLT-v9: Interlocking rival trigger.'
      ],
      shockOpponent: [
        'BOLT-v9: Discharging node into rival terminal.',
        'BOLT-v9: Calculating 89.4% probability of critical failure... on target.',
        'BOLT-v9: Firing line.'
      ],
      shockSelf: [
        'BOLT-v9: Odds favor a blank. Risking self-grounding.',
        'BOLT-v9: Diverting current to internal test loop...',
        'BOLT-v9: Gambits are within acceptable margins.'
      ]
    };

    const list = chatters[context] || ['BOLT-v9: Processing...'];
    return list[Math.floor(Math.random() * list.length)];
  }

  async thinkAndAct(callback) {
    if (this.isThinking) return;
    this.isThinking = true;

    await this.delay(1200);

    if (this.engine.gameOver || this.engine.activePlayerKey !== this.botKey) {
      this.isThinking = false;
      return;
    }

    const bot = this.engine.players[this.botKey];
    if (!bot || bot.hp <= 0) {
      this.isThinking = false;
      return;
    }

    const totalRemaining = this.engine.liveCount + this.engine.dudCount;
    if (totalRemaining === 0) {
      this.isThinking = false;
      return;
    }

    const targetKey = this.getBestTargetKey();
    const probLive = this.engine.liveCount / totalRemaining;
    const probDud = this.engine.dudCount / totalRemaining;

    // Step 1: Multimeter check
    const multimeterIdx = bot.items.indexOf('multimeter');
    if (multimeterIdx !== -1 && !this.knownCurrentWire && totalRemaining > 1 && !bot.isJammed) {
      this.engine.log(this.getRandomChatter('scan'), 'bot-chatter');
      await this.delay(600);

      const res = this.engine.useItem(this.botKey, multimeterIdx);
      if (res && res.peek) {
        this.knownCurrentWire = res.peek;
        window.soundFX?.playScannerBeep(res.peek === 'LIVE');
      }
      await this.delay(800);
    }

    // Known LIVE wire
    if (this.knownCurrentWire === 'LIVE') {
      const boosterIdx = bot.items.indexOf('voltage_booster');
      if (boosterIdx !== -1 && !this.engine.isBoosted && !bot.isJammed) {
        this.engine.log(this.getRandomChatter('boost'), 'bot-chatter');
        await this.delay(600);
        this.engine.useItem(this.botKey, boosterIdx);
        window.soundFX?.playBooster();
        await this.delay(700);
      }

      this.engine.log(this.getRandomChatter('shockOpponent'), 'bot-chatter');
      await this.delay(600);
      this.knownCurrentWire = null;
      this.isThinking = false;
      this.engine.shockTarget(this.botKey, targetKey);
      if (callback) callback();
      return;
    }

    // Known DUD wire
    if (this.knownCurrentWire === 'DUD') {
      this.engine.log(this.getRandomChatter('shockSelf'), 'bot-chatter');
      await this.delay(600);
      this.knownCurrentWire = null;
      this.isThinking = false;
      this.engine.shockTarget(this.botKey, this.botKey);
      if (callback) callback();
      return;
    }

    // Unknown wire probabilities
    if (probDud >= 0.65 || this.engine.liveCount === 0) {
      this.engine.log(this.getRandomChatter('shockSelf'), 'bot-chatter');
      await this.delay(600);
      this.isThinking = false;
      this.engine.shockTarget(this.botKey, this.botKey);
      if (callback) callback();
      return;
    }

    if (probLive >= 0.60 || this.engine.dudCount === 0) {
      const boosterIdx = bot.items.indexOf('voltage_booster');
      if (boosterIdx !== -1 && !this.engine.isBoosted && !bot.isJammed) {
        this.engine.log(this.getRandomChatter('boost'), 'bot-chatter');
        await this.delay(600);
        this.engine.useItem(this.botKey, boosterIdx);
        window.soundFX?.playBooster();
        await this.delay(700);
      }

      this.engine.log(this.getRandomChatter('shockOpponent'), 'bot-chatter');
      await this.delay(600);
      this.isThinking = false;
      this.engine.shockTarget(this.botKey, targetKey);
      if (callback) callback();
      return;
    }

    const cutterIdx = bot.items.indexOf('wire_cutters');
    if (cutterIdx !== -1 && !bot.isJammed && Math.random() < 0.45) {
      this.engine.log(this.getRandomChatter('cut'), 'bot-chatter');
      await this.delay(600);
      this.engine.useItem(this.botKey, cutterIdx);
      window.soundFX?.playCutters();
      await this.delay(800);
      this.isThinking = false;
      return this.thinkAndAct(callback);
    }

    this.engine.log(this.getRandomChatter('shockOpponent'), 'bot-chatter');
    await this.delay(600);
    this.isThinking = false;
    this.engine.shockTarget(this.botKey, targetKey);
    if (callback) callback();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

window.BotAI = BotAI;
