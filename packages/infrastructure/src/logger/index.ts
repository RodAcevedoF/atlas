import { type LoggerOptions, type Logger as PinoLogger, pino } from "pino";
import pretty from "pino-pretty";

export type LogFields = Record<string, unknown>;
export type LogWrite = (fields: LogFields, message: string) => void;

export interface Logger {
  info: LogWrite;
  warn: LogWrite;
  error: LogWrite;
}

const PRETTY_OPTIONS = {
  colorize: true,
  translateTime: "HH:MM:ss.l",
  ignore: "pid,hostname",
  singleLine: true,
  errorLikeObjectKeys: ["err", "error"],
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function createLogger(options: LoggerOptions = {}): PinoLogger {
  if (isProduction()) return pino(options);
  return pino(options, pretty(PRETTY_OPTIONS));
}
