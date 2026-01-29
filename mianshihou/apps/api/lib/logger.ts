import pino from 'pino';

// 创建日志配置
const logConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  // 开发环境使用 pino-pretty 美化
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }),
  // 生产环境配置
  ...(process.env.NODE_ENV === 'production' && {
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
  }),
};

// 创建日志实例
export const logger = pino(logConfig);

// 创建带上下文的日志记录器
export function createLogger(context: string) {
  return logger.child({ context });
}

// 常用日志方法
export const log = {
  info: (message: string, data?: any) => logger.info(data, message),
  error: (message: string, error?: any, data?: any) => {
    logger.error({ ...data, error }, message);
  },
  warn: (message: string, data?: any) => logger.warn(data, message),
  debug: (message: string, data?: any) => logger.debug(data, message),
};
