'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const WS_URL = 'ws://localhost:8080';

export default function Stage1EchoPage() {
  const wsRef = useRef<WebSocket | null>(null);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // ===================================================
    // 4개의 이벤트 핸들러
    // prev를 쓰는 이유: 옛날 log값을 덮어쓰기 위함

    // 1. handshake 성공, 통신 준비 완료
    ws.onopen = () => {
      setLog((prev) => [...prev, '[open] 서버에 연결됨']);
    };

    // 2. 서버에서 메세지 도착
    ws.onmessage = (event) => {
      setLog((prev) => [...prev, `[recv] ${event.data}`]);
    };

    // 3. 연결 종료
    ws.onclose = (event) => {
      setLog((prev) => [
        ...prev,
        `[close] code=${event.code} clean=${event.wasClean}`,
      ]);
    };

    // 4. 연결/통신 에러
    ws.onerror = () => {
      setLog((prev) => [...prev, '[error] 에러 발생']);
    };
    // ===================================================

    // 페이지를 떠나거나 컴포넌트가 언마운트되면 연결을 닫는다
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const handleSend = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLog((prev) => [...prev, '[skip] 아직 OPEN 상태가 아님']);
      return;
    }
    if (!input.trim()) return;
    ws.send(input);
    setLog((prev) => [...prev, `[send] ${input}`]);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black px-6 py-12">
      <main className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← 인덱스로
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Stage 1 — Echo 클라이언트
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          서버가 받은 메시지를 그대로 돌려보내. DevTools → Network → socket
          탭에서 실제 프레임을 확인해봐.
        </p>

        <div className="mt-6 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // IME 조합 중인 Enter는 무시 (한글 입력 시 마지막 글자 중복 전송 방지)
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="메시지 입력 후 Enter"
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 outline-none focus:border-zinc-500"
          />
          <button
            type="button"
            onClick={handleSend}
            className="rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:opacity-90"
          >
            보내기
          </button>
        </div>

        <div className="mt-6 h-96 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 font-mono text-xs">
          {log.length === 0 ? (
            <div className="text-zinc-400">로그가 여기에 표시됩니다…</div>
          ) : (
            log.map((line, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300"
              >
                {line}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
