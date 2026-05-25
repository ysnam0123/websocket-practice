import Link from "next/link";

const stages = [
  {
    href: "/stage-1-echo",
    title: "Stage 1 — 기본 Echo 클라이언트",
    description: "raw WebSocket API와 4개 이벤트, useEffect cleanup 패턴",
  },
  {
    href: "/stage-2-status",
    title: "Stage 2 — 연결 상태 + 자동 재연결",
    description: "readyState, 커스텀 훅, exponential backoff",
  },
  {
    href: "/stage-3-chat",
    title: "Stage 3 — 브로드캐스트 채팅",
    description: "wss.clients로 다중 클라이언트에 메시지 전파",
  },
  {
    href: "/stage-4-protocol",
    title: "Stage 4 — JSON 메시지 프로토콜",
    description: "타입별 메시지 구조화, 시스템 메시지 / 채팅 메시지 분기",
  },
  {
    href: "/stage-5-rooms",
    title: "Stage 5 — 방(room) + Heartbeat",
    description: "room 단위 broadcast, ping/pong으로 좀비 커넥션 감지",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black px-6 py-16">
      <main className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          WebSocket 학습 단계
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          서버는 <code className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-sm">ws://localhost:8080</code> 에서 동작 중이어야 해.
        </p>

        <ul className="mt-10 space-y-3">
          {stages.map((stage) => (
            <li key={stage.href}>
              <Link
                href={stage.href}
                className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600"
              >
                <div className="font-medium text-black dark:text-zinc-50">
                  {stage.title}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {stage.description}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
