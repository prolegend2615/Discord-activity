// Main Application Controller for Short Circuit - v2.0 Ultra Polish & Virtual Keyboard

class ShortCircuitApp {
  constructor() {
    this.currentUser = null;
    this.currentMode = 'menu'; // 'menu', 'lobby', 'game'
    this.isBotGame = false;
    this.lobbyRole = 'host'; // 'host', 'opponent', 'spectator'
    this.lobbySettings = { maxHp: 3, itemsPerRound: 1 };
    this.lobbyOpponent = null;
    this.lobbySpectators = [];

    this.engine = null;
    this.botAI = null;
    this.canvasFX = null;

    this.criticalTimer = null;
    this.criticalTimeLeft = 10;
    this.mobilePendingItem = null;

    this.vkBuffer = '';

    this.init();
  }

  async init() {
    // 1. Initialize Canvas FX for oscilloscope & sparks
    this.canvasFX = new CanvasFX('oscilloscope-canvas');

    // 2. Initialize Discord Bridge & Player profile
    this.currentUser = await window.discordBridge.init();

    // Check for custom saved handle
    const savedHandle = localStorage.getItem('SC_USER_HANDLE');
    if (savedHandle && savedHandle.trim().length > 0) {
      this.currentUser.username = savedHandle.trim();
    }

    this.updateHeaderProfile();
    this.updateMainMenuRecord();

    // 3. Attach UI Event Listeners & Virtual Keyboard
    this.setupEventListeners();
    this.setupVirtualKeyboard();

    // 4. Check URL for join code (e.g. ?room=X7K9P)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      this.joinRoomByCode(roomParam);
    } else {
      this.switchScreen('screen-main-menu');
    }
  }

  updateHeaderProfile() {
    const avatarImg = document.getElementById('header-avatar-img');
    const usernameEl = document.getElementById('header-username');
    const statusEl = document.getElementById('header-status');

    if (this.currentUser) {
      if (avatarImg) avatarImg.src = this.currentUser.avatar;
      if (usernameEl) usernameEl.textContent = this.currentUser.username;
      if (statusEl) {
        statusEl.textContent = this.currentUser.isDiscordUser ? 'DISCORD CONNECTED' : 'TERMINAL READY';
      }
    }
  }

  setupVirtualKeyboard() {
    this.vkBuffer = this.currentUser ? this.currentUser.username : 'RUNNER_001';
    this.updateVKDisplay();

    // Letter / symbol key presses
    document.querySelectorAll('.vk-key[data-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.soundFX?.playClick();
        if (this.vkBuffer.length < 16) {
          const char = btn.getAttribute('data-key');
          this.vkBuffer += char;
          this.updateVKDisplay();
        }
      });
    });

    // Special VK actions
    document.getElementById('vk-btn-clear')?.addEventListener('click', () => {
      window.soundFX?.playClick();
      this.vkBuffer = '';
      this.updateVKDisplay();
    });

    document.getElementById('vk-btn-backspace')?.addEventListener('click', () => {
      window.soundFX?.playClick();
      this.vkBuffer = this.vkBuffer.slice(0, -1);
      this.updateVKDisplay();
    });

    document.getElementById('vk-btn-space')?.addEventListener('click', () => {
      window.soundFX?.playClick();
      if (this.vkBuffer.length < 16) {
        this.vkBuffer += ' ';
        this.updateVKDisplay();
      }
    });

    document.getElementById('vk-btn-submit')?.addEventListener('click', () => {
      window.soundFX?.playClick();
      const newHandle = this.vkBuffer.trim();
      if (newHandle.length > 0) {
        this.currentUser.username = newHandle;
        localStorage.setItem('SC_USER_HANDLE', newHandle);
        this.updateHeaderProfile();
        this.closeModal('modal-virtual-keyboard');
        this.showToast(`Handle updated to ${newHandle}!`);
      }
    });

    document.getElementById('btn-edit-username')?.addEventListener('click', () => {
      window.soundFX?.playClick();
      this.vkBuffer = this.currentUser.username;
      this.updateVKDisplay();
      this.openModal('modal-virtual-keyboard');
    });

    document.getElementById('btn-menu-virtual-kb')?.addEventListener('click', () => {
      window.soundFX?.playClick();
      this.vkBuffer = this.currentUser.username;
      this.updateVKDisplay();
      this.openModal('modal-virtual-keyboard');
    });
  }

  updateVKDisplay() {
    const disp = document.getElementById('vk-display');
    if (disp) {
      disp.textContent = this.vkBuffer.length > 0 ? this.vkBuffer : '_';
    }
  }

  getRecord() {
    try {
      const data = localStorage.getItem('SC_MATCH_RECORD');
      return data ? JSON.parse(data) : { wins: 0, losses: 0 };
    } catch (e) {
      return { wins: 0, losses: 0 };
    }
  }

  saveRecord(isWin) {
    const rec = this.getRecord();
    if (isWin) rec.wins++;
    else rec.losses++;
    try {
      localStorage.setItem('SC_MATCH_RECORD', JSON.stringify(rec));
    } catch (e) {}
    this.updateMainMenuRecord();
  }

  updateMainMenuRecord() {
    const rec = this.getRecord();
    const statsEl = document.getElementById('main-menu-stats');
    if (statsEl) {
      statsEl.textContent = `RECORD: ${rec.wins} WINS / ${rec.losses} LOSSES`;
    }
  }

  showToast(msg, duration = 2500) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, duration);
  }

  switchScreen(screenId) {
    document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
    }
    this.currentMode = screenId.replace('screen-', '');

    if (screenId === 'screen-game' && this.canvasFX) {
      setTimeout(() => this.canvasFX.resize(), 50);
    }
  }

  setupEventListeners() {
    // Audio initial unlock on any first click
    document.addEventListener('click', () => {
      window.soundFX?.init();
    }, { once: true });

    // Audio Mute Toggle
    const muteBtn = document.getElementById('audio-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = window.soundFX.toggleMute();
        muteBtn.textContent = isMuted ? '🔇 AUDIO: MUTED' : '🔊 AUDIO: ON';
        muteBtn.style.borderColor = isMuted ? 'var(--neon-pink)' : 'var(--border-dim)';
      });
    }

    // Main Menu Buttons
    document.getElementById('btn-play-bot')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.startBotMatch();
    });

    document.getElementById('btn-host-room')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.setupHostLobby();
    });

    document.getElementById('btn-open-join')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.openModal('modal-join-room');
    });

    // Modals Navigation (Footer links)
    document.getElementById('nav-how-to-play')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.openModal('modal-how-to-play');
    });

    document.getElementById('nav-settings')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.openModal('modal-settings');
    });

    // Close Modals
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-close');
        this.closeModal(modalId);
      });
    });

    // How to Play Tabs
    document.querySelectorAll('.rules-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        window.soundFX.playClick();
        const cardIndex = tab.getAttribute('data-card');
        document.querySelectorAll('.rules-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.rules-card-content').forEach(c => c.style.display = 'none');
        const activeCard = document.getElementById(`rules-card-${cardIndex}`);
        if (activeCard) activeCard.style.display = 'block';
      });
    });

    // Settings Sliders & Toggles
    const masterSlider = document.getElementById('slider-master-volume');
    if (masterSlider) {
      masterSlider.addEventListener('input', (e) => {
        window.soundFX.setMasterVolume(e.target.value / 100);
      });
    }

    const sfxSlider = document.getElementById('slider-sfx-volume');
    if (sfxSlider) {
      sfxSlider.addEventListener('input', (e) => {
        window.soundFX.setSFXVolume(e.target.value / 100);
      });
    }

    const shakeToggle = document.getElementById('toggle-screen-shake');
    if (shakeToggle) {
      shakeToggle.addEventListener('change', (e) => {
        if (this.canvasFX) this.canvasFX.screenShakeEnabled = e.target.checked;
      });
    }

    const colorblindToggle = document.getElementById('toggle-colorblind');
    if (colorblindToggle) {
      colorblindToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          document.body.classList.add('colorblind-mode');
        } else {
          document.body.classList.remove('colorblind-mode');
        }
      });
    }

    // Join Room Submission
    document.getElementById('btn-submit-join')?.addEventListener('click', () => {
      const input = document.getElementById('join-code-input');
      const code = input ? input.value.trim().toUpperCase() : '';
      if (code) {
        this.closeModal('modal-join-room');
        this.joinRoomByCode(code);
      }
    });

    // Lobby: Copy Code
    document.getElementById('copy-room-code-btn')?.addEventListener('click', () => {
      const codeEl = document.getElementById('lobby-room-code');
      if (codeEl) {
        const code = codeEl.textContent.replace('#', '');
        navigator.clipboard?.writeText(code);
        this.showToast(`Room code #${code} copied to clipboard!`);
        window.soundFX.playClick();
      }
    });

    // Lobby: Invite Discord Friends
    document.getElementById('btn-discord-invite')?.addEventListener('click', async () => {
      window.soundFX.playClick();
      const res = await window.discordBridge.openInviteDialog();
      if (!res.native) {
        const codeEl = document.getElementById('lobby-room-code');
        const code = codeEl ? codeEl.textContent : '';
        navigator.clipboard?.writeText(window.location.origin + window.location.pathname + '?room=' + code.replace('#', ''));
        this.showToast('Invite link copied to clipboard!');
      }
    });

    // Lobby: Add AI Bot
    document.getElementById('btn-lobby-add-bot')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.lobbyOpponent = {
        id: 'bot_bolt9',
        name: 'BOLT-v9 (AI)',
        avatar: window.discordBridge.generateNeonAvatar('BOLT-v9', true),
        isBot: true,
        ready: true
      };
      this.updateLobbyUI();
    });

    // Lobby: Kick Seat 2 (Host Only)
    document.getElementById('btn-kick-seat2')?.addEventListener('click', () => {
      if (this.lobbyRole !== 'host') return;
      window.soundFX.playClick();
      if (this.lobbyOpponent) {
        if (!this.lobbyOpponent.isBot && window.multiplayerManager) {
          window.multiplayerManager.sendKickPlayer(this.lobbyOpponent.id);
        }
        this.lobbyOpponent = null;
        this.updateLobbyUI();
      }
    });

    // Lobby: Settings Toggles (HP & Items)
    document.querySelectorAll('#hp-toggle-group .toggle-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.lobbyRole !== 'host') return;
        window.soundFX.playClick();
        document.querySelectorAll('#hp-toggle-group .toggle-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.lobbySettings.maxHp = parseInt(btn.dataset.val, 10);
        window.multiplayerManager?.updateSettings({ maxHp: this.lobbySettings.maxHp });
      });
    });

    document.querySelectorAll('#items-toggle-group .toggle-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.lobbyRole !== 'host') return;
        window.soundFX.playClick();
        document.querySelectorAll('#items-toggle-group .toggle-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.lobbySettings.itemsPerRound = parseInt(btn.dataset.val, 10);
        window.multiplayerManager?.updateSettings({ itemsPerRound: this.lobbySettings.itemsPerRound });
      });
    });

    // Lobby: Start Match
    document.getElementById('btn-start-match')?.addEventListener('click', () => {
      window.soundFX.playClick();
      if (this.lobbyOpponent?.isBot) {
        this.launchGame(this.currentUser, this.lobbyOpponent, this.lobbySettings);
      } else {
        window.multiplayerManager.sendStartMatch({});
      }
    });

    // Lobby: Leave Room
    document.getElementById('btn-leave-lobby')?.addEventListener('click', () => {
      window.soundFX.playClick();
      window.multiplayerManager.leaveRoom();
      this.switchScreen('screen-main-menu');
    });

    // Primary In-Game Shock Buttons
    document.getElementById('btn-shock-opponent')?.addEventListener('click', () => {
      this.handlePlayerShock(false);
    });

    document.getElementById('btn-shock-self')?.addEventListener('click', () => {
      this.handlePlayerShock(true);
    });

    // Bluff Emote Buttons
    document.querySelectorAll('.bluff-emote-dock .emote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emote = btn.dataset.emote;
        this.triggerEmote('p1', emote);
      });
    });

    // Mobile Item Modal Confirm
    document.getElementById('btn-confirm-mobile-use')?.addEventListener('click', () => {
      this.closeModal('modal-mobile-item');
      if (this.mobilePendingItem) {
        const { playerKey, itemIndex, itemType } = this.mobilePendingItem;
        this.executeItemUse(playerKey, itemIndex, itemType);
        this.mobilePendingItem = null;
      }
    });

    // Match Over Buttons
    document.getElementById('btn-rematch')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.closeModal('modal-match-over');
      if (this.isBotGame) {
        this.startBotMatch();
      } else {
        this.switchScreen('screen-lobby');
      }
    });

    document.getElementById('btn-match-over-menu')?.addEventListener('click', () => {
      window.soundFX.playClick();
      this.closeModal('modal-match-over');
      window.multiplayerManager?.leaveRoom();
      this.switchScreen('screen-main-menu');
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  triggerEmote(playerKey, emoteText) {
    window.soundFX.playEmote();
    const bubble = document.getElementById(`${playerKey}-emote-bubble`);
    if (bubble) {
      bubble.textContent = `${emoteText}`;
      bubble.style.display = 'block';
      setTimeout(() => {
        bubble.style.display = 'none';
      }, 2500);
    }
    if (this.engine) {
      this.engine.sendEmote(playerKey, emoteText);
    }
    if (!this.isBotGame && window.multiplayerManager) {
      window.multiplayerManager.sendGameAction({
        type: 'EMOTE',
        playerKey,
        emoteText
      }, this.currentUser.id);
    }
  }

  // Quick Start vs AI Bot
  startBotMatch() {
    this.isBotGame = true;
    const botUser = {
      id: 'bot_bolt9',
      name: 'BOLT-v9 (AI)',
      avatar: window.discordBridge.generateNeonAvatar('BOLT-v9', true),
      isBot: true
    };
    this.launchGame(this.currentUser, botUser, { maxHp: 3, itemsPerRound: 1 });
  }

  // Setup Host Room
  setupHostLobby() {
    this.isBotGame = false;
    this.lobbyRole = 'host';
    this.lobbyOpponent = null;
    this.lobbySpectators = [];

    const randomRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomState = window.multiplayerManager.initRoom(randomRoomId, this.currentUser, true, this.lobbySettings);

    document.getElementById('lobby-room-code').textContent = `#${randomRoomId}`;

    // Host Seat setup
    document.getElementById('seat1-avatar-img').src = this.currentUser.avatar;
    document.getElementById('seat1-name').textContent = this.currentUser.username;
    document.getElementById('seat1-status').textContent = 'READY (HOST)';

    // Reset Opponent seat & roster
    this.updateLobbyUI();

    // Attach multiplayer callbacks
    window.multiplayerManager.onRoomUpdate = (state, role) => {
      this.lobbyRole = role;
      if (state.opponent) {
        this.lobbyOpponent = state.opponent;
      } else if (!this.lobbyOpponent?.isBot) {
        this.lobbyOpponent = null;
      }
      this.lobbySpectators = state.spectators || [];
      this.updateLobbyUI();
    };

    window.multiplayerManager.onKicked = (msg) => {
      this.showToast(msg || 'You were kicked from the room.');
      this.switchScreen('screen-main-menu');
    };

    window.multiplayerManager.onMatchStart = (payload) => {
      const p1 = window.multiplayerManager.localRoomState.host;
      const p2 = window.multiplayerManager.localRoomState.opponent;
      this.launchGame(p1, p2, payload.settings || this.lobbySettings);
    };

    this.switchScreen('screen-lobby');
  }

  // Join Room by Code
  joinRoomByCode(code) {
    this.isBotGame = false;
    this.lobbyRole = 'opponent';
    const roomState = window.multiplayerManager.initRoom(code, this.currentUser, false, this.lobbySettings);

    document.getElementById('lobby-room-code').textContent = `#${code}`;
    document.getElementById('seat2-avatar-img').src = this.currentUser.avatar;
    document.getElementById('seat2-name').textContent = this.currentUser.username;
    document.getElementById('seat2-status').textContent = 'READY';

    // Hide host controls for guest
    document.querySelectorAll('.toggle-choice').forEach(b => b.disabled = true);
    document.getElementById('btn-start-match').style.display = 'none';

    window.multiplayerManager.onRoomUpdate = (state, role) => {
      this.lobbyRole = role;
      if (state.host) {
        document.getElementById('seat1-avatar-img').src = state.host.avatar || window.discordBridge.generateNeonAvatar(state.host.name);
        document.getElementById('seat1-name').textContent = state.host.name;
      }
      this.lobbySpectators = state.spectators || [];
      this.updateLobbyUI();
    };

    window.multiplayerManager.onKicked = (msg) => {
      this.showToast(msg || 'You were kicked from the room by host.');
      this.switchScreen('screen-main-menu');
    };

    window.multiplayerManager.onMatchStart = (payload) => {
      const p1 = window.multiplayerManager.localRoomState.host;
      const p2 = window.multiplayerManager.localRoomState.opponent;
      this.launchGame(p1, p2, payload.settings || this.lobbySettings);
    };

    this.switchScreen('screen-lobby');
  }

  updateLobbyUI() {
    const seat2Name = document.getElementById('seat2-name');
    const seat2Status = document.getElementById('seat2-status');
    const seat2AvatarImg = document.getElementById('seat2-avatar-img');
    const addBotBtn = document.getElementById('btn-lobby-add-bot');
    const kickSeat2Btn = document.getElementById('btn-kick-seat2');
    const startBtn = document.getElementById('btn-start-match');

    if (this.lobbyOpponent) {
      if (seat2Name) seat2Name.textContent = this.lobbyOpponent.name;
      if (seat2Status) {
        seat2Status.textContent = 'READY';
        seat2Status.className = 'status-pill ready';
      }
      if (seat2AvatarImg) seat2AvatarImg.src = this.lobbyOpponent.avatar;
      if (addBotBtn) addBotBtn.style.display = 'none';
      if (kickSeat2Btn) {
        kickSeat2Btn.style.display = (this.lobbyRole === 'host') ? 'inline-flex' : 'none';
      }
      if (startBtn) startBtn.disabled = false;
    } else {
      if (seat2Name) seat2Name.textContent = 'Waiting for challenger...';
      if (seat2Status) {
        seat2Status.textContent = 'EMPTY';
        seat2Status.className = 'status-pill waiting';
      }
      if (seat2AvatarImg) seat2AvatarImg.src = '';
      if (addBotBtn && this.lobbyRole === 'host') addBotBtn.style.display = 'inline-flex';
      if (kickSeat2Btn) kickSeat2Btn.style.display = 'none';
      if (startBtn) startBtn.disabled = true;
    }

    // Render Spectator Bench Roster (up to 4 spectators, total 6 players in room)
    const specGrid = document.getElementById('spectator-slots-grid');
    if (specGrid) {
      specGrid.innerHTML = '';
      const maxSpecs = 4;
      for (let i = 0; i < maxSpecs; i++) {
        const spec = this.lobbySpectators[i];
        const chip = document.createElement('div');
        chip.className = 'spectator-chip';

        if (spec) {
          chip.innerHTML = `<span>👀 ${spec.name}</span>`;
          if (this.lobbyRole === 'host') {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'btn-kick';
            kickBtn.style.fontSize = '9px';
            kickBtn.style.padding = '2px 6px';
            kickBtn.textContent = 'KICK';
            kickBtn.addEventListener('click', () => {
              window.soundFX?.playClick();
              if (window.multiplayerManager) window.multiplayerManager.sendKickPlayer(spec.id);
            });
            chip.appendChild(kickBtn);
          }
        } else {
          chip.classList.add('empty');
          chip.textContent = 'EMPTY BENCH SLOT';
        }
        specGrid.appendChild(chip);
      }
    }
  }

  // Launch In-Game Workbench
  launchGame(p1Data, p2Data, settings) {
    this.engine = new GameEngine({
      maxHp: settings.maxHp || 3,
      itemsPerRound: settings.itemsPerRound || 1,
      p1: p1Data,
      p2: p2Data
    });

    if (p2Data.isBot) {
      this.botAI = new BotAI(this.engine, 'p2');
    } else {
      this.botAI = null;
    }

    // Engine Callbacks
    this.engine.onStateChange((snapshot, eventMeta) => {
      this.renderHUD(snapshot, eventMeta);
      this.handleGameEvents(snapshot, eventMeta);
    });

    this.engine.onLog((msg, type) => {
      this.appendCombatLogTypewriter(msg, type);
    });

    this.engine.onEmote(({ playerKey, name, emote }) => {
      this.triggerEmote(playerKey, emote);
    });

    // Multiplayer relay listener
    if (!this.isBotGame && window.multiplayerManager) {
      window.multiplayerManager.onGameAction = (action, senderId) => {
        if (senderId !== this.currentUser.id) {
          if (action.type === 'SHOCK_OPPONENT') {
            this.engine.shockOpponent(action.playerKey);
          } else if (action.type === 'SHOCK_SELF') {
            this.engine.shockSelf(action.playerKey);
          } else if (action.type === 'USE_ITEM') {
            this.engine.useItem(action.playerKey, action.itemIndex);
          } else if (action.type === 'EMOTE') {
            this.triggerEmote(action.playerKey, action.emoteText);
          }
        }
      };
    }

    // Clear log
    const logContainer = document.getElementById('combat-log');
    if (logContainer) logContainer.innerHTML = '';

    // Switch to game screen
    this.switchScreen('screen-game');

    // Start ambient music
    const liveRatio = this.engine.liveCount / (this.engine.liveCount + this.engine.dudCount || 1);
    window.soundFX.startAmbient(liveRatio);
    window.soundFX.playChamberReload();

    // Start engine match
    this.engine.startMatch();
  }

  // Typewriter Combat Log Entry
  appendCombatLogTypewriter(text, type = 'info') {
    const log = document.getElementById('combat-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    log.appendChild(entry);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < text.length) {
        entry.textContent += text.charAt(idx);
        idx++;
        log.scrollTop = log.scrollHeight;
      } else {
        clearInterval(interval);
      }
    }, 14);
  }

  // Render complete HUD state with explicit player names
  renderHUD(state, eventMeta = {}) {
    // 1. Chamber / Wire pool tracker
    const liveEl = document.getElementById('hud-live-count');
    const dudEl = document.getElementById('hud-dud-count');
    const roundEl = document.getElementById('round-indicator');
    const boosterTag = document.getElementById('hud-booster-tag');
    const spectatorTag = document.getElementById('hud-spectator-tag');
    const criticalTag = document.getElementById('critical-timer-tag');

    if (liveEl) liveEl.textContent = state.liveCount;
    if (dudEl) dudEl.textContent = state.dudCount;
    if (roundEl) roundEl.textContent = `ROUND ${state.round}`;
    if (boosterTag) {
      if (state.isBoosted) boosterTag.classList.add('active');
      else boosterTag.classList.remove('active');
    }

    if (spectatorTag) {
      spectatorTag.style.display = (this.lobbyRole === 'spectator') ? 'inline-block' : 'none';
    }

    // Update ambient music intensity based on wire ratio
    const totalRemaining = state.liveCount + state.dudCount;
    if (totalRemaining > 0) {
      window.soundFX.updateAmbientIntensity(state.liveCount / totalRemaining);
    }

    // Tension layer on <= 1 HP
    if (state.isCriticalVoltage) {
      window.soundFX.startTension();
    } else {
      window.soundFX.stopTension();
    }

    // 2. Player 1 Station
    const p1 = state.players.p1;
    document.getElementById('p1-hud-name').textContent = p1.name;
    document.getElementById('p1-hud-avatar').src = p1.avatar || window.discordBridge.generateNeonAvatar(p1.name);
    document.getElementById('p1-hp-label').textContent = `${p1.hp} / ${state.maxHp} HP`;
    this.renderHealthCells('p1-cells', p1.hp, state.maxHp);
    this.renderInventory('p1-tool-slots', p1.items, 'p1', p1.isJammed);

    // 3. Player 2 Station
    const p2 = state.players.p2;
    document.getElementById('p2-hud-name').textContent = p2.name;
    document.getElementById('p2-hud-avatar').src = p2.avatar || window.discordBridge.generateNeonAvatar(p2.name, p2.isBot);
    document.getElementById('p2-hp-label').textContent = `${p2.hp} / ${state.maxHp} HP`;
    this.renderHealthCells('p2-cells', p2.hp, state.maxHp);
    this.renderInventory('p2-tool-slots', p2.items, 'p2', p2.isJammed);

    // Critical Voltage Styling & Timer
    const station1 = document.getElementById('station-p1');
    const station2 = document.getElementById('station-p2');
    if (p1.hp <= 1) station1?.classList.add('critical-voltage-active');
    else station1?.classList.remove('critical-voltage-active');

    if (p2.hp <= 1) station2?.classList.add('critical-voltage-active');
    else station2?.classList.remove('critical-voltage-active');

    // Turn Indicators & Explicit Player Names for Node Banner
    const oscStatus = document.getElementById('osc-status-text');
    const activePlayerName = (state.activePlayerKey === 'p1') ? p1.name : p2.name;
    const oppPlayerName = (state.activePlayerKey === 'p1') ? p2.name : p1.name;

    if (state.activePlayerKey === 'p1') {
      station1?.classList.add('active-turn');
      station2?.classList.remove('active-turn');
      if (oscStatus) {
        oscStatus.textContent = `⚡ [${p1.name.toUpperCase()}] HAS THE CIRCUIT NODE`;
        oscStatus.style.color = 'var(--neon-cyan)';
      }
    } else {
      station2?.classList.add('active-turn');
      station1?.classList.remove('active-turn');
      if (oscStatus) {
        oscStatus.textContent = `⚡ [${p2.name.toUpperCase()}] HAS THE CIRCUIT NODE`;
        oscStatus.style.color = 'var(--neon-pink)';
      }
    }

    // Subtitle on shock opponent button showing target name
    const subShockOpp = document.getElementById('sub-shock-opponent');
    if (subShockOpp) {
      subShockOpp.textContent = `Target [${oppPlayerName.toUpperCase()}] terminal (Damage if Live)`;
    }

    // Manage 10-Second Critical Voltage Timer for Active Player
    this.manageCriticalTimer(state);

    // 5. Button enable / disable
    const isMyTurn = this.isBotGame
      ? state.activePlayerKey === 'p1'
      : (this.lobbyRole === 'host' ? state.activePlayerKey === 'p1' : (this.lobbyRole === 'opponent' ? state.activePlayerKey === 'p2' : false));

    const shockOpponentBtn = document.getElementById('btn-shock-opponent');
    const shockSelfBtn = document.getElementById('btn-shock-self');

    if (shockOpponentBtn) shockOpponentBtn.disabled = !isMyTurn || state.gameOver;
    if (shockSelfBtn) shockSelfBtn.disabled = !isMyTurn || state.gameOver;
  }

  manageCriticalTimer(state) {
    const criticalTag = document.getElementById('critical-timer-tag');
    const activePlayer = state.players[state.activePlayerKey];

    if (activePlayer && activePlayer.hp <= 1 && !state.gameOver) {
      if (criticalTag) {
        criticalTag.style.display = 'inline-block';
        criticalTag.textContent = `CRITICAL VOLTAGE: ${this.criticalTimeLeft}s`;
      }

      if (!this.criticalTimer) {
        this.criticalTimeLeft = 10;
        this.criticalTimer = setInterval(() => {
          this.criticalTimeLeft--;
          window.soundFX.playCriticalAlarm();
          if (criticalTag) criticalTag.textContent = `CRITICAL VOLTAGE: ${this.criticalTimeLeft}s`;

          if (this.criticalTimeLeft <= 0) {
            clearInterval(this.criticalTimer);
            this.criticalTimer = null;
            // Timeout auto-action: shock opponent
            const isMyTurn = this.isBotGame
              ? state.activePlayerKey === 'p1'
              : (this.lobbyRole === 'host' ? state.activePlayerKey === 'p1' : state.activePlayerKey === 'p2');
            if (isMyTurn && !state.gameOver) {
              this.showToast('TIME EXPIRED! AUTO-DISCHARGING NODE!');
              this.handlePlayerShock(false);
            }
          }
        }, 1000);
      }
    } else {
      if (this.criticalTimer) {
        clearInterval(this.criticalTimer);
        this.criticalTimer = null;
      }
      if (criticalTag) criticalTag.style.display = 'none';
    }
  }

  renderHealthCells(containerId, currentHp, maxHp) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < maxHp; i++) {
      const cell = document.createElement('div');
      cell.className = 'voltage-cell';

      if (i < currentHp) {
        cell.classList.add('charged');
        if (currentHp === 1) {
          cell.classList.add('danger');
        } else if (currentHp === 2 && maxHp > 3) {
          cell.classList.add('warning');
        }
      }
      container.appendChild(cell);
    }
  }

  renderInventory(containerId, items, playerKey, isJammed = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const isMyTurn = this.isBotGame
      ? this.engine.activePlayerKey === 'p1'
      : (this.lobbyRole === 'host' ? this.engine.activePlayerKey === 'p1' : (this.lobbyRole === 'opponent' ? this.engine.activePlayerKey === 'p2' : false));

    const isSpectator = (this.lobbyRole === 'spectator');
    const canUse = (playerKey === 'p1' && isMyTurn && !this.engine.gameOver && !isJammed);

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.className = 'tool-slot';

      if (isJammed) slot.classList.add('jammed-slot');

      if (i < items.length) {
        if (isSpectator) {
          slot.textContent = '❓';
          slot.classList.add('masked');
        } else {
          const itemType = items[i];
          const itemDef = window.ITEMS[itemType];
          slot.textContent = itemDef?.icon || '⚙️';
          slot.title = `${itemDef?.name || itemType}: ${itemDef?.description || ''}`;

          const badge = document.createElement('span');
          badge.className = 'slot-badge';
          badge.textContent = itemDef?.shortName || '';
          slot.appendChild(badge);

          if (canUse) {
            slot.addEventListener('click', () => {
              if (window.innerWidth < 640) {
                this.mobilePendingItem = { playerKey, itemIndex: i, itemType };
                this.showMobileItemModal(itemDef);
              } else {
                this.executeItemUse(playerKey, i, itemType);
              }
            });
          }
        }
      } else {
        slot.classList.add('empty');
      }

      container.appendChild(slot);
    }
  }

  showMobileItemModal(itemDef) {
    const icon = document.getElementById('mobile-item-icon');
    const title = document.getElementById('mobile-item-title');
    const desc = document.getElementById('mobile-item-desc');
    if (icon) icon.textContent = itemDef.icon;
    if (title) title.textContent = itemDef.name;
    if (desc) desc.textContent = itemDef.description;
    this.openModal('modal-mobile-item');
  }

  executeItemUse(playerKey, itemIndex, itemType) {
    window.soundFX.playClick();

    const res = this.engine.useItem(playerKey, itemIndex);
    if (!res || !res.success) {
      if (res?.reason) this.showToast(res.reason);
      return;
    }

    if (!this.isBotGame && window.multiplayerManager) {
      window.multiplayerManager.sendGameAction({
        type: 'USE_ITEM',
        playerKey,
        itemIndex
      }, this.currentUser.id);
    }

    if (itemType === 'multimeter') {
      window.soundFX.playScannerBeep(res.peek === 'LIVE');
      this.showSecretPeek(res.peek);
    } else if (itemType === 'wire_cutters') {
      window.soundFX.playCutters();
      this.canvasFX.setState('dud');
      setTimeout(() => this.canvasFX.setState('idle'), 400);
    } else if (itemType === 'voltage_booster') {
      window.soundFX.playBooster();
    } else if (itemType === 'insulated_glove') {
      window.soundFX.playGlove();
    } else if (itemType === 'circuit_tap') {
      window.soundFX.playCircuitTap();
    } else if (itemType === 'signal_jammer') {
      window.soundFX.playJammer();
    }
  }

  showSecretPeek(wireType) {
    const toast = document.getElementById('peek-toast');
    const icon = document.getElementById('peek-icon');
    const text = document.getElementById('peek-text');
    if (!toast) return;

    if (wireType === 'LIVE') {
      icon.textContent = '⚡';
      text.textContent = 'CHAMBER: LIVE WIRE';
      text.style.color = 'var(--neon-pink)';
    } else {
      icon.textContent = '⚪';
      text.textContent = 'CHAMBER: DUD WIRE';
      text.style.color = 'var(--neon-cyan)';
    }

    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2200);
  }

  // Handle Player Primary Shock with 3-Second Intense Buildup Beat Sequence
  async handlePlayerShock(isSelf) {
    const playerKey = this.isBotGame
      ? 'p1'
      : (this.lobbyRole === 'host' ? 'p1' : 'p2');

    if (this.engine.activePlayerKey !== playerKey || this.engine.gameOver) return;

    // Disable buttons immediately
    document.getElementById('btn-shock-opponent').disabled = true;
    document.getElementById('btn-shock-self').disabled = true;

    // Clear critical timer during resolution
    if (this.criticalTimer) {
      clearInterval(this.criticalTimer);
      this.criticalTimer = null;
    }

    // Relay action if multiplayer
    if (!this.isBotGame && window.multiplayerManager) {
      window.multiplayerManager.sendGameAction({
        type: isSelf ? 'SHOCK_SELF' : 'SHOCK_OPPONENT',
        playerKey
      }, this.currentUser.id);
    }

    // ── 3-SECOND INTENSE BEAT BUILDUP & REVEAL SEQUENCE ──────────────────────
    const oscStatus = document.getElementById('osc-status-text');
    const activeName = this.engine.getActivePlayer().name;
    if (oscStatus) {
      oscStatus.textContent = `⚡ [${activeName.toUpperCase()}] CHARGING NODE... REVEAL IN 3s`;
      oscStatus.style.color = 'var(--neon-amber)';
    }

    this.canvasFX.setState('buildup');

    // Play procedural 3-second intense buildup beat
    await window.soundFX.playIntenseRevealBeat(3000);

    // ── REVEAL MOMENT ────────────────────────────────────────────────────────
    if (isSelf) {
      this.engine.shockSelf(playerKey);
    } else {
      this.engine.shockOpponent(playerKey);
    }
  }

  // Handle game events and animations
  async handleGameEvents(snapshot, eventMeta) {
    const { type, isLive, damage, wasBoosted, extraTurn, shooterKey, targetKey } = eventMeta;

    if (type === 'ACTION_SHOCK_OPPONENT' || type === 'ACTION_SHOCK_SELF') {
      if (isLive) {
        window.soundFX.playShockZap(wasBoosted);
        this.canvasFX.setState('shock');
        this.canvasFX.triggerSparks(0.5, 0.5, wasBoosted ? 55 : 35, '#ff0055');

        const hitTargetStation = (targetKey === 'p1') ? 'station-p1' : (type === 'ACTION_SHOCK_SELF' ? (shooterKey === 'p1' ? 'station-p1' : 'station-p2') : 'station-p2');
        this.canvasFX.triggerHitFlash(hitTargetStation, '#ff0055');
      } else {
        window.soundFX.playDudClick();
        this.canvasFX.setState('dud');
      }

      await this.delay(650);
      this.canvasFX.setState('idle');

      if (extraTurn) {
        this.showToast('EXTRA TURN EARNED! DUD SURVIVED.');
      }
    }

    // Check Match Over
    if (snapshot.gameOver) {
      await this.delay(800);
      this.showMatchOver(snapshot);
      return;
    }

    // Trigger AI Bot turn if needed
    if (snapshot.activePlayerKey === 'p2' && snapshot.players.p2.isBot && !snapshot.gameOver) {
      this.botAI.thinkAndAct();
    }
  }

  showMatchOver(snapshot) {
    window.soundFX.stopAmbient();
    window.soundFX.stopTension();

    if (this.criticalTimer) {
      clearInterval(this.criticalTimer);
      this.criticalTimer = null;
    }

    const winnerKey = snapshot.winner;
    const winner = snapshot.players[winnerKey];
    const isPlayer1Winner = (winnerKey === 'p1');

    const winnerAvatarImg = document.getElementById('winner-avatar-img');
    const winnerTitle = document.getElementById('winner-title');
    const winnerMsg = document.getElementById('winner-message');

    if (winnerAvatarImg) {
      winnerAvatarImg.src = winner.avatar || window.discordBridge.generateNeonAvatar(winner.name, winner.isBot);
    }

    const amIWinner = this.isBotGame
      ? isPlayer1Winner
      : (this.lobbyRole === 'host' ? isPlayer1Winner : (this.lobbyRole === 'opponent' ? !isPlayer1Winner : false));

    if (this.lobbyRole !== 'spectator') {
      this.saveRecord(amIWinner);
    }

    if (amIWinner) {
      winnerTitle.textContent = 'VICTORY ACHIEVED';
      winnerTitle.style.color = 'var(--neon-green)';
      winnerMsg.textContent = `${winner.name} successfully grounded their opponent and survived the circuit.`;
      window.soundFX.playVictory();
    } else {
      winnerTitle.textContent = 'CIRCUIT OVERLOAD (DEFEAT)';
      winnerTitle.style.color = 'var(--neon-pink)';
      winnerMsg.textContent = `${winner.name} claimed victory. Your terminal suffered critical voltage collapse.`;
      window.soundFX.playDefeat();
    }

    this.openModal('modal-match-over');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start app once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ShortCircuitApp();
});
