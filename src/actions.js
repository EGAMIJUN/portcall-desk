import { createPortCall, updateEta, getStatus, listPortCalls } from './portcall';

// Rovo actions return a string or JSON. Errors are returned as data so the agent
// can explain the problem to the user instead of failing silently.
const safe = (fn) => async (payload) => {
  try {
    return await fn(payload || {});
  } catch (e) {
    return { error: String(e.message || e) };
  }
};

export const createPortCallAction = safe(createPortCall);
export const updateEtaAction = safe(updateEta);
export const statusAction = safe(getStatus);
export const listAction = safe(async () => ({ portCalls: await listPortCalls() }));
