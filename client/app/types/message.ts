// 서버 ↔ 클라이언트 간 주고받는 JSON 메시지 스펙.
// 서버 코드(server/server.js)와 반드시 일치해야 한다.

// 서버 → 클라이언트
export type ChatMessage = {
  type: 'chat';
  userId: string;
  payload: string;
  timestamp: number;
};

export type SystemMessage = {
  type: 'system';
  event: 'welcome' | 'join' | 'leave';
  count: number; // 현재 접속자 수
  timestamp: number;
};

export type TypingMessage = {
  type: 'typing';
  userId: string;
  timestamp: number;
};

// 서버로부터 받을 수 있는 모든 메시지의 union
export type ServerMessage = ChatMessage | SystemMessage | TypingMessage;

// 클라이언트 → 서버
export type ClientChatMessage = {
  type: 'chat';
  userId: string;
  payload: string;
};

export type ClientTypingMessage = {
  type: 'typing';
  userId: string;
};

export type ClientMessage = ClientChatMessage | ClientTypingMessage;

// 헬퍼: 안전한 파싱
export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj === 'object' &&
      (obj.type === 'chat' || obj.type === 'system' || obj.type === 'typing')
    ) {
      return obj as ServerMessage;
    }
    return null;
  } catch {
    return null;
  }
}
