(function (root) {
  'use strict';

  const ACTIONS = [
    { id: 'github.merge_pr', service: 'github', labels: ['Merge pull request'] },
    { id: 'cloudflare.deploy', service: 'cloudflare', labels: ['Deploy', 'Deployments'] },
    { id: 'supabase.enable_rls', service: 'supabase', labels: ['Enable RLS'] }
  ];

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function scoreLabel(text, label) {
    const a = normalizeText(text);
    const b = normalizeText(label);
    if (!a || !b) return 0;
    if (a === b) return 100;
    if (a.includes(b)) return 80;
    if (b.includes(a) && a.length >= 4) return 60;
    return 0;
  }

  function classifyText(service, text) {
    const candidates = ACTIONS.filter((a) => a.service === service);
    let best = null;
    for (const action of candidates) {
      for (const label of action.labels) {
        const score = scoreLabel(text, label);
        if (!best || score > best.score) best = { id: action.id, service, label, score };
      }
    }
    return best && best.score >= 80 ? best : null;
  }

  function findActionableNodes(service, doc) {
    if (!doc || !doc.querySelectorAll) return [];
    const selectors = [
      'button',
      'a',
      '[role="button"]',
      'input[type="button"]',
      'input[type="submit"]'
    ];
    const nodes = Array.from(doc.querySelectorAll(selectors.join(',')));
    const hits = [];
    for (const node of nodes) {
      const text = node.innerText || node.textContent || node.value || node.getAttribute?.('aria-label') || '';
      const match = classifyText(service, text);
      if (match) hits.push({ node, text: String(text).trim(), match });
    }
    return hits;
  }

  const api = { normalizeText, scoreLabel, classifyText, findActionableNodes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GithubJpAssistDomRecognition = api;

  if (typeof module !== 'undefined' && require.main === module) {
    const cases = [
      ['github', 'Merge pull request', 'github.merge_pr'],
      ['cloudflare', 'Deploy', 'cloudflare.deploy'],
      ['supabase', 'Enable RLS', 'supabase.enable_rls'],
      ['github', 'Close pull request', null],
      ['cloudflare', 'Delete project', null],
      ['supabase', 'Disable RLS', null]
    ];
    let failed = 0;
    for (const [service, text, expected] of cases) {
      const got = classifyText(service, text)?.id || null;
      const ok = got === expected;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${service} :: ${text} => ${got}`);
      if (!ok) failed += 1;
    }
    process.exitCode = failed ? 1 : 0;
  }
})(typeof window !== 'undefined' ? window : globalThis);
