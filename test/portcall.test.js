import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortCall, updateEta, getStatus, listPortCalls, db } from '../build-test/bundle.mjs';
import { TEMPLATE } from '../src/schedule.js';

test('create, status, list and ETA update against a fake Jira', async () => {
  const res = await createPortCall({ vesselName: 'MV TEST', eta: '2026-12-01 09:00', berth: 'Tagonoura' });
  assert.equal(res.tasksCreated, TEMPLATE.length);
  assert.equal(res.tasksFailed, 0);
  assert.equal(res.portCall, 'PORT-1');
  const pilot = db.issues.find((i) => i.fields.labels.includes('pc-pilot-in'));
  assert.equal(pilot.fields.duedate, '2026-11-30');
  assert.equal(pilot.fields.parent.key, 'PORT-1');

  const status = await getStatus({ epicKey: 'PORT-1' });
  assert.equal(status.total, TEMPLATE.length);
  assert.equal(status.done, 0);

  const list = await listPortCalls();
  assert.equal(list.length, 1);
  assert.equal(list[0].vessel, 'MV TEST');

  // one task done, then move ETA by +2 days
  db.issues.find((i) => i.fields.labels.includes('pc-berth')).fields.status = { name: 'Done', statusCategory: { key: 'done' } };
  const upd = await updateEta({ epicKey: 'PORT-1', newEta: '2026-12-03 09:00' });
  assert.equal(upd.completedTasksUnchanged, 1);
  assert.equal(upd.tasksShifted, TEMPLATE.length - 1);
  assert.equal(pilot.fields.duedate, '2026-12-02');
  assert.match(db.issues[0].fields.summary, /ETA 2026-12-03 09:00 JST/);
  assert.match(db.issues[0].fields.description.text, /ETA: 2026-12-03 09:00 JST/);
  assert.match(db.issues[0].fields.description.text, /Berth \/ terminal: Tagonoura/);
  assert.equal(db.comments.length, 1);
});

test('the same vessel and ETA is not created twice', async () => {
  const before = db.issues.length;
  await assert.rejects(() => createPortCall({ vesselName: 'MV TEST', eta: '2026-12-03 09:00' }), /already exists/);
  assert.equal(db.issues.length, before);
  // A different ETA is a different port call.
  const other = await createPortCall({ vesselName: 'MV TEST', eta: '2026-12-10 09:00' });
  assert.equal(other.tasksCreated, TEMPLATE.length);
});

test('bad input is rejected with a clear message', async () => {
  await assert.rejects(() => createPortCall({ vesselName: 'X', eta: 'soon' }), /not a valid date-time/);
  await assert.rejects(() => createPortCall({ vesselName: '', eta: '2026-12-01 09:00' }), /vesselName is required/);
  await assert.rejects(() => createPortCall({ vesselName: 'X', eta: '2026-12-01 09:00', etd: '2026-11-30 09:00' }), /ETD must be after ETA/);
});
