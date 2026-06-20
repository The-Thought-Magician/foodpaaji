export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export function log(level: LogLevel, message: string, meta?: unknown) {
  const isDev = process.env.NODE_ENV === 'development'
  const payload = { message, meta }
  switch (level) {
    case 'debug':
    case 'info':
      if (isDev) console.warn(payload)
      break
    case 'warn':
      console.warn(payload)
      break
    case 'error':
      console.error(payload)
      break
  }
}
