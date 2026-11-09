import Resolver from '@forge/resolver';
import { createPortCall, updateEta, getStatus, listPortCalls, listProjectChoices } from './portcall';

const resolver = new Resolver();

const safe = (fn) => async ({ payload }) => {
  try {
    return { ok: true, data: await fn(payload || {}) };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
};

resolver.define('list', safe(() => listPortCalls()));
resolver.define('projects', safe(() => listProjectChoices()));
resolver.define('create', safe(createPortCall));
resolver.define('status', safe(getStatus));
resolver.define('updateEta', safe(updateEta));

export const handler = resolver.getDefinitions();
