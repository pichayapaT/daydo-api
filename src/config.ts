import 'dotenv/config';
import { z } from 'zod';

export const config = z.object({
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().min(1).max(65535).default(3307),
  MYSQL_DATABASE: z.string().min(1),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string().min(1),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_HOST: z.string().default('127.0.0.1'),
  APP_ORIGIN: z.string().url(),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
}).parse(process.env);
if (process.env.NODE_ENV === 'production' && (config.COOKIE_SECURE !== 'true' || !config.APP_ORIGIN.startsWith('https://'))) {
  throw new Error('Production requires HTTPS APP_ORIGIN and COOKIE_SECURE=true');
}
