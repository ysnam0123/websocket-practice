// ===== Stage 1 스냅샷: Echo 서버 =====
// 학습 포인트: 단일 클라이언트와의 1:1 통신.
// 받은 메시지를 보낸 사람에게만 그대로 돌려보낸다.

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 [Stage 1] Echo 서버 시작! ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('✅ 새 클라이언트 접속');

  // 환영 메시지 (본인에게만)
  ws.send('서버에 연결됐어요! 메시지를 보내보세요.');

  // 메시지를 받으면 보낸 사람에게만 다시 보냄 (echo)
  ws.on('message', (data) => {
    const message = data.toString();
    console.log('📨 받은 메시지:', message);

    ws.send(`서버 응답: ${message}`);
  });

  ws.on('close', () => {
    console.log('👋 클라이언트 나감');
  });

  ws.on('error', (error) => {
    console.log('❌ 에러:', error);
  });
});
