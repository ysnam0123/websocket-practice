// ws 라이브러리 불러오기
const WebSocket = require('ws');

// 8080 포트에서 웹소켓 서버 시작
const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 웹소켓 서버 시작! ws://localhost:8080');

// 누군가 연결하면 실행됨
wss.on('connection', (ws) => {
  console.log('✅ 새 클라이언트 접속');

  // 환영 메시지 보내기
  ws.send('서버에 연결됐어요! 메시지를 보내보세요.');

  // 메시지 받으면 실행됨
  ws.on('message', (data) => {
    const message = data.toString();
    console.log('📨 받은 메시지:', message);

    // 받은 메시지 그대로 돌려보냄 (Echo)
    ws.send(`서버 응답: ${message}`);
  });

  // 연결 끊기면 실행됨
  ws.on('close', () => {
    console.log('👋 클라이언트 나감');
  });

  // 에러 처리
  ws.on('error', (error) => {
    console.log('❌ 에러:', error);
  });
});
