// In-memory Jira stand-in used only for tests (replaces src/jira.js at bundle time).
export const db = { issues: [], props: {}, comments: [], n: 0 };
export const adf = (t) => ({ text: String(t) });
export async function listProjects() { return [{ key: 'PORT', name: 'Port Ops' }]; }
export async function getProject(key) {
  return { key, issueTypes: [
    { id: '1', name: 'Epic', hierarchyLevel: 1, subtask: false },
    { id: '2', name: 'Task', hierarchyLevel: 0, subtask: false },
    { id: '3', name: 'Subtask', hierarchyLevel: -1, subtask: true } ] };
}
export async function createIssue(fields) {
  const key = `PORT-${++db.n}`;
  const issue = { key, fields: { ...fields, status: { name: 'To Do', statusCategory: { key: 'new' } }, parent: fields.parent ? { key: fields.parent.key } : undefined } };
  db.issues.push(issue); return { key };
}
export async function createIssues(list) {
  const issues = [];
  for (const f of list) issues.push(await createIssue(f));
  return { issues, errors: [] };
}
export async function updateIssue(key, fields) { Object.assign(db.issues.find((i) => i.key === key).fields, fields); return null; }
export async function setProperty(key, name, value) { db.props[`${key}/${name}`] = value; }
export async function getProperty(key, name) { return db.props[`${key}/${name}`] || null; }
export async function addComment(key, text) { db.comments.push({ key, text }); }
export async function search(jql) {
  const m = jql.match(/parent = (\S+)/); const k = jql.match(/^key = (\S+)/);
  if (m) return db.issues.filter((i) => i.fields.parent?.key === m[1]);
  if (k) return db.issues.filter((i) => i.key === k[1]);
  if (/summary ~/.test(jql)) return db.issues.filter((i) => i.fields.labels.includes('portcall'));
  return db.issues.filter((i) => i.fields.labels.includes('portcall'));
}
