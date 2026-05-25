'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WSStatus = 'connecting' | 'open' | 'closing' | 'closed';

export type LogEntry = {
  kind: 'open' | 'close' | 'error' | 'recv' | 'send' | 'info';
  text: string;
  at: number; // timestamp(ms)
};

type UseWebSocketReturn = {
  status: WSStatus;
  log: LogEntry[];
  send: (data: string) => boolean;
  reconnectAttempt: number;
};

const MAX_BACKOFF_MS = 30_000; // 재연결 최대 대기 30초

export function useWebSocket(url: string): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const [status, setStatus] = useState<WSStatus>('connecting');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const appendLog = useCallback((entry: Omit<LogEntry, 'at'>) => {
    setLog((prev) => [...prev, { ...entry, at: Date.now() }]);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;

    const connect = () => {
      if (isUnmountedRef.current) return;

      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setReconnectAttempt(0);
        setStatus('open');
        appendLog({ kind: 'open', text: '[open] 연결 성공' });
      };

      ws.onmessage = (event) => {
        appendLog({ kind: 'recv', text: `[recv] ${event.data}` });
      };

      ws.onerror = () => {
        appendLog({ kind: 'error', text: '[error] 에러 발생' });
      };

      ws.onclose = (event) => {
        setStatus('closed');
        appendLog({
          kind: 'close',
          text: `[close] code=${event.code} clean=${event.wasClean}`,
        });

        // 언마운트로 인한 닫힘이면 재연결 X
        if (isUnmountedRef.current) return;

        // exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s(max)
        const delay = Math.min(
          1_000 * 2 ** attemptsRef.current,
          MAX_BACKOFF_MS,
        );
        attemptsRef.current += 1;
        setReconnectAttempt(attemptsRef.current);
        appendLog({
          kind: 'info',
          text: `[reconnect] ${delay / 1000}s 후 재시도 (attempt ${attemptsRef.current})`,
        });

        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      isUnmountedRef.current = true;

      // 대기 중인 재연결 타이머 정리
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const ws = wsRef.current;
      if (ws) {
        // onclose 핸들러를 떼야 cleanup으로 인한 close가 재연결을 트리거하지 않음
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
        wsRef.current = null;
      }
    };
  }, [url, appendLog]);

  const send = useCallback(
    (data: string): boolean => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        appendLog({
          kind: 'info',
          text: '[skip] OPEN 상태가 아니라 전송 안 함',
        });
        return false;
      }
      ws.send(data);
      appendLog({ kind: 'send', text: `[send] ${data}` });
      return true;
    },
    [appendLog],
  );

  return { status, log, send, reconnectAttempt };
}
