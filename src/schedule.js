// Husbanding task template and date helpers (pure functions, no Forge imports).
// Offsets are hours relative to the vessel's ETA or ETD. They are sensible defaults
// for a Japanese port call and are meant to be edited per port / per agency.

export const TZ = 'Asia/Tokyo';

export const TEMPLATE = [
  // Pre-arrival
  { id: 'entry-notice', phase: 'Pre-arrival', anchor: 'ETA', hours: -24, ja: '入港届の提出', en: 'Submit port entry notification',
    note: 'Notify the port authority (入港届). Confirm form and deadline with the port authority.' },
  { id: 'customs-pre', phase: 'Pre-arrival', anchor: 'ETA', hours: -24, ja: '税関への入港前手続 (NACCS)', en: 'Customs pre-arrival filing via NACCS',
    note: 'File the arrival-related customs notices through NACCS.' },
  { id: 'quarantine', phase: 'Pre-arrival', anchor: 'ETA', hours: -24, ja: '検疫の事前通報', en: 'Quarantine pre-notification',
    note: 'Maritime declaration of health and quarantine notice to the quarantine station.' },
  { id: 'immigration', phase: 'Pre-arrival', anchor: 'ETA', hours: -24, ja: '入管へ乗員名簿・上陸許可の準備', en: 'Immigration: crew list and shore-leave applications',
    note: 'Prepare the crew list and any landing / shore-leave applications.' },
  { id: 'berth', phase: 'Pre-arrival', anchor: 'ETA', hours: -36, ja: '着岸バース・時刻の確定', en: 'Confirm berth and berthing time',
    note: 'Confirm berth, berthing time and cargo plan with the terminal.' },
  { id: 'pilot-in', phase: 'Pre-arrival', anchor: 'ETA', hours: -12, ja: '水先人の手配(入港)', en: 'Book pilot (inbound)',
    note: 'Book the pilot for arrival; share ETA with the pilot station.' },
  { id: 'tug-in', phase: 'Pre-arrival', anchor: 'ETA', hours: -12, ja: '引船の手配(入港)', en: 'Book tugs (inbound)',
    note: 'Book tugs for berthing.' },
  { id: 'line-in', phase: 'Pre-arrival', anchor: 'ETA', hours: -6, ja: '綱取りの手配', en: 'Arrange line handlers',
    note: 'Arrange line handlers (mooring crew) at the berth.' },
  // In port
  { id: 'officials', phase: 'In port', anchor: 'ETA', hours: 2, ja: '検疫・入管・税関の臨船対応', en: 'Receive quarantine, immigration and customs officers',
    note: 'Meet and guide the officers on board; hand over documents.' },
  { id: 'cargo-liaison', phase: 'In port', anchor: 'ETA', hours: 2, ja: '荷役開始の調整', en: 'Coordinate start of cargo operations',
    note: 'Coordinate with the terminal and stevedores; confirm working hours.' },
  { id: 'bunker', phase: 'In port', anchor: 'ETA', hours: 6, ja: '燃料(バンカー)の手配', en: 'Arrange bunkering',
    note: 'Confirm quantity, supplier and timing with the master / chief engineer.' },
  { id: 'provisions', phase: 'In port', anchor: 'ETA', hours: 6, ja: '食料・清水・船用品の手配', en: 'Arrange provisions, fresh water and ship stores',
    note: 'Collect the requisition and arrange delivery alongside.' },
  { id: 'crew-change', phase: 'In port', anchor: 'ETA', hours: 12, ja: '船員交代・病院等の手配', en: 'Crew change and medical arrangements',
    note: 'Transport, hotel and travel for sign-on / sign-off; hospital if needed.' },
  { id: 'waste', phase: 'In port', anchor: 'ETA', hours: 12, ja: '廃棄物・スロップ処理の手配', en: 'Arrange garbage and slop disposal',
    note: 'Arrange licensed contractors for disposal.' },
  // Departure
  { id: 'docs-out', phase: 'Departure', anchor: 'ETD', hours: -12, ja: '出港書類・立替費用の確認', en: 'Prepare departure documents and check disbursements',
    note: 'Collect invoices and confirm costs with the principal.' },
  { id: 'clear-out', phase: 'Departure', anchor: 'ETD', hours: -6, ja: '税関・入管の出港手続', en: 'Customs and immigration departure clearance',
    note: 'Complete departure clearance with customs and immigration.' },
  { id: 'pilot-out', phase: 'Departure', anchor: 'ETD', hours: -4, ja: '水先人の手配(出港)', en: 'Book pilot (outbound)',
    note: 'Book the pilot for departure.' },
  { id: 'tug-out', phase: 'Departure', anchor: 'ETD', hours: -4, ja: '引船の手配(出港)', en: 'Book tugs (outbound)',
    note: 'Book tugs for unberthing.' },
  { id: 'dep-notice', phase: 'Departure', anchor: 'ETD', hours: -2, ja: '出港届の提出', en: 'Submit departure notification',
    note: 'Notify the port authority of departure.' },
  // Post departure
  { id: 'sof-da', phase: 'Post-departure', anchor: 'ETD', hours: 24, ja: 'SOF・最終精算(DA)の作成', en: 'Finalize statement of facts and disbursement account',
    note: 'Send SOF and the final disbursement account to the principal.' },
];

export const DEFAULT_STAY_HOURS = 48;
const HOUR = 3600 * 1000;

/** Parse "2026-11-12T09:00" / "2026-11-12 09:00" (taken as JST) or any ISO string with Z / offset. */
export function parseWhen(input) {
  if (input === undefined || input === null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/);
  const d = new Date(m ? `${m[1]}T${m[2]}${m[3] || ':00'}+09:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function defaultEtd(eta) {
  return new Date(eta.getTime() + DEFAULT_STAY_HOURS * HOUR);
}

export function dueFor(item, eta, etd) {
  const base = item.anchor === 'ETD' ? etd : eta;
  return new Date(base.getTime() + item.hours * HOUR);
}

function parts(date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return o;
}

export const fmtDate = (date) => { const p = parts(date); return `${p.year}-${p.month}-${p.day}`; };
export const fmtDateTime = (date) => { const p = parts(date); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; };

export const epicSummary = (vessel, eta) => `Port Call: ${vessel} (ETA ${fmtDateTime(eta)} JST)`;
export const taskSummary = (item) => `[${item.phase}] ${item.ja} / ${item.en}`;
export const taskLabel = (item) => `pc-${item.id}`;
export const templateByLabel = (label) => TEMPLATE.find((t) => taskLabel(t) === label);

export function parseEpicSummary(summary) {
  const m = String(summary || '').match(/^Port Call: (.*) \(ETA (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) JST\)$/);
  return m ? { vessel: m[1], eta: m[2] } : null;
}
