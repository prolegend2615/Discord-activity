// Multiplayer Synchronization Engine (WebSocket + BroadcastChannel Hybrid)

class MultiplayerManager {
  constructor() {
    this.ws = null;
    this.broadcastChannel = null;
    this.roomId = null;
    this.role = 'host'; // 'host', 'opponent', 'spectator'
    this.isMultiplayer = false;
    this.onRoomUpdate = null;
    this.onGameAction = null;
    this.onMatchStart = null;

    this.localRoomState = {
      roomId: null,
      host: null,
      opponent: null,
      spectatorsCount: 0,
      settings: { maxHp: 3, itemsPerRound: 1 },
      gameActive: false
    };
  }

  // Connect via WebSocket or fallback to BroadcastChannel
  initRoom(roomId, user, isHosting = true, options = {}) {
    this.roomId = roomId.toUpperCase();
    this.isMultiplayer = true;
    this.role = isHosting ? 'host' : 'opponent';

    // 1. Setup local BroadcastChannel for cross-tab multiplayer
    if (window.BroadcastChannel) {
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      this.broadcastChannel = new BroadcastChannel(`SC_ROOM_${this.roomId}`);
      this.broadcastChannel.onmessage = (event) => this.handleIncomingMessage(event.data);
    }

    // 2. Setup WebSocket if protocol/host allows
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({
          type: 'JOIN_ROOM',
          payload: {
            user,
            requestedRoomId: this.roomId
          }
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.warn('WS message parse error:', e);
        }
      };

      this.ws.onerror = () => {
        console.log('WS connection unavialable, falling back to BroadcastChannel.');
      };
    } catch (e) {
      console.log('Standalone mode: using BroadcastChannel sync.');
    }

    // Initialize local representation
    if (isHosting) {
      this.localRoomState = {
        roomId: this.roomId,
        host: { ...user, isHost: true, ready: true },
        opponent: null,
        spectatorsCount: 0,
        settings: { maxHp: options.maxHp || 3, itemsPerRound: options.itemsPerRound || 1 },
        gameActive: false
      };
    } else {
      // Announce join via BroadcastChannel
      this.broadcast({
        type: 'BC_PLAYER_JOINED',
        payload: { user, role: 'opponent' }
      });
    }

    return this.localRoomState;
  }

  handleIncomingMessage(msg) {
    if (!msg) return;

    switch (msg.type) {
      case 'ROOM_JOINED':
        this.localRoomState = msg.payload.room;
        this.role = msg.payload.yourRole;
        if (this.onRoomUpdate) this.onRoomUpdate(this.localRoomState, this.role);
        break;

      case 'ROOM_UPDATED':
        this.localRoomState = msg.payload;
        if (this.onRoomUpdate) this.onRoomUpdate(this.localRoomState, this.role);
        break;

      case 'MATCH_STARTED':
        if (this.onMatchStart) this.onMatchStart(msg.payload);
        break;

      case 'GAME_ACTION_RELAY':
        if (this.onGameAction) this.onGameAction(msg.payload.action, msg.payload.senderId);
        break;

      // BroadcastChannel Fallback Messages
      case 'BC_PLAYER_JOINED':
        if (this.role === 'host') {
          this.localRoomState.opponent = { ...msg.payload.user, isHost: false, ready: true };
          this.broadcast({
            type: 'BC_ROOM_SYNC',
            payload: this.localRoomState
          });
          if (this.onRoomUpdate) this.onRoomUpdate(this.localRoomState, this.role);
        }
        break;

      case 'BC_ROOM_SYNC':
        this.localRoomState = msg.payload;
        if (this.onRoomUpdate) this.onRoomUpdate(this.localRoomState, this.role);
        break;

      case 'BC_START_MATCH':
        if (this.onMatchStart) this.onMatchStart(msg.payload);
        break;

      case 'BC_GAME_ACTION':
        if (this.onGameAction) this.onGameAction(msg.payload.action, msg.payload.senderId);
        break;
    }
  }

  broadcast(msg) {
    // Send over WS
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
    // Also send over BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(msg);
    }
  }

  updateSettings(settings) {
    this.localRoomState.settings = { ...this.localRoomState.settings, ...settings };
    this.broadcast({
      type: 'UPDATE_SETTINGS',
      roomId: this.roomId,
      payload: settings
    });
    this.broadcast({
      type: 'BC_ROOM_SYNC',
      payload: this.localRoomState
    });
  }

  sendStartMatch(initialState) {
    this.localRoomState.gameActive = true;
    const payload = {
      settings: this.localRoomState.settings,
      initialState
    };

    this.broadcast({
      type: 'START_MATCH',
      roomId: this.roomId,
      payload
    });

    this.broadcast({
      type: 'BC_START_MATCH',
      payload
    });
  }

  sendGameAction(action, senderId) {
    this.broadcast({
      type: 'GAME_ACTION',
      roomId: this.roomId,
      payload: action
    });

    this.broadcast({
      type: 'BC_GAME_ACTION',
      payload: { action, senderId }
    });
  }

  leaveRoom() {
    this.broadcast({ type: 'LEAVE_ROOM', roomId: this.roomId });
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isMultiplayer = false;
    this.roomId = null;
  }
}

window.multiplayerManager = new MultiplayerManager();
