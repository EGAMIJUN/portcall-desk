import * as jira from './jira';
import {
  TEMPLATE, parseWhen, defaultEtd, dueFor, fmtDate, fmtDateTime,
  epicSummary, taskSummary, taskLabel, templateByLabel, parseEpicSummary,
} from './schedule';

const DAY = 24 * 3600 * 1000;

async function pickProject(projectKey) {
  const projects = await jira.listProjects();
  if (projects.length === 0) throw new Error('No Jira project is visible to this user. Create a Jira project first.');
  if (projectKey) {
    const p = projects.find((x) => x.key.toLowerCase() === String(projectKey).toLowerCase());
    if (!p) throw new Error(`Project "${projectKey}" not found. Available: ${projects.map((x) => x.key).join(', ')}`);
    return p;
  }
  return projects.find((p) => /port|vessel|ship/i.test(`${p.key} ${p.name}`)) || projects[0];
}

function pickTypes(project) {
  const types = project.issueTypes || [];
  const epic = types.find((t) => t.hierarchyLevel === 1) || types.find((t) => /epic/i.test(t.name));
  const task = types.find((t) => !t.subtask && t.hierarchyLevel === 0 && /^task$/i.test(t.name))
    || types.find((t) => !t.subtask && t.hierarchyLevel === 0);
  const sub = types.find((t) => t.subtask);
  if (epic && task) return { parent: epic, child: task };
  if (task && sub) return { parent: task, child: sub };
  throw new Error('This Jira project needs an Epic and Task issue type (or Task and Sub-task).');
}

function epicDescription({ vessel, imo, berth, eta, etd }) {
  return jira.adf([
    `Vessel: ${vessel}${imo ? ` (IMO ${imo})` : ''}`,
    `Berth / terminal: ${berth || 'to be confirmed'}`,
    `ETA: ${fmtDateTime(eta)} JST`,
    `ETD: ${fmtDateTime(etd)} JST`,
  ].join('\n'));
}

function whenOrThrow(value, label) {
  const d = parseWhen(value);
  if (!d) throw new Error(`${label} "${value}" is not a valid date-time. Use e.g. 2026-11-12 09:00 (Japan time).`);
  return d;
}

// Creates all tasks in one bulk call. If the project's screens lack a due-date field, retry without it.
async function createChildren(list) {
  const attempt = async (items) => {
    const res = await jira.createIssues(items);
    return { issues: res.issues || [], errors: res.errors || [] };
  };
  let out = await attempt(list);
  if (out.issues.length === 0 && out.errors.length && JSON.stringify(out.errors).match(/due ?date/i)) {
    out = await attempt(list.map(({ duedate, ...rest }) => rest));
  }
  return out;
}

export async function createPortCall({ vesselName, eta, etd, berth, imo, projectKey }) {
  if (!vesselName || !String(vesselName).trim()) throw new Error('vesselName is required.');
  const etaDate = whenOrThrow(eta, 'ETA');
  const etdDate = etd ? whenOrThrow(etd, 'ETD') : defaultEtd(etaDate);
  if (etdDate <= etaDate) throw new Error('ETD must be after ETA.');

  const projectRef = await pickProject(projectKey);
  const project = await jira.getProject(projectRef.key);
  const types = pickTypes(project);
  const vessel = String(vesselName).trim();

  // Guard against double submits (e.g. the approval card confirmed twice): same vessel + same ETA = same port call.
  const wanted = epicSummary(vessel, etaDate);
  const existing = (await jira.search(`labels = portcall AND summary ~ "\\"${vessel.replace(/["\\]/g, '')}\\""`, ['summary', 'labels']))
    .find((i) => i.fields.summary === wanted && !i.fields.labels.some((l) => l.startsWith('pc-')));
  if (existing) {
    throw new Error(`${existing.key} already exists for ${vessel} with ETA ${fmtDateTime(etaDate)} JST. Nothing was created. Use the ETA update to change it.`);
  }

  const epic = await jira.createIssue({
    project: { key: project.key },
    issuetype: { id: types.parent.id },
    summary: epicSummary(vessel, etaDate),
    description: epicDescription({ vessel, imo, berth, eta: etaDate, etd: etdDate }),
    labels: ['portcall'],
  });
  await jira.setProperty(epic.key, 'portcall', {
    vessel, imo: imo || null, berth: berth || null, eta: etaDate.toISOString(), etd: etdDate.toISOString(),
  });

  const items = TEMPLATE.map((item) => {
    const due = dueFor(item, etaDate, etdDate);
    return {
      project: { key: project.key },
      issuetype: { id: types.child.id },
      parent: { key: epic.key },
      summary: taskSummary(item),
      description: jira.adf(`${item.note}\nTarget: ${fmtDateTime(due)} JST (${item.anchor}${item.hours >= 0 ? '+' : ''}${item.hours}h)\nVessel: ${vessel}`),
      labels: ['portcall', taskLabel(item)],
      duedate: fmtDate(due),
      _meta: { en: item.en, due: fmtDateTime(due) },
    };
  });
  const { issues, errors } = await createChildren(items.map(({ _meta, ...fields }) => fields));
  const created = issues.map((i, n) => ({ key: i.key, task: items[n]._meta.en, due: items[n]._meta.due }));
  const failed = errors.map((e) => ({ error: JSON.stringify(e).slice(0, 200) }));
  return {
    portCall: epic.key, project: project.key, vessel,
    eta: fmtDateTime(etaDate), etd: fmtDateTime(etdDate),
    tasksCreated: created.length, tasksFailed: failed.length, failed, tasks: created,
  };
}

