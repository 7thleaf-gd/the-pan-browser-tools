(() => {
  'use strict';

  const host = location.hostname;
  const service = host.endsWith('github.com') ? 'github'
    : host.endsWith('dash.cloudflare.com') ? 'cloudflare'
    : host.endsWith('supabase.com') ? 'supabase'
    : null;

  const targetByService = {
    github: { id: 'github.merge_pr', label: 'Merge pull request' },
    cloudflare: { id: 'cloudflare.deploy', label: 'Deploy' },
    supabase: { id: 'supabase.enable_rls', label: 'Enable RLS' }
  };

  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const isUsable = (node) => {
    if (!node) return false;
    if (node.disabled === true) return false;
    if (node.getAttribute?.('aria-disabled') === 'true') return false;
    if (node.hidden === true) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  };

  const readLabel = (node) => node.innerText || node.textContent || node.value || node.getAttribute?.('aria-label') || '';

  const result = {
    probe: 'github-jp-assist-live-dom-v0.1',
    timestamp: new Date().toISOString(),
    host,
    service,
    readOnly: true,
    clicked: false,
    matched: false,
    targetId: service ? targetByService[service].id : null,
    targetLabel: service ? targetByService[service].label : null,
    matches: []
  };

  if (!service) {
    result.reason = 'unsupported-host';
    console.table(result);
    console.log('[GitHub JP Assist probe]', result);
    return result;
  }

  const expected = normalize(targetByService[service].label);
  const nodes = [...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')];

  for (const node of nodes) {
    if (!isUsable(node)) continue;
    const text = readLabel(node).trim();
    const normalized = normalize(text);
    if (normalized !== expected) continue;
    result.matches.push({
      text,
      tag: node.tagName,
      role: node.getAttribute?.('role') || null,
      ariaLabel: node.getAttribute?.('aria-label') || null,
      disabled: !!node.disabled,
      ariaDisabled: node.getAttribute?.('aria-disabled') || null
    });
  }

  result.matched = result.matches.length > 0;
  result.matchCount = result.matches.length;
  result.reason = result.matched ? 'target-detected' : 'target-not-found';

  console.table(result.matches);
  console.log('[GitHub JP Assist probe]', result);
  return result;
})();
