'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWebSocket, type WSStatus } from '@/app/hooks/useWebSocket';
import {
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@/app/types/message';

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

const TYPING_TTL_MS = 3_000; // 마지막 typing 신호 이후 3초간 유지
const TYPING_THROTTLE_MS = 1_500; // typing 송신 throttle

function formatTime(ts: number | undefined) {
  // timestamp가 없거나(예: 옛 서버) 잘못된 값이면 자리표시자 반환
  if (typeof ts !== 'number' || Number.isNaN(ts)) return '--:--';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Stage4ProtocolPage() {
  const { status, log, send } = useWebSocket(WS_URL);
  const [nickname, setNickname] = useState('');
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedCountRef = useRef(0);

  // 1) log 중 recv만 추려 JSON 파싱
  const serverMessages = useMemo<ServerMessage[]>(() => {
    return log
      .filter((e) => e.kind === 'recv')
      .map((e) => parseServerMessage(e.text.replace(/^\[recv\]\s*/, '')))
      .filter((m): m is ServerMessage => m !== null);
  }, [log]);

  // 2) 채팅/시스템 메시지만 화면용으로 추림 (typing은 인디케이터 전용)
  const visibleMessages = useMemo(
    () => serverMessages.filter((m) => m.type !== 'typing'),
    [serverMessages],
  );

  // 3) 새로 도착한 typing 메시지 처리
  useEffect(() => {
    for (let i = processedCountRef.current; i < serverMessages.length; i++) {
      const msg = serverMessages[i];
      if (msg.type === 'typing' && msg.userId !== nickname.trim()) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(msg.userId, Date.now());
          return next;
        });
      }
    }
    processedCountRef.current = serverMessages.length;
  }, [serverMessages, nickname]);

  // 4) 오래된 typing 엔트리 정리 (1초 주기)
  useEffect(() => {
    const id = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);
        for (const [userId, at] of next) {
          if (now - at > TYPING_TTL_MS) {
            next.delete(userId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1_000);
    return () => clearInterval(id);
  }, []);

  // 5) 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleMessages.length]);

  // 6) 채팅 전송
  const sendChat = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!nickname.trim()) {
      alert('닉네임을 먼저 입력하세요.');
      return;
    }
    const msg: ClientMessage = {
      type: 'chat',
      userId: nickname.trim(),
      payload: trimmed,
    };
    if (send(JSON.stringify(msg))) {
      setInput('');
    }
  };

  // 7) typing 신호 (throttle)
  const notifyTyping = () => {
    if (!nickname.trim() || status !== 'open') return;
    if (typingThrottleRef.current) return; // 이미 보냈으면 잠시 대기
    const msg: ClientMessage = {
      type: 'typing',
      userId: nickname.trim(),
    };
    send(JSON.stringify(msg));
    typingThrottleRef.current = setTimeout(() => {
      typingThrottleRef.current = null;
    }, TYPING_THROTTLE_MS);
  };

  const badge = STATUS_STYLE[status];
  const typingList = Array.from(typingUsers.keys());

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
            Stage 4 — JSON 프로토콜
          </h1>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium ${badge.cls}`}
          >
            ● {badge.label}
          </span>
        </div>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          메시지가 구조화된 JSON으로 오가. 입장/퇴장, 채팅, 타이핑이 한 채널에서
          타입으로 구분돼.
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
          {visibleMessages.length === 0 ? (
            <div className="text-xs text-zinc-400">아직 메시지가 없어요.</div>
          ) : (
            visibleMessages.map((msg, i) => {
              if (msg.type === 'system') {
                const label =
                  msg.event === 'welcome'
                    ? `채팅방에 입장했어요 (현재 ${msg.count}명)`
                    : msg.event === 'join'
                      ? `새 사용자가 입장 (현재 ${msg.count}명)`
                      : `사용자가 퇴장 (현재 ${msg.count}명)`;
                return (
                  <div
                    key={i}
                    className="text-center text-xs text-zinc-500 italic"
                  >
                    — {label} · {formatTime(msg.timestamp)} —
                  </div>
                );
              }
              // chat
              const isMine = msg.userId === nickname.trim();
              return (
                <div
                  key={i}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-zinc-500 mb-0.5 px-1">
                    {msg.userId} · {formatTime(msg.timestamp)}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words ${
                      isMine
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-black dark:text-zinc-50 rounded-bl-sm'
                    }`}
                  >
                    {msg.payload}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 타이핑 인디케이터 */}
        <div className="mt-2 h-5 text-xs text-zinc-500 italic">
          {typingList.length === 0
            ? ''
            : typingList.length === 1
              ? `${typingList[0]} 님이 입력 중…`
              : `${typingList.slice(0, 2).join(', ')} 외 ${typingList.length - 2}명이 입력 중…`}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') sendChat();
            }}
            placeholder="메시지 입력 후 Enter"
            disabled={status !== 'open'}
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 outline-none focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={sendChat}
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