async function findEpic({ epicKey, vesselName }) {
  if (epicKey) return String(epicKey).trim().toUpperCase();
  if (!vesselName) throw new Error('Give either epicKey (e.g. PORT-12) or vesselName.');
  const term = String(vesselName).replace(/["\\]/g, '');
  const hits = await jira.search(`labels = portcall AND summary ~ "\\"${term}\\"" ORDER BY created DESC`, ['summary', 'labels']);
  const epic = hits.find((i) => !i.fields.labels.some((l) => l.startsWith('pc-')));
  if (!epic) throw new Error(`No port call found for vessel "${vesselName}".`);
  return epic.key;
}

async function childrenOf(epicKey) {
  return jira.search(`parent = ${epicKey} ORDER BY created ASC`, ['summary', 'status', 'duedate', 'labels']);
}

export async function updateEta({ epicKey, vesselName, newEta, newEtd }) {
  const key = await findEpic({ epicKey, vesselName });
  const prop = await jira.getProperty(key, 'portcall');
  if (!prop) throw new Error(`${key} is not a PortCall Desk port call.`);
  const oldEta = new Date(prop.eta);
  const oldEtd = new Date(prop.etd);
  const eta = newEta ? whenOrThrow(newEta, 'New ETA') : oldEta;
  // If only ETA moved, keep the same length of stay.
  const etd = newEtd ? whenOrThrow(newEtd, 'New ETD') : new Date(eta.getTime() + (oldEtd - oldEta));
  if (etd <= eta) throw new Error('ETD must be after ETA.');

  const kids = await childrenOf(key);
  let skippedDone = 0;
  const updates = [];
  for (const k of kids) {
    const tpl = k.fields.labels.map(templateByLabel).find(Boolean);
    if (!tpl) continue;
    if (k.fields.status?.statusCategory?.key === 'done') { skippedDone += 1; continue; }
    const date = fmtDate(dueFor(tpl, eta, etd));
    if (date !== k.fields.duedate) updates.push({ key: k.key, date });
  }
  // Update in parallel batches (sequential updates of ~20 tasks take 30s+).
  let shifted = 0;
  for (let i = 0; i < updates.length; i += 8) {
    const batch = updates.slice(i, i + 8);
    const results = await Promise.allSettled(batch.map((u) => jira.updateIssue(u.key, { duedate: u.date })));
    shifted += results.filter((r) => r.status === 'fulfilled').length;
  }
  await jira.setProperty(key, 'portcall', { ...prop, eta: eta.toISOString(), etd: etd.toISOString() });
  // Keep the Epic title and description in step with the new dates. If a project's screen has no description field, change the title only.
  const summary = epicSummary(prop.vessel, eta);
  try {
    await jira.updateIssue(key, { summary, description: epicDescription({ vessel: prop.vessel, imo: prop.imo, berth: prop.berth, eta, etd }) });
  } catch (e) {
    await jira.updateIssue(key, { summary });
  }
  await jira.addComment(key, `ETA changed: ${fmtDateTime(oldEta)} -> ${fmtDateTime(eta)} JST; ETD ${fmtDateTime(etd)} JST. ${shifted} task due date(s) moved, ${skippedDone} completed task(s) left as they were.`);
  return {
    portCall: key, vessel: prop.vessel,
    previousEta: fmtDateTime(oldEta), eta: fmtDateTime(eta), etd: fmtDateTime(etd),
    tasksShifted: shifted, completedTasksUnchanged: skippedDone,
  };
}

function summarize(epic, tasks, now) {
  const info = parseEpicSummary(epic.fields.summary) || { vessel: epic.fields.summary, eta: null };
  const today = fmtDate(now);
  const tomorrow = fmtDate(new Date(now.getTime() + DAY));
  const open = tasks.filter((t) => t.fields.status?.statusCategory?.key !== 'done');
  const overdue = open.filter((t) => t.fields.duedate && t.fields.duedate < today);
  const dueSoon = open.filter((t) => t.fields.duedate && (t.fields.duedate === today || t.fields.duedate === tomorrow));
  const brief = (t) => ({ key: t.key, summary: t.fields.summary, due: t.fields.duedate || null, status: t.fields.status?.name });
  return {
    portCall: epic.key, vessel: info.vessel, eta: info.eta,
    total: tasks.length, done: tasks.length - open.length,
    overdue: overdue.map(brief), dueSoon: dueSoon.map(brief),
  };
}

export async function getStatus({ epicKey, vesselName }) {
  const key = await findEpic({ epicKey, vesselName });
  const [epicHits, kids] = await Promise.all([
    jira.search(`key = ${key}`, ['summary', 'status', 'labels']),
    childrenOf(key),
  ]);
  if (epicHits.length === 0) throw new Error(`${key} not found.`);
  const result = summarize(epicHits[0], kids, new Date());
  result.nextTasks = kids
    .filter((t) => t.fields.status?.statusCategory?.key !== 'done')
    .slice(0, 5)
    .map((t) => ({ key: t.key, summary: t.fields.summary, due: t.fields.duedate || null }));
  return result;
}

export async function listPortCalls() {
  const issues = await jira.search('labels = portcall ORDER BY created DESC', ['summary', 'status', 'duedate', 'parent', 'labels'], 100);
  const isTask = (i) => i.fields.labels.some((l) => l.startsWith('pc-'));
  const epics = issues.filter((i) => !isTask(i));
  const tasks = issues.filter(isTask);
  const now = new Date();
  return epics
    .map((e) => summarize(e, tasks.filter((t) => t.fields.parent?.key === e.key), now))
    .sort((a, b) => String(a.eta).localeCompare(String(b.eta)));
}

export async function listProjectChoices() {
  const projects = await jira.listProjects();
  return projects.map((p) => ({ key: p.key, name: p.name }));
}
