# PRODUCT GATE — GitHub JP Assist v0.1

Status: HOLD / DIFFERENTIATION REQUIRED
Branch: product/github-jp-assist-v0.1
Production write: 0
GitHub Actions new run: 0

## Market evidence
- Direct competitor exists: GitHub UI Translator. It already translates fixed GitHub UI locally, avoids user-generated content, supports multiple languages, and requires no external translation API.
- General page translation is also widely available, so plain "GitHub Japanese translation" is not a paid-product thesis.

## Kill condition
Do not build or sell a GitHub-only translation extension. If the product remains translation-only, discard it.

## Surviving paid thesis
A paid product is only worth continuing if it becomes a cross-service operation-assist layer for non-engineers, beginning with GitHub + Cloudflare + Supabase.

Required difference from free translation:
1. Keep original English label visible.
2. Add plain-Japanese operation meaning, not literal translation.
3. Add consequence hints for risky actions such as merge, deploy, delete, RLS/policy changes.
4. Use one consistent glossary across GitHub / Cloudflare / Supabase.
5. Run locally with no external API for the core dictionary/help layer.
6. Installation to first useful result must be under 10 minutes.

## Price gate
Target hypothesis: JPY 1,480 one-time.
Before calling it sellable, a buyer must be able to answer in one line why this is worth paying for over free translation.

Current one-line candidate:
"英語UIを訳すだけでなく、GitHub・Cloudflare・Supabaseの『このボタンを押すと何が起きるか』を同じ日本語で教える操作補助レイヤー。"

## Next gate
Before implementation, define a 20-action paid core across the three services and reject any action that is already fully solved by generic translation.
