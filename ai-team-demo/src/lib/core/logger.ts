export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context: Record<string, unknown>
}

export interface LogTransport {
  log(entry: LogEntry): void
}

class ConsoleTransport implements LogTransport {
  log(entry: LogEntry): void {
    const levelName = LogLevel[entry.level]
    const prefix = `[${entry.timestamp}] [${levelName}]`
    const ctxStr = Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : ''

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${entry.message}${ctxStr}`)
        break
      case LogLevel.INFO:
        console.info(`${prefix} ${entry.message}${ctxStr}`)
        break
      case LogLevel.WARN:
        console.warn(`${prefix} ${entry.message}${ctxStr}`)
        break
      case LogLevel.ERROR:
        console.error(`${prefix} ${entry.message}${ctxStr}`)
        break
    }
  }
}

export interface LoggerOptions {
  minLevel?: LogLevel
  transports?: LogTransport[]
  context?: Record<string, unknown>
}

export class Logger {
  private minLevel: LogLevel
  private transports: LogTransport[]
  private baseContext: Record<string, unknown>

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel ?? (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG)
    this.transports = options.transports ?? [new ConsoleTransport()]
    this.baseContext = options.context ?? {}
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context)
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger({
      minLevel: this.minLevel,
      transports: this.transports,
      context: { ...this.baseContext, ...context },
    })
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.minLevel) return

    const mergedContext: Record<string, unknown> = { ...this.baseContext }
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (value instanceof Error) {
          mergedContext[key] = value.message
        } else {
          mergedContext[key] = value
        }
      }
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: mergedContext,
    }

    for (const transport of this.transports) {
      transport.log(entry)
    }
  }
}

export function createLogger(module: string, transports?: LogTransport[]): Logger {
  return new Logger({ context: { module }, transports })
}

export const logger = new Logger()
