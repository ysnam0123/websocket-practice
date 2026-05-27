'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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

// "닉네임: 본문" 형태의 문자열을 파싱
function parseMessage(raw: string): {
  nickname: string | null;
  body: string;
  isSystem: boolean;
} {
  if (raw.startsWith('[system]')) {
    return { nickname: null, body: raw.replace('[system]', '').trim(), isSystem: true };
  }
  const idx = raw.indexOf(':');
  if (idx === -1) {
    return { nickname: null, body: raw, isSystem: false };
  }
  return {
    nickname: raw.slice(0, idx).trim(),
    body: raw.slice(idx + 1).trim(),
    isSystem: false,
  };
}

export default function Stage3ChatPage() {
  const { status, log, send } = useWebSocket(WS_URL);
  const [nickname, setNickname] = useState('');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 로그 중 수신 메시지만 채팅 메시지로 추림
  const chatMessages = useMemo(
    () =>
      log
        .filter((e) => e.kind === 'recv')
        .map((e) => ({
          ...parseMessage(e.text.replace(/^\[recv\]\s*/, '')),
          at: e.at,
        })),
    [log],
  );

  // 새 메시지가 오면 자동 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!nickname.trim()) {
      alert('닉네임을 먼저 입력하세요.');
      return;
    }
    if (send(`${nickname.trim()}: ${trimmed}`)) {
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

        <div className="mt-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Stage 3 — 브로드캐스트 채팅
          </h1>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium ${badge.cls}`}
          >
            ● {badge.label}
          </span>
        </div>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          탭을 두 개 이상 열어서 실시간 동기화를 확인해봐. 닉네임을 다르게 설정하면 더 좋아.
        </p>

        <div className="mt-6">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: yoonseo"
            className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 outline-none focus:border-zinc-500"
          />
        </div>

        <div
          ref={scrollRef}
          className="mt-4 h-96 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-2"
        >
          {chatMessages.length === 0 ? (
            <div className="text-xs text-zinc-400">아직 메시지가 없어요.</div>
          ) : (
            chatMessages.map((msg, i) => {
              if (msg.isSystem) {
                return (
                  <div
                    key={i}
                    className="text-center text-xs text-zinc-500 italic"
                  >
                    — {msg.body} —
                  </div>
                );
              }
              const isMine = msg.nickname === nickname.trim();
              return (
                <div
                  key={i}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-zinc-500 mb-0.5 px-1">
                    {msg.nickname ?? 'unknown'}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words ${
                      isMine
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-black dark:text-zinc-50 rounded-bl-sm'
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex gap-2">
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
      </main>
    </div>
  );
}
