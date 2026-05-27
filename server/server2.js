// ===== Stage 2 스냅샷: Echo 서버 (Stage 1과 동일) =====
// Stage 2는 클라이언트 쪽에서 커스텀 훅(useWebSocket)과
// 자동 재연결(exponential backoff)을 만든 단계라 서버 변경이 없다.
// 그래도 단계별 흐름을 보존하기 위해 동일 스냅샷을 남겨둔다.
// 이 서버로 켜두고 클라이언트에서 서버를 죽였다 살리면
// 재연결 로직이 동작하는 걸 확인할 수 있다.

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 [Stage 2] Echo 서버 시작! ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('✅ 새 클라이언트 접속');

  ws.send('서버에 연결됐어요! 메시지를 보내보세요.');

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
