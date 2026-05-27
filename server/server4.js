// ===== Stage 4 스냅샷: JSON 프로토콜 서버 =====
// 학습 포인트:
// - 단순 문자열에서 구조화된 JSON 메시지로 전환
// - 메시지 타입별 분기 처리 (chat / typing / system)
// - 잘못된 JSON에 대한 방어
// - 서버가 능동적으로 메타데이터(timestamp, count) 부여

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 [Stage 4] JSON 프로토콜 서버 시작! ws://localhost:8080');

function broadcast(msgObj, { exclude } = {}) {
  const data = JSON.stringify(msgObj);
  wss.clients.forEach((client) => {
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

wss.on('connection', (ws) => {
  console.log(`✅ 새 클라이언트 접속 (현재 ${wss.clients.size}명)`);

  sendTo(ws, {
    type: 'system',
    event: 'welcome',
    count: wss.clients.size,
    timestamp: Date.now(),
  });

  broadcast(
    {
      type: 'system',
      event: 'join',
      count: wss.clients.size,
      timestamp: Date.now(),
    },
    { exclude: ws },
  );

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.warn('⚠️  잘못된 JSON, 무시:', data.toString());
      return;
    }

    console.log('📨', msg);

    switch (msg.type) {
      case 'chat':
        broadcast({
          type: 'chat',
          userId: msg.userId,
          payload: msg.payload,
          timestamp: Date.now(),
        });
        break;

      case 'typing':
        broadcast(
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
    console.log(`👋 클라이언트 나감 (현재 ${wss.clients.size}명)`);
    broadcast({
      type: 'system',
      event: 'leave',
      count: wss.clients.size,
      timestamp: Date.now(),
    });
  });

  ws.on('error', (error) => {
    console.log('❌ 에러:', error);
  });
});
