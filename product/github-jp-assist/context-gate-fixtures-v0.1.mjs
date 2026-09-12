import assert from 'node:assert/strict';

const rules = {
  github: /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/,
  cloudflare: /^\/[0-9a-f]{32}\/(?:workers-and-pages|pages|workers)(?:\/|$)/i,
  supabase: /^\/dashboard\/project\/[a-z0-9_-]+\/(?:editor|database)(?:\/|$)/i,
};

const cases = [
  ['github', '/7thleaf-gd/the-pan-browser-tools/pull/12', true],
  ['github', '/7thleaf-gd/the-pan-browser-tools/pull/12/files', true],
  ['github', '/7thleaf-gd/the-pan-browser-tools/issues/12', false],
  ['github', '/settings/profile', false],
  ['cloudflare', '/0123456789abcdef0123456789abcdef/workers-and-pages', true],
  ['cloudflare', '/0123456789abcdef0123456789abcdef/workers/services/view/demo/production', true],
  ['cloudflare', '/0123456789abcdef0123456789abcdef/pages/view/demo', true],
  ['cloudflare', '/0123456789abcdef0123456789abcdef/home', false],
  ['supabase', '/dashboard/project/abc123/editor/100', true],
  ['supabase', '/dashboard/project/abc123/database/tables', true],
  ['supabase', '/dashboard/project/abc123/auth/users', false],
  ['supabase', '/dashboard/projects', false],
];

let passed = 0;
for (const [service, path, expected] of cases) {
  const actual = rules[service].test(path);
  assert.equal(actual, expected, `${service} ${path}: expected ${expected}, got ${actual}`);
  passed += 1;
}

console.log(JSON.stringify({ suite: 'context-gate-fixtures-v0.1', passed, total: cases.length, failed: 0 }));
