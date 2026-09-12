# Dev UI Guard JP v0.1｜販売ページ原稿

## 商品名
Dev UI Guard JP v0.1

## 価格仮説
¥1,480 買い切り

## 一言でいうと
GitHub・Cloudflare・Supabaseの危険な操作だけを、**「押すと何が起きるか / どこに影響するか / 戻せるか / 何を確認するか」まで日本語でその場確認できるChrome拡張**です。

## 無料翻訳との違い
英語UI全体を日本語化する商品ではありません。

Merge / Deploy / Delete / DNS / RLS / SQL実行など、事故につながりやすい重要操作だけに `JA?` を表示し、直訳では分からない「操作の意味」「影響」「戻せるか」「押す前確認」をまとめて表示します。

## こんな人向け
- GitHubやCloudflareを仕事で触るが、英語UIに毎回ひっかかる
- AIに言われた操作を自分で実行するとき、意味を確認してから押したい
- SupabaseのRLS / Policy / SQL操作で事故を避けたい
- 開発担当ではないが、Web運用や納品で管理画面を触る必要がある

## v0.1対応範囲
### GitHub 7操作
Merge pull request / Squash and merge / Rebase and merge / Close pull request / Delete branch / Actions再実行 / Secret・Variable作成更新

### Cloudflare 7操作
Deploy / Rollback / Worker・Project削除 / Custom Domain / DNS Record / Variable・Secret / Route・Trigger

### Supabase 6操作
Enable RLS / Disable RLS / Policy / Row削除 / SQL Run / Function・Trigger

## 使い方
1. 購入ZIPを展開
2. Chromeで `chrome://extensions/` を開く
3. デベロッパーモードをON
4. 「パッケージ化されていない拡張機能を読み込む」から `extension` フォルダを選択
5. GitHub / Cloudflare / Supabase を再読み込み
6. 対応操作横の `JA?` を押す

初回成功の目印は、`意味 / 影響 / 戻せる？ / 押す前確認` が表示されることです。

## 安全設計
- 元のボタンを自動クリックしません
- ページ内容・入力値・Secretを外部送信しません
- コア機能に外部APIを使いません
- GitHub Actions / Runner / 定期処理を使いません

## Known Issues v0.1
- SaaS側のUI文言変更で `JA?` が表示されなくなる場合があります
- 日本語化済みUIなど英語ラベルが存在しない状態は未対応です
- iframe / Shadow DOM 内の操作は未対応です
- Supabase SQL分類は簡易判定で、関数呼び出し等の副作用を完全には判定できません
- Windows/macOS版Chromeを主対象とし、Edge等は未検証です

## 販売開始条件
この原稿・ZIP・導入手順が揃っていても、実ブラウザで GitHub / Cloudflare / Supabase の主要操作3/3が通るまでは販売開始しません。

## 返金・サポート文面候補
v0.1対象操作で `JA?` が一度も表示されない場合は、Chromeバージョン・対象サービス・対象操作を確認して修正版で対応します。SaaS側UI変更による未対応はKnown Issuesとして扱います。
