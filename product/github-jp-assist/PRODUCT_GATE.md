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

## 20-action paid core v0.1
Selection rule: every action must answer at least one question generic translation does not answer: `what changes?`, `where does it affect?`, `can I undo it?`, `what should I check first?`.

### GitHub — 7
1. Merge pull request — 「この変更を対象branchへ取り込む」。影響先branch、CI未完了、競合、Production連動の有無を注意表示。
2. Squash and merge — 「複数commitを1つにまとめて取り込む」。履歴が圧縮されることを明示。
3. Rebase and merge — 「commit履歴を並べ直して取り込む」。履歴書換え系の意味を注意表示。
4. Close pull request — 「取り込まずPRを閉じる」。コード削除ではないことを明示。
5. Delete branch — 「branch参照を削除する」。main削除との違い、復元可否の目安を表示。
6. Re-run jobs / Re-run failed jobs — 「CIをもう一度実行する」。課金/minutes消費と、コード修正なし再実行の意味を表示。
7. Create / edit repository secret or variable — 「実行環境へ値を渡す」。Secretを画面やGitへ直書きしない警告を表示。

### Cloudflare — 7
8. Deploy / Deployments — 「Worker/Pagesの実行版を更新する」。PreviewかProductionかを最優先表示。
9. Rollback deployment — 「以前の実行版へ戻す」。コード履歴と稼働版が別であることを表示。
10. Delete Worker / Project — 「公開実行物を削除する」。URL停止・復旧手段確認を警告。
11. Add / edit custom domain — 「独自ドメインを公開先へ接続する」。DNS/既存サイト影響を警告。
12. DNS record create/edit/delete — 「名前解決先を変える」。対象host、record type、TTL、既存サービス停止リスクを表示。
13. Environment variable / secret binding — 「Workerへ設定値を渡す」。Plain textとSecretの違いを表示。
14. Route / trigger / cron binding — 「いつ・どのURLでWorkerが動くかを変える」。自動実行や本番trafficへの影響を表示。

### Supabase — 6
15. Enable RLS — 「テーブルへのアクセス制御を有効化する」。policy未設定で読めなくなる可能性を表示。
16. Disable RLS — 「アクセス制御を外す」。公開データ漏えいリスクを強警告。
17. Create / edit policy — 「誰がSELECT/INSERT/UPDATE/DELETEできるかを決める」。対象roleとoperationを表示。
18. Delete row(s) — 「DB実データを削除する」。UI削除とデータ削除を区別し、backup/復元可否確認を表示。
19. SQL Editor run — 「SQLをDBへ実行する」。SELECTか書込系かを判別し、DDL/DMLは強警告。
20. Database function / RPC / trigger change — 「裏側の自動処理を変える」。呼出元・副作用・Production影響の確認を表示。

## Reject list — free translationで足りるもの
- Settings / Overview / Activity / Insights などの閲覧ラベル
- Repository / Project / Table / Storage などの単純名詞
- Save / Cancel / Back / Next など結果が自明な一般操作
- 固定ナビゲーションの逐語訳だけで価値が終わる項目

## Acceptance for the 20-action core
- 20/20で英語原文 + 平易な日本語 + 影響 + 事前確認を表示できる。
- 破壊的/本番影響操作には危険度表示がある。
- 3サービスで用語が矛盾しない。
- generic translationだけとの差を5秒で説明できる。
- 10分以内にインストール → 1操作の補助表示まで到達できる。

## Next gate
Build a static dictionary/schema for these 20 actions only. Do not add UI breadth yet. Then test whether one GitHub action, one Cloudflare action, and one Supabase action can be recognized reliably from live DOM without external API or Actions.
