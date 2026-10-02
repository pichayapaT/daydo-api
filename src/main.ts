import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { json } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { AuthController, AuthService, SessionGuard } from './auth';
import { DataController, DataService } from './data';
import { Database } from './database';
import { config } from './config';

@Controller('health')
class HealthController {
  constructor(private readonly db: Database) {}
  @Get()
  async health() { await this.db.pool.query('SELECT 1'); return { ok: true }; }
}
@Module({ controllers: [AuthController, DataController, HealthController], providers: [Database, AuthService, SessionGuard, DataService] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== config.APP_ORIGIN) {
      response.status(403).json({ message: 'แหล่งที่มาของคำขอไม่ถูกต้อง' });
      return;
    }
    next();
  });
  app.use(json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(['/api/auth/login', '/api/auth/register'], rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที' }, validate: { xForwardedForHeader: false } }));
  app.enableShutdownHooks();
  await app.get(Database).pool.query('SELECT id FROM users LIMIT 1');
  await app.listen(config.API_PORT, config.API_HOST);
}
bootstrap().catch(() => { console.error('API startup failed. Run docker compose up -d --wait and npm run db:migrate, and check .env.'); process.exitCode = 1; });
