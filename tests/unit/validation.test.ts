import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { changePasswordSchema, credentialsSchema, dataSchema, registerSchema, usernameSchema } from '../../src/validation';

const empty = () => ({ version: 2, revision: 0, tasks: [], habits: [], checks: [], habitMonths: [] });
test('credentials normalize login and reject short passwords and client-supplied owners', () => {
  assert.equal(credentialsSchema.parse({ login: '  USER@example.test ', password: 'valid-password' }).login, 'user@example.test');
  assert.equal(credentialsSchema.parse({ login: '  Nice_User ', password: 'valid-password' }).login, 'nice_user');
  assert.equal(credentialsSchema.safeParse({ login: 'user@example.test', password: 'short' }).success, false);
  assert.equal(registerSchema.safeParse({ email: 'user@example.test', password: 'valid-password', name: 'User', userId: randomUUID() }).success, false);
});
test('username can be set once and password change requires a different new password', () => {
  assert.equal(usernameSchema.parse({ username: 'Day_Do1' }).username, 'day_do1');
  assert.equal(usernameSchema.safeParse({ username: 'ab' }).success, false);
  assert.equal(usernameSchema.safeParse({ username: 'bad-name' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'valid-password', newPassword: 'valid-password' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'valid-password', newPassword: 'another-password' }).success, true);
});
test('snapshots accept empty data and reject owner fields and invalid dates', () => {
  assert.equal(dataSchema.safeParse(empty()).success, true);
  assert.equal(dataSchema.safeParse({ ...empty(), userId: randomUUID() }).success, false);
  const task = { id: randomUUID(), title: 'Work', detail: '', date: '2024-02-29', priority: 'medium', done: false, dueDate: null, time: '', important: null, urgent: null, checklist: [] };
  assert.equal(dataSchema.safeParse({ ...empty(), tasks: [task] }).success, true);
  assert.equal(dataSchema.safeParse({ ...empty(), tasks: [{ ...task, date: '2026-02-29' }] }).success, false);
});
test('history must reference an existing habit and cannot predate its creation', () => {
  const habit = { id: randomUUID(), name: 'Read', icon: 'book', color: 'mint', days: [1], time: 'เช้า', active: true, created: '2026-01-01' };
  const check = { habitId: habit.id, date: '2026-01-02', status: 'done', note: '' };
  assert.equal(dataSchema.safeParse({ ...empty(), habits: [habit], checks: [check] }).success, true);
  assert.equal(dataSchema.safeParse({ ...empty(), checks: [check] }).success, false);
  assert.equal(dataSchema.safeParse({ ...empty(), habits: [habit], checks: [{ ...check, date: '2025-12-31' }] }).success, false);
});
test('duplicate IDs, repeated weekdays and invalid revisions are rejected', () => {
  const habit = { id: randomUUID(), name: 'Read', icon: 'book', color: 'mint', days: [1], time: 'เช้า', active: true, created: '2026-01-01' };
  assert.equal(dataSchema.safeParse({ ...empty(), habits: [habit, habit] }).success, false);
  assert.equal(dataSchema.safeParse({ ...empty(), habits: [{ ...habit, days: [1, 1] }] }).success, false);
  assert.equal(dataSchema.safeParse({ ...empty(), revision: -1 }).success, false);
});

test('task urgency accepts explicit booleans and unspecified values', () => {
  const task = { id: randomUUID(), title: 'Work', detail: '', date: '2026-09-30', priority: 'high', done: false, dueDate: null, time: '09:30', important: null, urgent: null, checklist: [] };
  assert.equal(dataSchema.parse({ ...empty(), tasks: [task] }).tasks[0].urgent, null);
  assert.equal(dataSchema.parse({ ...empty(), tasks: [{ ...task, urgent: true }] }).tasks[0].urgent, true);
  assert.equal(dataSchema.parse({ ...empty(), tasks: [{ ...task, time: '' }] }).tasks[0].time, '');
  assert.equal(dataSchema.safeParse({ ...empty(), tasks: [{ ...task, time: '25:00' }] }).success, false);
  assert.equal(dataSchema.safeParse({ ...empty(), tasks: [{ ...task, urgent: 'true' }] }).success, false);
});

test('Inbox, deadlines and checklists validate without accepting ownership or duplicate child IDs', () => {
 const item = { id: randomUUID(), title: 'Step', done: false };
 const task = { id: randomUUID(), title: 'Inbox', detail: '', date: null, dueDate: '2028-02-29', time: '', priority: 'medium', important: null, urgent: null, done: false, checklist: [item] };
 const input = { ...empty(), tasks: [task] };
 assert.equal(dataSchema.safeParse(input).success, true);
 for (const change of [{ dueDate: '2026-02-29' }, { date: '' }, { important: 'false' }, { checklist: [item,item] }, { checklist: [{...item,userId:randomUUID()}] }, { checklist: [{...item,title:' '}] }]) {
  assert.equal(dataSchema.safeParse({...input,tasks:[{...task,...change}]}).success,false);
 }
 assert.equal(dataSchema.safeParse({...input,version:1}).success,false);
});

test('habit icons and colors accept curated Lucide ids and normalize hex', () => {
  const habit = { id: randomUUID(), name: 'Read', icon: 'moon', color: 'mint', days: [1], time: 'เช้า', active: true, created: '2026-01-01' };
  assert.equal(dataSchema.parse({ ...empty(), habits: [habit] }).habits[0].color, '#d0e8da');
  assert.equal(dataSchema.parse({ ...empty(), habits: [habit] }).habits[0].time, '07:00');
  assert.equal(dataSchema.parse({ ...empty(), habits: [{ ...habit, color: '#FCCEE8', time: '06:30' }] }).habits[0].color, '#fccee8');
  assert.equal(dataSchema.parse({ ...empty(), habits: [{ ...habit, time: 'ไม่ระบุ' }] }).habits[0].time, '');
  assert.equal(dataSchema.safeParse({ ...empty(), habits: [{ ...habit, icon: 'not-an-icon' }] }).success, false);
  assert.equal(dataSchema.safeParse({ ...empty(), habits: [{ ...habit, color: '#fff' }] }).success, false);
  assert.equal(dataSchema.safeParse({ ...empty(), habits: [{ ...habit, time: '25:00' }] }).success, false);
});

test('habit month journals validate and default to an empty list', () => {
  assert.deepEqual(dataSchema.parse(empty()).habitMonths, []);
  const entry = { month: '2026-09', goal: 'Drink water', notes: 'ok', reflectionWell: '', reflectionImprove: '', reflectionProud: 'started' };
  assert.equal(dataSchema.safeParse({ ...empty(), habitMonths: [entry] }).success, true);
  assert.equal(dataSchema.safeParse({ ...empty(), habitMonths: [{ ...entry, month: '2026-13' }] }).success, false);
  assert.equal(dataSchema.safeParse({ ...empty(), habitMonths: [entry, entry] }).success, false);
});
