import { Injectable, NestMiddleware, BadRequestException, ConflictException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private static cache = new Map<string, { statusCode: number; body: any; timestamp: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const idempotencyKey = req.headers['idempotency-key'] as string;

      if (idempotencyKey) {
        const cached = IdempotencyMiddleware.cache.get(idempotencyKey);
        if (cached) {
          // If request was completed within 24h, return cached response directly
          return res.status(cached.statusCode).json(cached.body);
        }

        // Intercept response write to cache the response body
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
          IdempotencyMiddleware.cache.set(idempotencyKey, {
            statusCode: res.statusCode,
            body,
            timestamp: Date.now(),
          });
          return originalJson(body);
        };
      }
    }

    next();
  }
}
