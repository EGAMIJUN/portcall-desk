import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATE, parseWhen, defaultEtd, dueFor, fmtDate, fmtDateTime,
  epicSummary, parseEpicSummary, templateByLabel, taskLabel,
} from '../src/schedule.js';

test('parseWhen treats bare local time as JST', () => {
  assert.equal(parseWhen('2026-12-01 09:00').toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(parseWhen('2026-12-01T09:00').toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(parseWhen('2026-12-01T00:00:00Z').toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(parseWhen('garbage'), null);
  assert.equal(parseWhen(''), null);
});

test('formatting is in JST', () => {
  const d = parseWhen('2026-12-01 09:00');
  assert.equal(fmtDateTime(d), '2026-12-01 09:00');
  assert.equal(fmtDate(parseWhen('2026-12-01 00:30')), '2026-12-01');
});

test('due dates follow ETA and ETD offsets', () => {
  const eta = parseWhen('2026-12-01 09:00');
  const etd = defaultEtd(eta);
  assert.equal(fmtDateTime(etd), '2026-12-03 09:00');
  const pilot = TEMPLATE.find((t) => t.id === 'pilot-in');
  assert.equal(fmtDateTime(dueFor(pilot, eta, etd)), '2026-11-30 21:00');
  const dep = TEMPLATE.find((t) => t.id === 'dep-notice');
  assert.equal(fmtDateTime(dueFor(dep, eta, etd)), '2026-12-03 07:00');
});

test('template ids and labels are unique, label lookup round-trips', () => {
  assert.equal(new Set(TEMPLATE.map((t) => t.id)).size, TEMPLATE.length);
  for (const t of TEMPLATE) assert.equal(templateByLabel(taskLabel(t)), t);
});

test('epic summary round-trips', () => {
  const s = epicSummary('MV TEST (II)', parseWhen('2026-12-01 09:00'));
  assert.deepEqual(parseEpicSummary(s), { vessel: 'MV TEST (II)', eta: '2026-12-01 09:00' });
  assert.equal(parseEpicSummary('something else'), null);
});
