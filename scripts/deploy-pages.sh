#!/usr/bin/env bash
set -euo pipefail

: "${CIRCLE_SHA1:?CIRCLE_SHA1 is required}"
: "${CIRCLE_BRANCH:?CIRCLE_BRANCH is required}"
[[ "$CIRCLE_BRANCH" == "main" ]] || { echo "Refusing Pages deploy from non-main branch: $CIRCLE_BRANCH" >&2; exit 2; }

PUBLISH_DIR="/tmp/the-pan-browser-tools-pages"
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"

tar \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./.circleci' \
  --exclude='./node_modules' \
  --exclude='./README.md' \
  --exclude='./RESPONSIBILITY.md' \
  --exclude='./CURRENT.md' \
  --exclude='./docs' \
  --exclude='./scripts' \
  --exclude='./package.json' \
  -cf - . | tar -C "$PUBLISH_DIR" -xf -

printf '%s\n' 'tools.thepan.xyz' > "$PUBLISH_DIR/CNAME"
touch "$PUBLISH_DIR/.nojekyll"

test -f "$PUBLISH_DIR/index.html"
test -f "$PUBLISH_DIR/app.js"
test -d "$PUBLISH_DIR/assets"
test ! -e "$PUBLISH_DIR/README.md"
test ! -e "$PUBLISH_DIR/CURRENT.md"
test ! -e "$PUBLISH_DIR/docs"
test ! -e "$PUBLISH_DIR/scripts"
test ! -e "$PUBLISH_DIR/package.json"

cd "$PUBLISH_DIR"
git init -q
git checkout -q -b gh-pages
git config user.name "circleci-pages"
git config user.email "circleci-pages@users.noreply.github.com"
git add -A
git commit -q -m "deploy: THE PAN tools pages $CIRCLE_SHA1"
git remote add origin git@github.com:7thleaf-gd/the-pan-browser-tools.git
git push --force origin gh-pages

echo "THE_PAN_BROWSER_TOOLS_PAGES_DEPLOY=PASS"
