# CURRENT — THE PAN Browser Tools

Updated: 2026-09-29
STATUS: FIX / PRODUCTION PASS
AUTHORITY: 7thleaf-gd/the-pan-browser-tools
PRODUCTION_HOSTNAME: tools.thepan.xyz
PROVIDER: GitHub Pages
DEPLOY_AUTHORITY: CircleCI
EXECUTOR_TYPE: ChatGPT
EXECUTOR_TRACE_ID: CHAPPY-0002-GD-BROWSER-TOOLS-20260929-001
GITHUB_ACTOR: 7thleaf-gd
AUTHORITY_CHANGE: NO

## Canonical deploy path

```text
GitHub main
  -> CircleCI
  -> npm run build
  -> scripts/deploy-pages.sh
  -> gh-pages
  -> tools.thepan.xyz
```

## Fixed rules

- CircleCI is the only production deploy executor.
- GitHub Actions is not a deploy path.
- Cloudflare is not the production authority for this repository.
- Production source branch is `main`.
- Published branch is `gh-pages`.
- `CNAME` must be `tools.thepan.xyz`.
- No alternate deploy lane may be added beside this path.

## Publish boundary

Published:
- root public HTML/CSS/JS
- `about/`
- `assets/`
- `image-machine/`
- `object-wrong/`
- `panda-dub/`
- `tape/`
- `tools/`
- `visualizer/`
- static verification/SEO files required by the public site

Not published:
- `.git`
- `.github`
- `.circleci`
- `node_modules`
- `README.md`
- `RESPONSIBILITY.md`
- `CURRENT.md`
- `docs/`
- `scripts/`
- `package.json`

## Evidence before this cleanup

- main SHA: `6fba3c088b64cb1352d9bd7e2e5c450eda8aa0d2`
- CircleCI `deploy-pages`: PASS
- gh-pages head: `fcc12d09ac26362fdcddb915fc19ec01a4c00677`
- gh-pages commit message references exact main SHA
- gh-pages `CNAME`: `tools.thepan.xyz`
- gh-pages `index.html` content matches main

## Acceptance

- branch/static validation: PASS
- main deploy-pages: PASS
- gh-pages head references final main SHA: PASS
- CNAME correct: PASS
- operations/docs excluded from gh-pages: PASS

MAIN_SHA: `90ae2370a618ac6e2becfdaba91466234aeee8e2`
GH_PAGES_SHA: `2c2c9c2e4b13bef0e542b03ee1f33d5964a7294e`
CIRCLECI_VERIFY_RUN: `12`
CIRCLECI_DEPLOY_RUN: `13`
READBACK: THE_PAN_BROWSER_TOOLS_PRODUCTION_PASS
