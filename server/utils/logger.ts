import pino from 'pino';

// Determine log level based on environment
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'trace';

// Create a logger instance
const logger = pino({
  level: logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Create a child logger with a specific module name
export function createLogger(module: string) {
  return logger.child({ module });
}

export default logger;