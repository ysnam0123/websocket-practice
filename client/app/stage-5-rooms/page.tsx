'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWebSocket, type WSStatus } from '@/app/hooks/useWebSocket';
import {
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@/app/types/message';

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

const PRESET_ROOMS = ['general', 'random', 'dev', 'study'];
const TYPING_TTL_MS = 3_000;
const TYPING_THROTTLE_MS = 1_500;

function formatTime(ts: number | undefined) {
  if (typeof ts !== 'number' || Number.isNaN(ts)) return '--:--';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Stage5RoomsPage() {
  const [nickname, setNickname] = useState('');
  const [activeRoom, setActiveRoom] = useState('general');
  const [pendingRoom, setPendingRoom] = useState('general');
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedCountRef = useRef(0);

  // URL에 room 쿼리 포함
  const wsUrl = `ws://localhost:8080?room=${encodeURIComponent(activeRoom)}`;
  const { status, log, send } = useWebSocket(wsUrl);

  // 현재 연결의 시작점 — 가장 최근 'open' 이벤트의 인덱스
  const lastOpenIdx = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].kind === 'open') return i;
    }
    return -1;
  }, [log]);

  // 현재 연결 이후 수신된 서버 메시지만 파싱
  const serverMessages = useMemo<ServerMessage[]>(() => {
    return log
      .slice(lastOpenIdx + 1)
      .filter((e) => e.kind === 'recv')
      .map((e) => parseServerMessage(e.text.replace(/^\[recv\]\s*/, '')))
      .filter((m): m is ServerMessage => m !== null);
  }, [log, lastOpenIdx]);

  // chat + system만 화면용 (typing은 인디케이터 전용)
  const visibleMessages = useMemo(
    () => serverMessages.filter((m) => m.type !== 'typing'),
    [serverMessages],
  );

  // 새 연결(방 이동, 재연결)이 시작될 때 로컬 상태 리셋
  useEffect(() => {
    setTypingUsers(new Map());
    processedCountRef.current = lastOpenIdx + 1;
  }, [lastOpenIdx]);

  // 새로 도착한 typing 처리
  useEffect(() => {
    for (let i = processedCountRef.current; i < log.length; i++) {
      if (i <= lastOpenIdx) continue;
      const entry = log[i];
      if (entry.kind !== 'recv') continue;
      const msg = parseServerMessage(entry.text.replace(/^\[recv\]\s*/, ''));
      if (msg?.type === 'typing' && msg.userId !== nickname.trim()) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(msg.userId, Date.now());
          return next;
        });
      }
    }
    processedCountRef.current = log.length;
  }, [log, nickname, lastOpenIdx]);

  // 오래된 typing 정리
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

  // 자동 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleMessages.length]);

  // 채팅 전송
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

  // typing 알림 (throttle)
  const notifyTyping = () => {
    if (!nickname.trim() || status !== 'open') return;
    if (typingThrottleRef.current) return;
    const msg: ClientMessage = {
      type: 'typing',
      userId: nickname.trim(),
    };
    send(JSON.stringify(msg));
    typingThrottleRef.current = setTimeout(() => {
      typingThrottleRef.current = null;
    }, TYPING_THROTTLE_MS);
  };

  const handleJoinRoom = () => {
    const next = pendingRoom.trim();
    if (!next || next === activeRoom) return;
    setActiveRoom(next);
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
            Stage 5 — Room + Heartbeat
          </h1>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium ${badge.cls}`}
          >
            ● {badge.label}
          </span>
        </div>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          탭마다 방을 다르게 골라봐. 같은 방끼리만 메시지가 보여.
        </p>

        {/* 닉네임 */}
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

        {/* 방 선택 */}
        <div className="mt-4">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            방 (현재:{' '}
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {activeRoom}
            </span>
            )
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={pendingRoom}
              onChange={(e) => setPendingRoom(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') handleJoinRoom();
              }}
              placeholder="방 이름"
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 outline-none focus:border-zinc-500"
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={pendingRoom.trim() === activeRoom || !pendingRoom.trim()}
              className="rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              방 이동
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_ROOMS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setPendingRoom(r);
                  setActiveRoom(r);
                }}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  r === activeRoom
                    ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 채팅 영역 */}
        <div
          ref={scrollRef}
          className="mt-4 h-80 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-2"
        >
          {visibleMessages.length === 0 ? (
            <div className="text-xs text-zinc-400">
              아직 메시지가 없어요. 같은 방의 다른 탭과 대화해봐.
            </div>
          ) : (
            visibleMessages.map((msg, i) => {
              if (msg.type === 'system') {
                const label =
                  msg.event === 'welcome'
                    ? `[${activeRoom}] 입장했어요 (현재 ${msg.count}명)`
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

        {/* 메시지 입력 */}
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
