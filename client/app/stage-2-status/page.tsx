'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useWebSocket, type WSStatus } from '@/app/hooks/useWebSocket';

const WS_URL = 'ws://localhost:8080';

const STATUS_STYLE: Record<WSStatus, { label: string; cls: string }> = {
  connecting: {
    label: 'CONNECTING',
    cls: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/40',
  },
  open: {
    label: 'OPEN',
    cls: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/40',
  },
  closing: {
    label: 'CLOSING',
    cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40',
  },
  closed: {
    label: 'CLOSED',
    cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40',
  },
};

export default function Stage2StatusPage() {
  const { status, log, send, reconnectAttempt } = useWebSocket(WS_URL);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    if (send(input)) {
      setInput('');
    }
  };

  const badge = STATUS_STYLE[status];

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
          Stage 2 — 연결 상태 + 자동 재연결
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          서버를 껐다 켜보면서 상태 배지가 어떻게 변하는지 관찰해봐.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium ${badge.cls}`}
          >
            ● {badge.label}
          </span>
          {reconnectAttempt > 0 && (
            <span className="text-xs text-zinc-500 font-mono">
              재연결 시도 #{reconnectAttempt}
            </span>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="메시지 입력 후 Enter"
            disabled={status !== 'open'}
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 outline-none focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={status !== 'open'}
            className="rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            보내기
          </button>
        </div>

        <div className="mt-6 h-96 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 font-mono text-xs">
          {log.length === 0 ? (
            <div className="text-zinc-400">로그가 여기에 표시됩니다…</div>
          ) : (
            log.map((entry, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap ${kindColor(entry.kind)}`}
              >
                {entry.text}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function kindColor(kind: string): string {
  switch (kind) {
    case 'open':
      return 'text-green-600 dark:text-green-400';
    case 'close':
      return 'text-red-600 dark:text-red-400';
    case 'error':
      return 'text-red-500';
    case 'send':
      return 'text-blue-600 dark:text-blue-400';
    case 'recv':
      return 'text-zinc-700 dark:text-zinc-300';
    case 'info':
      return 'text-zinc-500';
    default:
      return 'text-zinc-700 dark:text-zinc-300';
  }
}
