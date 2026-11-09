import api, { route } from '@forge/api';

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

async function parse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira ${res.status}: ${text.slice(0, 400)}`);
  }
  // Some Jira endpoints (e.g. issue properties) answer 200/201/204 with an empty body.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Atlassian Document Format: one paragraph per non-empty line. */
export function adf(text) {
  const lines = String(text).split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) lines.push('-');
  return {
    type: 'doc',
    version: 1,
    content: lines.map((l) => ({ type: 'paragraph', content: [{ type: 'text', text: l }] })),
  };
}

export async function listProjects() {
  const data = await parse(await api.asUser().requestJira(route`/rest/api/3/project/search?maxResults=50&orderBy=name`));
  return data.values || [];
}

export async function getProject(key) {
  return parse(await api.asUser().requestJira(route`/rest/api/3/project/${key}`));
}

export async function createIssue(fields) {
  return parse(await api.asUser().requestJira(route`/rest/api/3/issue`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ fields }),
  }));
}

/** Create up to 50 issues in one call. Returns { issues: [{key}], errors: [...] }. */
export async function createIssues(fieldsList) {
  return parse(await api.asUser().requestJira(route`/rest/api/3/issue/bulk`, {
    method: 'POST', headers: JSON_HEADERS,
    body: JSON.stringify({ issueUpdates: fieldsList.map((fields) => ({ fields })) }),
  }));
}

export async function updateIssue(key, fields) {
  return parse(await api.asUser().requestJira(route`/rest/api/3/issue/${key}`, {
    method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ fields }),
  }));
}

export async function setProperty(key, name, value) {
  return parse(await api.asUser().requestJira(route`/rest/api/3/issue/${key}/properties/${name}`, {
    method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(value),
  }));
}

export async function getProperty(key, name) {
  const res = await api.asUser().requestJira(route`/rest/api/3/issue/${key}/properties/${name}`, { headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  return (await parse(res)).value;
}

export async function search(jql, fields, maxResults = 100) {
  const data = await parse(await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ jql, fields, maxResults }),
  }));
  return data.issues || [];
}

export async function addComment(key, text) {
  return parse(await api.asUser().requestJira(route`/rest/api/3/issue/${key}/comment`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ body: adf(text) }),
  }));
}
