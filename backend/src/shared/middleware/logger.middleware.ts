import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Global HTTP request logger middleware.
 * Logs method, route path, status code, response time, and client details to the terminal.
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  /**
   * Intercepts request and registers handler on response finish to log outcome metadata.
   * 
   * @param req - Express request payload context.
   * @param res - Express response pipeline context.
   * @param next - Forward execution chain handler.
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const logMessage = `[${method}] ${originalUrl} - Status: ${statusCode} - Time: ${duration}ms - IP: ${ip} - UA: ${userAgent}`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
