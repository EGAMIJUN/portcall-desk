import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box, Button, DynamicTable, Heading, Inline, Label, Lozenge, ProgressBar,
  SectionMessage, Spinner, Stack, Text, Textfield,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const head = {
  cells: [
    { key: 'vessel', content: 'Vessel' },
    { key: 'eta', content: 'ETA (JST)' },
    { key: 'progress', content: 'Progress' },
    { key: 'overdue', content: 'Overdue' },
    { key: 'soon', content: 'Due in 24h' },
  ],
};

const App = () => {
  const [calls, setCalls] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ vesselName: '', eta: '', etd: '', berth: '', projectKey: '' });

  const refresh = async () => {
    const res = await invoke('list');
    if (res.ok) { setCalls(res.data); setError(null); } else { setCalls([]); setError(res.error); }
  };

  useEffect(() => { refresh(); }, []);

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const create = async () => {
    setBusy(true);
    setResult(null);
    const res = await invoke('create', form);
    setBusy(false);
    if (res.ok) {
      setResult({ ok: true, text: `Created ${res.data.portCall} for ${res.data.vessel}: ${res.data.tasksCreated} tasks${res.data.tasksFailed ? `, ${res.data.tasksFailed} failed` : ''}.` });
      setForm({ vesselName: '', eta: '', etd: '', berth: '', projectKey: '' });
      refresh();
    } else {
      setResult({ ok: false, text: res.error });
    }
  };

  const rows = (calls || []).map((c) => ({
    key: c.portCall,
    cells: [
      { key: 'vessel', content: `${c.vessel} (${c.portCall})` },
      { key: 'eta', content: c.eta || '-' },
      { key: 'progress', content: (
        <Stack space="space.050">
          <ProgressBar value={c.total ? c.done / c.total : 0} />
          <Text>{`${c.done} / ${c.total} tasks done`}</Text>
        </Stack>
      ) },
      { key: 'overdue', content: <Lozenge appearance={c.overdue.length ? 'removed' : 'success'}>{String(c.overdue.length)}</Lozenge> },
      { key: 'soon', content: <Lozenge appearance={c.dueSoon.length ? 'inprogress' : 'default'}>{String(c.dueSoon.length)}</Lozenge> },
    ],
  }));

  return (
    <Stack space="space.200">
      <Text>Husbanding checklists for vessel calls, built from the agent's standard task template. Ask the Husbanding Coordinator in Rovo to create or update port calls in plain language.</Text>

      {error && <SectionMessage appearance="error" title="Could not load port calls"><Text>{error}</Text></SectionMessage>}
      {calls === null ? <Spinner /> : (
        <DynamicTable head={head} rows={rows} emptyView="No port calls yet. Create one below or ask the Husbanding Coordinator." />
      )}

      <Heading size="medium">New port call</Heading>
      <Box>
        <Stack space="space.100">
          <Label labelFor="vessel">Vessel name</Label>
          <Textfield id="vessel" value={form.vesselName} onChange={set('vesselName')} placeholder="MV EXAMPLE" />
          <Inline space="space.200">
            <Stack space="space.050">
              <Label labelFor="eta">ETA (Japan time)</Label>
              <Textfield id="eta" value={form.eta} onChange={set('eta')} placeholder="2026-12-01 09:00" />
            </Stack>
            <Stack space="space.050">
              <Label labelFor="etd">ETD (optional, default ETA + 48h)</Label>
              <Textfield id="etd" value={form.etd} onChange={set('etd')} placeholder="2026-12-03 09:00" />
            </Stack>
          </Inline>
          <Inline space="space.200">
            <Stack space="space.050">
              <Label labelFor="berth">Berth / terminal</Label>
              <Textfield id="berth" value={form.berth} onChange={set('berth')} />
            </Stack>
            <Stack space="space.050">
              <Label labelFor="proj">Jira project key (optional)</Label>
              <Textfield id="proj" value={form.projectKey} onChange={set('projectKey')} />
            </Stack>
          </Inline>
          <Inline>
            <Button appearance="primary" isDisabled={busy || !form.vesselName || !form.eta} onClick={create}>
              {busy ? 'Creating...' : 'Create port call'}
            </Button>
          </Inline>
          {busy && <Spinner />}
          {result && (
            <SectionMessage appearance={result.ok ? 'success' : 'error'} title={result.ok ? 'Done' : 'Could not create'}>
              <Text>{result.text}</Text>
            </SectionMessage>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
