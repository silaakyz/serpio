export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}
