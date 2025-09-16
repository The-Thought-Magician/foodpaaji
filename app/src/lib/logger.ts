export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export function log(level: LogLevel, message: string, meta?: unknown) {
    // Keep it simple and consistent
    const payload = { message, meta }
    switch (level) {
        case 'debug':
            if (import.meta.env.DEV) console.warn(payload)
            break
        case 'info':
            if (import.meta.env.DEV) console.warn(payload)
            break
        case 'warn':
            console.warn(payload)
            break
        case 'error':
            console.error(payload)
            break
    }
}
