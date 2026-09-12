# Dev UI Guard JP v0.1

GitHub / Cloudflare / Supabase の重要操作に `JA?` バッジを表示し、クリック前に「何が起きるか」「何を確認するか」を日本語で確認できる Chrome 拡張です。

## 1行で払う理由

英語UIを丸ごと翻訳するのではなく、**事故につながる20操作だけを、その場で意味・影響・事前確認まで日本語で読める**ようにします。

## インストール（目安 3分）

1. この `extension` フォルダをPCへ保存する。
2. Chromeで `chrome://extensions/` を開く。
3. 右上の「デベロッパー モード」をON。
4. 「パッケージ化されていない拡張機能を読み込む」を押す。
5. この `extension` フォルダを選ぶ。
6. GitHub / Cloudflare / Supabase の対象画面を再読み込みする。
7. 対応操作の横に出る `JA?` を押す。

## 対応範囲

- GitHub: merge / close / branch delete / Actions rerun / secrets & variables など 7操作
- Cloudflare: deploy / rollback / Worker削除 / custom domain / DNS / secrets / route & trigger など 7操作
- Supabase: RLS / policy / row削除 / SQL run / functions & triggers など 6操作

## プライバシー

- 外部APIへ送信しません。
- ページ内容・入力値・Secretを収集しません。
- 元の操作ボタンを自動クリックしません。
- GitHub Actions / Runner / 定期処理を使いません。

## Known Issues v0.1

- SaaS側のUI文言変更で `JA?` が出なくなる場合があります。
- 日本語化済みUIなど、英語ラベルが存在しない状態は未対応です。
- iframe / Shadow DOM 内の操作は未対応です。
- Supabase SQLのSQL本文そのものの危険度解析はまだ行いません。
- v0.1はWindows/macOS Chromeを主対象とし、Edge等は未検証です。

## 完了Gate

販売可能扱いにするには、実ブラウザで主要操作が通ること、初回導入10分以内、無料競合との差が説明できること、Known Issuesを購入前に開示できることが必要です。
