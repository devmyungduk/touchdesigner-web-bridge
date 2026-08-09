'use client';

import { useEffect, useRef, useState } from 'react';

type Payload =
  | { type: 'click'; x: number; y: number; time: string }
  | { type: 'text'; content: string; time: string };

type LogEntry = { id: string; label: string };

// 접속한 호스트를 그대로 쓴다. 휴대기기에서 PC 주소로 열면
// 그 주소로 WebSocket 이 연결되므로 코드를 고칠 필요가 없다.
function resolveWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured) return configured;

  const port = process.env.NEXT_PUBLIC_WS_PORT ?? '8080';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.hostname}:${port}`;
}

const MAX_LOG = 50;

export default function Home() {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const socket = new WebSocket(resolveWsUrl());
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  function addLog(label: string) {
    setLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, label }, ...prev].slice(0, MAX_LOG));
  }

  function send(payload: Payload): boolean {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    // 입력창과 버튼을 누른 경우는 좌표 전송에서 제외한다.
    if ((e.target as HTMLElement).closest('[data-no-capture]')) return;

    const payload: Payload = {
      type: 'click',
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      time: new Date().toLocaleTimeString(),
    };

    if (send(payload)) addLog(`좌표 (${payload.x}, ${payload.y})`);
  }

  function handleSendText() {
    const content = text.trim();
    if (!content) return;

    const payload: Payload = {
      type: 'text',
      content,
      time: new Date().toLocaleTimeString(),
    };

    if (send(payload)) {
      addLog(`텍스트 ${content}`);
      setText('');
    }
  }

  return (
    <main
      onPointerDown={handlePointerDown}
      className="min-h-screen flex flex-col items-center justify-center gap-8 p-5
                 bg-[#1a1a2e] text-[#eee] touch-none select-none"
    >
      <div
        className={`fixed top-5 right-5 rounded px-4 py-2 text-sm font-bold text-black ${
          connected ? 'bg-emerald-400' : 'bg-rose-400'
        }`}
      >
        {connected ? '연결됨' : '연결 끊김'}
      </div>

      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold">TouchDesigner Web Bridge</h1>
        <p className="mt-2 text-sm opacity-70">화면을 누르면 좌표를, 아래 입력창으로 텍스트를 보냅니다.</p>
      </header>

      <div data-no-capture className="flex w-4/5 max-w-xl gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendText();
            }
          }}
          placeholder="텍스트 입력 (Enter 로 전송)"
          className="flex-1 rounded border border-[#333] bg-[#0f0f23] px-3 py-2 text-base
                     text-[#eee] outline-none focus:border-emerald-400"
        />
        <button
          onClick={handleSendText}
          className="rounded bg-emerald-400 px-5 py-2 font-bold text-black
                     hover:bg-emerald-300 active:scale-95 transition"
        >
          전송
        </button>
      </div>

      <section
        data-no-capture
        className="w-4/5 max-w-xl max-h-72 overflow-y-auto rounded-lg bg-[#0f0f23] p-5"
      >
        <h2 className="mb-3 text-lg font-semibold">전송 로그</h2>
        {log.length === 0 ? (
          <p className="opacity-50">전송한 데이터가 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {log.map((entry) => (
              <li key={entry.id} className="rounded bg-[#16213e] px-3 py-1.5 text-sm">
                {entry.label}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
