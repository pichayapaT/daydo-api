import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPool, PoolConnection } from 'mysql2/promise';
import { config } from './config';

@Injectable()
export class Database implements OnModuleDestroy {
  readonly pool = createPool({
    host: config.MYSQL_HOST, port: config.MYSQL_PORT,
    database: config.MYSQL_DATABASE, user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD, connectionLimit: 10,
    dateStrings: true, timezone: 'Z', charset: 'utf8mb4',
  });

  async transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }
  async onModuleDestroy() { await this.pool.end(); }
}
