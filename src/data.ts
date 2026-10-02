import { Body, ConflictException, Controller, Get, Injectable, Put, Req, UseGuards } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import { Database } from './database';
import { AuthRequest, SessionGuard } from './auth';
import { dataSchema, Snapshot, validate } from './validation';

@Injectable()
export class DataService {
  constructor(private readonly db: Database) {}
  async load(userId: string): Promise<Snapshot> {
    return this.db.transaction(async connection => {
      // A transaction ensures the revision and records describe the same snapshot.
      const [users] = await connection.execute<RowDataPacket[]>('SELECT revision FROM users WHERE id = ?', [userId]);
      const [tasks] = await connection.execute<RowDataPacket[]>('SELECT id, title, detail, date, due_date AS dueDate, time, priority, important, done, urgent, checklist FROM tasks WHERE user_id = ? ORDER BY date, time, id', [userId]);
      const [habits] = await connection.execute<RowDataPacket[]>('SELECT id, name, icon, color, days, time, active, created FROM habits WHERE user_id = ? ORDER BY created, id', [userId]);
      const [checks] = await connection.execute<RowDataPacket[]>('SELECT habit_id AS habitId, date, status, note FROM habit_checks WHERE user_id = ? ORDER BY date, habit_id', [userId]);
      const [habitMonths] = await connection.execute<RowDataPacket[]>('SELECT month, goal, notes, reflection_well AS reflectionWell, reflection_improve AS reflectionImprove, reflection_proud AS reflectionProud FROM habit_months WHERE user_id = ? ORDER BY month', [userId]);
      return {
        version: 2, revision: users[0].revision,
        tasks: tasks.map(row => ({ ...row, time: typeof row.time === 'string' ? row.time : '', done: Boolean(row.done), urgent: row.urgent === null ? null : Boolean(row.urgent), important: row.important === null ? null : Boolean(row.important), checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : row.checklist })) as Snapshot['tasks'],
        habits: habits.map(row => ({ ...row, active: Boolean(row.active), days: typeof row.days === 'string' ? JSON.parse(row.days) : row.days })) as Snapshot['habits'],
        checks: checks as Snapshot['checks'],
        habitMonths: habitMonths as Snapshot['habitMonths'],
      };
    });
  }
  async save(userId: string, input: unknown) {
    if (input && typeof input === 'object' && 'version' in input && input.version !== 2) throw new ConflictException('แอปมีรุ่นใหม่ กรุณารีเฟรชหน้าเว็บก่อนบันทึก');
    const data = validate(dataSchema, input);
    return this.db.transaction(async connection => {
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT revision FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (rows[0].revision !== data.revision) throw new ConflictException('ข้อมูลเปลี่ยนจากอีกหน้าต่างแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง');
      await connection.execute('DELETE FROM habit_checks WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM habits WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM tasks WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM habit_months WHERE user_id = ?', [userId]);
      for (const task of data.tasks) await connection.execute('INSERT INTO tasks (user_id, id, title, detail, date, priority, done, urgent, due_date, important, checklist, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, task.id, task.title, task.detail, task.date, task.priority, task.done, task.urgent, task.dueDate, task.important, JSON.stringify(task.checklist), task.time]);
      for (const habit of data.habits) await connection.execute('INSERT INTO habits (user_id, id, name, icon, color, days, time, active, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, habit.id, habit.name, habit.icon, habit.color, JSON.stringify(habit.days), habit.time, habit.active, habit.created]);
      for (const check of data.checks) await connection.execute('INSERT INTO habit_checks (user_id, habit_id, date, status, note) VALUES (?, ?, ?, ?, ?)', [userId, check.habitId, check.date, check.status, check.note]);
      for (const entry of data.habitMonths) await connection.execute('INSERT INTO habit_months (user_id, month, goal, notes, reflection_well, reflection_improve, reflection_proud) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, entry.month, entry.goal, entry.notes, entry.reflectionWell, entry.reflectionImprove, entry.reflectionProud]);
      await connection.execute('UPDATE users SET revision = revision + 1 WHERE id = ?', [userId]);
      return { revision: data.revision + 1 };
    });
  }
}

@Controller('data') @UseGuards(SessionGuard)
export class DataController {
  constructor(private readonly data: DataService) {}
  @Get()
  load(@Req() request: AuthRequest) { return this.data.load(request.user.id); }
  @Put()
  save(@Req() request: AuthRequest, @Body() body: unknown) { return this.data.save(request.user.id, body); }
}
