// ===== Stage 5: Room + Heartbeat 서버 =====
// 학습 포인트:
// - 클라이언트를 room별로 그룹화 (URL 쿼리스트링으로 식별)
// - 같은 room의 클라이언트끼리만 broadcast
// - ping/pong 으로 좀비 커넥션 감지 및 정리
// - ws.terminate() vs ws.close() 의 차이
//
// 연결 URL 예시: ws://localhost:8080?room=general

const WebSocket = require('ws');
const url = require('url');

const wss = new WebSocket.Server({ port: 8080 });

// Heartbeat 주기 — 학습용으로 짧게(10초). 실무는 30~60초.
const HEARTBEAT_INTERVAL_MS = 10_000;

console.log('🚀 [Stage 5] Room + Heartbeat 서버 시작! ws://localhost:8080');

// ===== Room 헬퍼 =====

function countInRoom(roomId) {
  let n = 0;
  wss.clients.forEach((c) => {
    if (c.roomId === roomId) n += 1;
  });
  return n;
}

function broadcastToRoom(roomId, msgObj, { exclude } = {}) {
  const data = JSON.stringify(msgObj);
  wss.clients.forEach((client) => {
    if (client.roomId !== roomId) return; // 다른 방이면 스킵
    if (client === exclude) return;
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function sendTo(ws, msgObj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msgObj));
  }
}

// ===== 연결 처리 =====

wss.on('connection', (ws, req) => {
  // 1) 연결 URL에서 room 추출
  // req.url 예: "/?room=general" → query.room === 'general'
  const { query } = url.parse(req.url, true);
  ws.roomId =
    typeof query.room === 'string' && query.room.trim()
      ? query.room.trim()
      : 'general';

  // 2) heartbeat 플래그
  ws.isAlive = true;
  ws.on('pong', () => {
    // 서버 ping → 클라이언트 pong 응답이 오면 살아있는 것
    ws.isAlive = true;
  });

  console.log(
    `✅ 접속 (room=${ws.roomId}, ${countInRoom(ws.roomId)}명, 전체 ${wss.clients.size}명)`,
  );

  // 3) 본인에게 welcome
  sendTo(ws, {
    type: 'system',
    event: 'welcome',
    count: countInRoom(ws.roomId),
    timestamp: Date.now(),
  });

  // 4) 같은 room의 다른 사람들에게 join 알림
  broadcastToRoom(
    ws.roomId,
    {
      type: 'system',
      event: 'join',
      count: countInRoom(ws.roomId),
      timestamp: Date.now(),
    },
    { exclude: ws },
  );

  // 5) 메시지 수신
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.warn('⚠️  잘못된 JSON, 무시');
      return;
    }

    console.log(`📨 [${ws.roomId}]`, msg);

    switch (msg.type) {
      case 'chat':
        broadcastToRoom(ws.roomId, {
          type: 'chat',
          userId: msg.userId,
          payload: msg.payload,
          timestamp: Date.now(),
        });
        break;

      case 'typing':
        broadcastToRoom(
          ws.roomId,
          {
            type: 'typing',
            userId: msg.userId,
            timestamp: Date.now(),
          },
          { exclude: ws },
        );
        break;

      default:
        console.warn('⚠️  알 수 없는 메시지 타입:', msg.type);
    }
  });

  ws.on('close', () => {
    console.log(
      `👋 퇴장 (room=${ws.roomId}, ${countInRoom(ws.roomId)}명 남음)`,
    );
    broadcastToRoom(ws.roomId, {
      type: 'system',
      event: 'leave',
      count: countInRoom(ws.roomId),
      timestamp: Date.now(),
    });
  });

  ws.on('error', (error) => {
    console.log('❌ 에러:', error);
  });
});

// ===== Heartbeat: 좀비 커넥션 감지 =====
//
// 주기적으로 모든 클라이언트에 ping 을 보낸다.
// 직전 사이클에서 pong 응답이 없었다면 → 죽은 연결 → terminate.
//
// ws.close()는 closing handshake를 거치는 "정중한 종료"이지만,
// 응답 없는 연결에는 close 자체가 안 먹힘 → ws.terminate()로 강제 종료.

const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`💀 좀비 연결 강제 종료 (room=${ws.roomId})`);
      return ws.terminate();
    }
    ws.isAlive = false; // pong 받기 전까진 죽었다고 가정
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});
