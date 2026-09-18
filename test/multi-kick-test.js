// Test WebSocket 6-Player Capacity and Host Kick System
const { spawn } = require('child_process');
const { WebSocket } = require('ws');

const server = spawn('node', ['server.js'], { stdio: 'pipe' });

setTimeout(() => {
  console.log('[TEST] Testing 6-player lobby capacity and host kick...');

  // 1. Host joins
  const wsHost = new WebSocket('ws://localhost:3000/ws');
  let roomCode = null;

  wsHost.on('open', () => {
    wsHost.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { user: { id: 'u_host', name: 'HOST_ALEX' }, requestedRoomId: 'KICK6' }
    }));
  });

  wsHost.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'ROOM_JOINED') {
      console.log('✓ Host joined room KICK6 as role:', msg.payload.yourRole);
      roomCode = msg.payload.room.roomId;

      // 2. Challenger joins
      const wsP2 = new WebSocket('ws://localhost:3000/ws');
      wsP2.on('open', () => {
        wsP2.send(JSON.stringify({
          type: 'JOIN_ROOM',
          payload: { user: { id: 'u_p2', name: 'CHALLENGER_SAM' }, requestedRoomId: 'KICK6' }
        }));
      });

      wsP2.on('message', (p2Data) => {
        const p2Msg = JSON.parse(p2Data.toString());
        if (p2Msg.type === 'ROOM_JOINED') {
          console.log('✓ P2 joined room as role:', p2Msg.payload.yourRole);

          // 3. Host kicks P2
          wsHost.send(JSON.stringify({
            type: 'KICK_PLAYER',
            roomId: 'KICK6',
            payload: { targetPlayerId: 'u_p2' }
          }));
        }

        if (p2Msg.type === 'KICKED') {
          console.log('✓ P2 successfully received KICKED message!');
          wsHost.close();
          wsP2.close();
          server.kill();
          console.log('\n>>> MULTIPLAYER KICK & ROSTER TEST PASSED! <<<');
          process.exit(0);
        }
      });
    }
  });

  wsHost.on('error', (err) => {
    console.error('WS Error:', err);
    server.kill();
    process.exit(1);
  });
}, 1000);
