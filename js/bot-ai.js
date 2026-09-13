// Strategic AI Bot ("BOLT-v9") for Short Circuit

class BotAI {
  constructor(engine, botKey = 'p2') {
    this.engine = engine;
    this.botKey = botKey;
    this.knownCurrentWire = null; // Stored if bot scanned the wire
    this.isThinking = false;
  }

  reset() {
    this.knownCurrentWire = null;
    this.isThinking = false;
  }

  // Generate bot terminal chatter
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
        'BOLT-v9: Ground clamp deployed. You cannot move next cycle.',
        'BOLT-v9: Interlocking rival trigger.'
      ],
      shockOpponent: [
        'BOLT-v9: Discharging node into opponent terminal.',
        'BOLT-v9: Calculating 89.4% probability of critical failure... on you.',
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

    // Simulate realistic terminal calculation delay
    await this.delay(1200);

    if (this.engine.gameOver || this.engine.activePlayerKey !== this.botKey) {
      this.isThinking = false;
      return;
    }

    const bot = this.engine.players[this.botKey];
    const opp = this.engine.getOpponentPlayer();
    const totalRemaining = this.engine.liveCount + this.engine.dudCount;

    if (totalRemaining === 0) {
      this.isThinking = false;
      return;
    }

    const probLive = this.engine.liveCount / totalRemaining;
    const probDud = this.engine.dudCount / totalRemaining;

    // Step 1: Check toolbox items and consider using them
    // Multimeter check
    const multimeterIdx = bot.items.indexOf('multimeter');
    if (multimeterIdx !== -1 && !this.knownCurrentWire && totalRemaining > 1) {
      this.engine.log(this.getRandomChatter('scan'), 'bot-chatter');
      await this.delay(600);

      const res = this.engine.useItem(this.botKey, multimeterIdx);
      if (res && res.peek) {
        this.knownCurrentWire = res.peek;
        window.soundFX?.playScannerBeep(res.peek === 'LIVE');
      }
      await this.delay(800);
    }

    // If bot knows wire is LIVE
    if (this.knownCurrentWire === 'LIVE') {
      // If has Voltage Booster and opponent has >= 2 HP, boost it!
      const boosterIdx = bot.items.indexOf('voltage_booster');
      if (boosterIdx !== -1 && !this.engine.isBoosted && opp.hp > 1) {
        this.engine.log(this.getRandomChatter('boost'), 'bot-chatter');
        await this.delay(600);
        this.engine.useItem(this.botKey, boosterIdx);
        window.soundFX?.playBooster();
        await this.delay(700);
      }

      // If has Insulated Glove and opponent isn't stunned, stun them!
      const gloveIdx = bot.items.indexOf('insulated_glove');
      if (gloveIdx !== -1 && !this.engine.opponentStunned && opp.hp > 2) {
        this.engine.log(this.getRandomChatter('glove'), 'bot-chatter');
        await this.delay(600);
        this.engine.useItem(this.botKey, gloveIdx);
        window.soundFX?.playGlove();
        await this.delay(700);
      }

      // Knowing it's Live, 100% shock opponent
      this.engine.log(this.getRandomChatter('shockOpponent'), 'bot-chatter');
      await this.delay(600);
      this.knownCurrentWire = null;
      this.isThinking = false;
      this.engine.shockOpponent(this.botKey);
      if (callback) callback();
      return;
    }

    // If bot knows wire is DUD
    if (this.knownCurrentWire === 'DUD') {
      // 100% shock self for free bonus turn!
      this.engine.log(this.getRandomChatter('shockSelf'), 'bot-chatter');
      await this.delay(600);
      this.knownCurrentWire = null;
      this.isThinking = false;
      this.engine.shockSelf(this.botKey);
      if (callback) callback();
      return;
    }

    // If wire is unknown: evaluate probabilities
    // High probability of Dud (>= 65% or 100% Dud)
    if (probDud >= 0.65 || this.engine.liveCount === 0) {
      this.engine.log(this.getRandomChatter('shockSelf'), 'bot-chatter');
      await this.delay(600);
      this.isThinking = false;
      this.engine.shockSelf(this.botKey);
      if (callback) callback();
      return;
    }

    // High probability of Live (>= 60% or 100% Live)
    if (probLive >= 0.60 || this.engine.dudCount === 0) {
      // If 100% Live and bot has Wire Cutters and bot is at 1 HP: can use Wire Cutters if it wants to be cautious
      // But shocking opponent with 100% Live is lethal!
      const boosterIdx = bot.items.indexOf('voltage_booster');
      if (boosterIdx !== -1 && !this.engine.isBoosted && probLive > 0.7) {
        this.engine.log(this.getRandomChatter('boost'), 'bot-chatter');
        await this.delay(600);
        this.engine.useItem(this.botKey, boosterIdx);
        window.soundFX?.playBooster();
        await this.delay(700);
      }

      const gloveIdx = bot.items.indexOf('insulated_glove');
      if (gloveIdx !== -1 && !this.engine.opponentStunned) {
        this.engine.log(this.getRandomChatter('glove'), 'bot-chatter');
        await this.delay(600);
        this.engine.useItem(this.botKey, gloveIdx);
        window.soundFX?.playGlove();
        await this.delay(700);
      }

      this.engine.log(this.getRandomChatter('shockOpponent'), 'bot-chatter');
      await this.delay(600);
      this.isThinking = false;
      this.engine.shockOpponent(this.botKey);
      if (callback) callback();
      return;
    }

    // 50/50 or close scenario:
    // If bot has Wire Cutters and has high doubt, snip it
    const cutterIdx = bot.items.indexOf('wire_cutters');
    if (cutterIdx !== -1 && Math.random() < 0.45) {
      this.engine.log(this.getRandomChatter('cut'), 'bot-chatter');
      await this.delay(600);
      this.engine.useItem(this.botKey, cutterIdx);
      window.soundFX?.playCutters();
      await this.delay(800);
      this.isThinking = false;
      // Re-evaluate
      return this.thinkAndAct(callback);
    }

    // Default 50/50 move: target opponent
    this.engine.log(this.getRandomChatter('shockOpponent'), 'bot-chatter');
    await this.delay(600);
    this.isThinking = false;
    this.engine.shockOpponent(this.botKey);
    if (callback) callback();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

window.BotAI = BotAI;
