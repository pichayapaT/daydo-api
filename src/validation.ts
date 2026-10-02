import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
  return result.data;
}
export const credentialsSchema = z.object({
  login: z.string().trim().min(1).max(254).transform(value => value.toLowerCase()),
  password: z.string().min(10).max(128),
}).strict();
export const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(1).max(80),
}).strict();
export const usernameSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
}).strict();
export const displayNameSchema = z.object({
  name: z.string().trim().min(1).max(80),
}).strict();
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(10).max(128),
  newPassword: z.string().min(10).max(128),
}).strict().refine(value => value.currentPassword !== value.newPassword, { message: 'รหัสผ่านใหม่ต้องต่างจากรหัสเดิม', path: ['newPassword'] });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return value >= '1000-01-01' && value <= '9999-12-31' && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const id = z.string().uuid();
const monthKey = z.string().regex(/^\d{4}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}-01T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 7) === value;
});
const habitIcons = [
  'water', 'book', 'sun', 'leaf', 'heart', 'coffee', 'droplet', 'glass-water', 'moon', 'bed', 'dumbbell', 'bike',
  'activity', 'footprints', 'stretch', 'apple', 'salad', 'utensils', 'cooking-pot', 'brain', 'smile', 'music',
  'headphones', 'mic', 'pencil', 'notebook', 'book-heart', 'list-checks', 'timer', 'clock', 'calendar-check',
  'home', 'briefcase', 'laptop', 'phone', 'flower', 'tree', 'mountain', 'cloud-sun', 'umbrella', 'waves', 'wind',
  'bath', 'cat', 'dog', 'bird', 'pill', 'heart-pulse', 'hand-heart', 'sparkles', 'star', 'flame', 'zap', 'camera',
  'palette', 'gamepad', 'tv', 'wallet', 'piggy-bank', 'users', 'message',
] as const;
const legacyHabitColors: Record<string, string> = {
  mint: '#d0e8da', lavender: '#e2d6f5', yellow: '#f3e28a', orange: '#f6c9b0',
  sky: '#cfe4f5', rose: '#f5d0dc', sand: '#ebe0cc', sage: '#d5e4c8',
};
const habitColor = z.string().trim().transform(value => legacyHabitColors[value] || value.toLowerCase()).pipe(z.string().regex(/^#[0-9a-f]{6}$/));
const legacyHabitTimes: Record<string, string> = { 'ไม่ระบุ': '', 'เช้า': '07:00', 'กลางวัน': '12:00', 'เย็น': '18:00' };
const habitTime = z.string().trim().transform(value => legacyHabitTimes[value] ?? value).pipe(
  z.string().refine(value => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), { message: 'Invalid habit time' }),
);
const taskTime = z.string().trim().refine(value => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), { message: 'Invalid task time' });
export const dataSchema = z.object({
  version: z.literal(2), revision: z.number().int().nonnegative(),
  tasks: z.array(z.object({ id, title: z.string().trim().min(1).max(200), detail: z.string().max(5000), date: date.nullable(), dueDate: date.nullable(), time: taskTime.default(''), important: z.boolean().nullable(), checklist: z.array(z.object({ id, title: z.string().trim().min(1).max(200), done: z.boolean() }).strict()).max(100), priority: z.enum(['low', 'medium', 'high']), done: z.boolean(), urgent: z.boolean().nullable() }).strict()).max(1000),
  habits: z.array(z.object({ id, name: z.string().trim().min(1).max(200), icon: z.enum(habitIcons), color: habitColor, days: z.array(z.number().int().min(0).max(6)).min(1).max(7), time: habitTime, active: z.boolean(), created: date }).strict()).max(1000),
  checks: z.array(z.object({ habitId: id, date, status: z.enum(['done', 'skip']), note: z.string().max(5000) }).strict()).max(10000),
  habitMonths: z.array(z.object({ month: monthKey, goal: z.string().max(500), notes: z.string().max(5000), reflectionWell: z.string().max(2000), reflectionImprove: z.string().max(2000), reflectionProud: z.string().max(2000) }).strict()).max(240).default([]),
}).strict().superRefine((data, context) => {
  const unique = (values: string[]) => new Set(values).size === values.length;
  const habits = new Map(data.habits.map(habit => [habit.id, habit]));
  if (data.tasks.some(task => !unique(task.checklist.map(item => item.id))) || !unique(data.tasks.map(task => task.id)) || !unique(data.habits.map(habit => habit.id)) || !unique(data.checks.map(check => `${check.habitId}:${check.date}`)) || !unique(data.habitMonths.map(entry => entry.month)) || data.habits.some(habit => new Set(habit.days).size !== habit.days.length) || data.checks.some(check => !habits.has(check.habitId) || check.date < habits.get(check.habitId)!.created)) {
    context.addIssue({ code: 'custom', message: 'Duplicate or invalid references' });
  }
});
export type Snapshot = z.infer<typeof dataSchema>;
