// Injected demo overlay. Reads the date-picker label and reports the query
// parameters the page actually sends, so a recording shows the request rather
// than only the UI. Change ENDPOINT_MATCH to the request you care about.
//
// Install with:  agent-browser eval "$(cat scripts/overlay.js)"
// Re-inject after every page load — a reload wipes it.
(() => {
  const ENDPOINT_MATCH = '/energy-cost';
  const PARAMS = ['start_date', 'end_date'];
  const LABEL_SELECTOR = '#date';

  if (window.__demoOverlay) return 'already installed';

  const box = document.createElement('div');
  box.id = '__demoOverlay';
  // Keep it clear of the control being demonstrated. Park it in dead space and
  // check a screenshot before recording — covering the control wastes a take.
  box.style.cssText =
    'position:fixed;top:560px;left:300px;z-index:99999;background:#0f172aee;color:#e2e8f0;' +
    'font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;padding:12px 14px;' +
    'border-radius:8px;box-shadow:0 8px 24px #0006;min-width:430px;pointer-events:none';
  document.body.appendChild(box);

  const state = { label: '-', params: {}, note: '' };

  const ordinal = (n) => {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return n + 'th';
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  };

  const paint = () => {
    const rows = PARAMS.map(
      (k) => '<div>' + k + ' <b style="color:#7dd3fc">' + (state.params[k] || '-') + '</b></div>',
    ).join('');
    box.innerHTML =
      '<div style="font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px">' +
      'overlay added for this recording</div>' +
      '<div>control&nbsp;&nbsp;<b style="color:#fff">' + state.label + '</b></div>' +
      '<div style="margin-top:6px;color:#94a3b8">request to ' + ENDPOINT_MATCH + '</div>' +
      rows +
      (state.note ? '<div style="color:#fbbf24;margin-top:4px">' + state.note + '</div>' : '');
  };

  // Optional: say out loud what is wrong with the value, so a viewer does not
  // have to know how many days a month has. Delete for a non-date demo.
  const annotate = (end) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return '';
    const [y, m, d] = end.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return d === last
      ? '(last day of month)'
      : '(month ends on the ' + ordinal(last) + ' — ' + (last - d) + ' days missing)';
  };

  const readLabel = () => {
    const el = document.querySelector(LABEL_SELECTOR);
    const txt = el ? el.textContent.trim() : '-';
    if (txt !== state.label) { state.label = txt; paint(); }
  };

  const origFetch = window.fetch;
  window.fetch = function (input) {
    try {
      const u = typeof input === 'string' ? input : (input && input.url) || '';
      if (u.includes(ENDPOINT_MATCH)) {
        const q = new URL(u, location.origin).searchParams;
        PARAMS.forEach((k) => { state.params[k] = q.get(k) || '-'; });
        state.note = annotate(state.params.end_date);
        paint();
      }
    } catch { /* overlay only, never break the page */ }
    return origFetch.apply(this, arguments);
  };

  // Seed from the URL so the panel is populated before the first interaction,
  // instead of showing dashes until a request fires.
  const q = new URLSearchParams(location.search);
  PARAMS.forEach((k) => {
    const v = q.get(k === 'start_date' ? 'from' : k === 'end_date' ? 'to' : k);
    if (v) state.params[k] = v;
  });
  state.note = annotate(state.params.end_date);

  // Onboarding coach-marks mount lazily and will land on top of the recording.
  setInterval(() => {
    [...document.querySelectorAll('button')]
      .filter((b) => /^Got it$/i.test(b.textContent.trim()))
      .forEach((b) => b.click());
  }, 400);
  setInterval(readLabel, 200);
  readLabel();
  paint();

  window.__demoOverlay = true;
  return 'overlay installed';
})()
