"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type LogLevel = "info" | "success" | "warning" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

interface TerminalLine {
  id: number;
  level: LogLevel | "system" | "input";
  text: string;
  ts: string;
}

function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "??:??:??";
  }
}

function lineIcon(level: TerminalLine["level"]): string {
  switch (level) {
    case "success": return "✓";
    case "warning": return "⚠";
    case "error":   return "✗";
    case "debug":   return "·";
    case "system":  return " ";
    case "input":   return "$";
    default:        return "●";
  }
}

function lineColor(level: TerminalLine["level"]): string {
  switch (level) {
    case "success": return "#00FF87";
    case "warning": return "#F59E0B";
    case "error":   return "#FF4444";
    case "debug":   return "#334155";
    case "system":  return "#00D4FF";
    case "input":   return "#E2E8F0";
    default:        return "#00FF87"; // info → emerald
  }
}

let nextId = 1;

function makeSystemLines(): TerminalLine[] {
  const ts = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  return [
    { id: nextId++, level: "system", text: "╔══════════════════════════════════════╗", ts },
    { id: nextId++, level: "system", text: "║  ⚡ Serpio Terminal v1.0             ║", ts },
    { id: nextId++, level: "system", text: "║  Hazır. Bir iş başlatın.            ║", ts },
    { id: nextId++, level: "system", text: "╚══════════════════════════════════════╝", ts },
    { id: nextId++, level: "info",   text: "Kullanılabilir komutlar: help | status | clear", ts },
    { id: nextId++, level: "success", text: "PostgreSQL bağlantısı: TAMAM", ts },
    { id: nextId++, level: "success", text: "Redis bağlantısı:      TAMAM", ts },
  ];
}

const STATIC_COMMANDS: Record<string, Array<{ level: TerminalLine["level"]; text: string }>> = {
  help: [
    { level: "info", text: "  help    — Bu yardım mesajını göster" },
    { level: "info", text: "  status  — Sistem durumunu göster" },
    { level: "info", text: "  clear   — Terminali temizle" },
  ],
  status: [
    { level: "success", text: "PostgreSQL:  TAMAM (localhost:5432)" },
    { level: "success", text: "Redis:       TAMAM (localhost:6379)" },
    { level: "info",    text: "Worker:      Aktif (scrape queue dinleniyor)" },
  ],
};

interface TerminalClientProps {
  initialJobId?: string;
}

export function TerminalClient({ initialJobId }: TerminalClientProps) {
  const [lines, setLines] = useState<TerminalLine[]>(makeSystemLines);
  const [input, setInput] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(initialJobId ?? null);
  const [isConnected, setIsConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const pushLine = useCallback((level: TerminalLine["level"], text: string, ts?: string) => {
    const now = ts ?? new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    setLines((prev) => [...prev, { id: nextId++, level, text, ts: now }]);
  }, []);

  // SSE bağlantısı
  useEffect(() => {
    if (!activeJobId) return;

    esRef.current?.close();

    const es = new EventSource(`/api/stream/${activeJobId}`);
    esRef.current = es;
    setIsConnected(true);
    pushLine("info", `İş izleniyor: ${activeJobId}`);

    es.onmessage = (ev) => {
      try {
        const data: LogEntry = JSON.parse(ev.data);
        pushLine(data.level as TerminalLine["level"], data.message, fmtTs(data.timestamp));
      } catch {
        /* skip ping/malformed */
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [activeJobId, pushLine]);

  const runCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const ts = new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });

    if (trimmed === "clear") {
      setLines(makeSystemLines());
      return;
    }

    setLines((prev) => [...prev, { id: nextId++, level: "input", text: cmd, ts }]);

    const resp = STATIC_COMMANDS[trimmed];
    if (resp) {
      resp.forEach((l) =>
        setLines((prev) => [...prev, { id: nextId++, level: l.level, text: l.text, ts }])
      );
    } else if (trimmed !== "") {
      setLines((prev) => [
        ...prev,
        { id: nextId++, level: "error", text: `Bilinmeyen komut: "${cmd}". "help" yazın.`, ts },
      ]);
    }
  }, []);

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden border border-border font-terminal"
      style={{ backgroundColor: "#020B06" }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Başlık çubuğu */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 flex-shrink-0"
        style={{ backgroundColor: "#0D1526" }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
          <span className="ml-3 text-xs font-terminal" style={{ color: "#00D4FF" }}>
            ⚡ Serpio Terminal
          </span>
          {activeJobId && (
            <span className="ml-2 flex items-center gap-1.5 text-xs font-ui" style={{ color: "#64748B" }}>
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "animate-pulse" : ""}`}
                style={{ backgroundColor: isConnected ? "#00FF87" : "#64748B" }}
              />
              {isConnected ? "canlı" : "bağlantı kesildi"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeJobId && (
            <span className="text-[10px] font-ui" style={{ color: "#334155" }}>
              #{activeJobId.slice(0, 8)}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLines(makeSystemLines());
            }}
            className="text-xs transition-colors font-ui hover:text-text"
            style={{ color: "#64748B" }}
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Çıktı alanı */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 min-h-0">
        {!activeJobId && lines.length <= 7 && (
          <div className="py-8 text-center">
            <p className="text-xs font-ui" style={{ color: "#64748B" }}>
              Bir scraping veya AI işi başlattığınızda loglar burada görünecek.
            </p>
          </div>
        )}
        {lines.map((line) => (
          <div key={line.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-xs flex-shrink-0 w-[68px] font-terminal select-none" style={{ color: "#334155" }}>
              [{line.ts}]
            </span>
            <span className="text-xs flex-shrink-0 w-4 font-terminal select-none" style={{ color: lineColor(line.level) }}>
              {lineIcon(line.level)}
            </span>
            <span className="text-xs font-terminal whitespace-pre-wrap break-all" style={{ color: lineColor(line.level) }}>
              {line.text || "\u00A0"}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Alt not */}
      <div className="px-4 py-2 border-t border-border/30 flex-shrink-0" style={{ backgroundColor: "rgba(13,21,38,0.5)" }}>
        <p className="text-[10px] font-ui" style={{ color: "#64748B" }}>
          {activeJobId
            ? `İş izleniyor — ID: ${activeJobId}`
            : "Bir scraping veya AI işi başlattığınızda loglar burada görünecek."}
        </p>
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t border-border/50 flex-shrink-0"
        style={{ backgroundColor: "rgba(13,21,38,0.8)" }}
      >
        <span className="text-xs flex-shrink-0 font-terminal" style={{ color: "#00FF87" }}>$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              runCommand(input);
              setInput("");
            }
          }}
          placeholder="komut girin... (help)"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-xs outline-none font-terminal"
          style={{ color: "#E2E8F0", caretColor: "#00FF87" }}
        />
      </div>
    </div>
  );
}
