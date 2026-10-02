import { BadRequestException, Body, CanActivate, ConflictException, Controller, ExecutionContext, Get, HttpCode, Injectable, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { Database } from './database';
import { config } from './config';
import { changePasswordSchema, credentialsSchema, displayNameSchema, registerSchema, usernameSchema, validate } from './validation';

export type User = { id: string; email: string; name: string; username: string | null };
export type AuthRequest = Request & { user: User };
const cookieName = 'day_by_day_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;
const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: config.COOKIE_SECURE === 'true', path: '/' };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt)).toString('hex')}`;
}
async function verifyPassword(password: string, hash: string) {
  const [salt, encoded] = hash.split(':');
  const key = await derive(password, salt);
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}
const dummyHash = `${'0'.repeat(32)}:${'0'.repeat(128)}`;
function tokenFrom(request: Request): string | undefined {
  const token: unknown = request.cookies?.[cookieName];
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
}
function toUser(row: RowDataPacket): User {
  return { id: row.id, email: row.email, name: row.name, username: row.username ?? null };
}

@Injectable()
export class AuthService {
  constructor(private readonly db: Database) {}
  async register(input: unknown) {
    const value = validate(registerSchema, input);
    const user: User = { id: randomUUID(), email: value.email, name: value.name, username: null };
    const hash = await hashPassword(value.password);
    try {
      await this.db.pool.execute('INSERT INTO users (id, email, name, password_hash, username) VALUES (?, ?, ?, ?, NULL)', [user.id, user.email, user.name, hash]);
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
      throw error;
    }
    return user;
  }
  async login(input: unknown): Promise<User> {
    const value = validate(credentialsSchema, input);
    const [rows] = await this.db.pool.execute<RowDataPacket[]>(
      'SELECT id, email, name, username, password_hash FROM users WHERE email = ? OR username = ? LIMIT 1',
      [value.login, value.login],
    );
    const row = rows[0];
    const valid = await verifyPassword(value.password, row?.password_hash ?? dummyHash);
    if (!row || !valid) throw new UnauthorizedException('อีเมล ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
    return toUser(row);
  }
  async startSession(user: User, request: Request, response: Response) {
    const token = randomBytes(32).toString('hex');
    await this.db.transaction(async connection => {
      const previous = tokenFrom(request);
      if (previous) await connection.execute('DELETE FROM sessions WHERE token_hash = ?', [digest(previous)]);
      await connection.execute('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()');
      await connection.execute('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [digest(token), user.id, new Date(Date.now() + lifetime)]);
    });
    response.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime });
  }
  async currentUser(request: Request): Promise<User> {
    const token = tokenFrom(request);
    if (!token) throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
    const [rows] = await this.db.pool.execute<RowDataPacket[]>('SELECT u.id, u.email, u.name, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()', [digest(token)]);
    if (!rows[0]) throw new UnauthorizedException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
    return toUser(rows[0]);
  }
  async setUsername(userId: string, input: unknown): Promise<User> {
    const { username } = validate(usernameSchema, input);
    return this.db.transaction(async connection => {
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT id, email, name, username FROM users WHERE id = ? FOR UPDATE', [userId]);
      const row = rows[0];
      if (!row) throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
      if (row.username) throw new BadRequestException('ตั้งชื่อผู้ใช้ได้เพียงครั้งเดียว');
      const [taken] = await connection.execute<RowDataPacket[]>('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, username]);
      if (taken[0]) throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
      await connection.execute('UPDATE users SET username = ? WHERE id = ? AND username IS NULL', [username, userId]);
      return { id: row.id, email: row.email, name: row.name, username };
    });
  }
  async updateDisplayName(userId: string, input: unknown): Promise<User> {
    const { name } = validate(displayNameSchema, input);
    return this.db.transaction(async connection => {
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT id, email, name, username FROM users WHERE id = ? FOR UPDATE', [userId]);
      const row = rows[0];
      if (!row) throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
      await connection.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
      return { id: row.id, email: row.email, name, username: row.username ?? null };
    });
  }
  async changePassword(userId: string, input: unknown) {
    const value = validate(changePasswordSchema, input);
    await this.db.transaction(async connection => {
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT password_hash FROM users WHERE id = ? FOR UPDATE', [userId]);
      const row = rows[0];
      if (!row) throw new UnauthorizedException('กรุณาเข้าสู่ระบบ');
      if (!(await verifyPassword(value.currentPassword, row.password_hash))) throw new UnauthorizedException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(value.newPassword), userId]);
    });
  }
  async logout(request: Request, response: Response) {
    const token = tokenFrom(request);
    if (token) await this.db.pool.execute('DELETE FROM sessions WHERE token_hash = ?', [digest(token)]);
    response.clearCookie(cookieName, cookieOptions);
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await this.auth.currentUser(request);
    if (request.headers['x-account-id'] && request.headers['x-account-id'] !== request.user.id) throw new UnauthorizedException('บัญชีที่ใช้งานเปลี่ยนแล้ว กรุณาเข้าสู่ระบบอีกครั้ง');
    return true;
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register')
  async register(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const user = await this.auth.register(body);
    await this.auth.startSession(user, request, response);
    return { user };
  }
  @Post('login') @HttpCode(200)
  async login(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const user = await this.auth.login(body);
    await this.auth.startSession(user, request, response);
    return { user };
  }
  @Get('me') @UseGuards(SessionGuard)
  me(@Req() request: AuthRequest) { return { user: request.user }; }
  @Post('username') @HttpCode(200) @UseGuards(SessionGuard)
  setUsername(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.auth.setUsername(request.user.id, body).then(user => ({ user }));
  }
  @Post('profile') @HttpCode(200) @UseGuards(SessionGuard)
  updateProfile(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.auth.updateDisplayName(request.user.id, body).then(user => ({ user }));
  }
  @Post('password') @HttpCode(200) @UseGuards(SessionGuard)
  async changePassword(@Req() request: AuthRequest, @Body() body: unknown) {
    await this.auth.changePassword(request.user.id, body);
    return { ok: true };
  }
  @Post('logout') @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request, response);
    return { ok: true };
  }
}
