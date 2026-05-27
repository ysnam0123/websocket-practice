// ===== Stage 3 스냅샷: Broadcast 서버 =====
// 학습 포인트: 1:N 통신.
// 받은 메시지를 연결된 모든 클라이언트에게 전파한다.
// 입장/퇴장 시스템 메시지도 broadcast로 보낸다.

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 [Stage 3] Broadcast 서버 시작! ws://localhost:8080');

// 모든 연결된 클라이언트에게 메시지를 전파하는 헬퍼
function broadcast(message, { exclude } = {}) {
  wss.clients.forEach((client) => {
    if (client === exclude) return;
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log(`✅ 새 클라이언트 접속 (현재 ${wss.clients.size}명)`);

  // 본인에게는 환영 메시지
  ws.send('[system] 채팅방에 입장했어요.');
  // 다른 사람들에게는 새 멤버 알림
  broadcast(`[system] 새 사용자가 입장했어요. (현재 ${wss.clients.size}명)`, {
    exclude: ws,
  });

  // 메시지를 받으면 모든 클라이언트에게 전파
  ws.on('message', (data) => {
    const message = data.toString();
    console.log('📨 받은 메시지:', message);

    broadcast(message);
  });

  ws.on('close', () => {
    console.log(`👋 클라이언트 나감 (현재 ${wss.clients.size}명)`);
    broadcast(`[system] 사용자가 퇴장했어요. (현재 ${wss.clients.size}명)`);
  });

  ws.on('error', (error) => {
    console.log('❌ 에러:', error);
  });
});
