# 触れる経済 / keizai-lab

日本の経済データを「触って理解する」インタラクティブなコンテンツ。

- 公開ページ: [米の値段、描いてみて](https://tsundoq.github.io/keizai-lab/okome-drawit.html)
- 本体: `okome-drawit.html` （単体HTML / CSS / JavaScript）
- AI作業ルール: [AGENTS.md](AGENTS.md)
- 品質基準: [docs/QUALITY_CHECKLIST.md](docs/QUALITY_CHECKLIST.md)

## ブラウザで確認する

GitHub Pagesの公開ページを開くか、リポジトリをPCに取得してローカルサーバーで表示します。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/okome-drawit.html` を開きます。

> フォントを含む相対パスやブラウザの制限があるため、`file://` ではなくローカルサーバー経由で確認することを推奨します。

## Playwrightで自動検証する

Node.js 22以降を用意して、リポジトリのルートで一度だけ実行します。

```bash
npm install --no-save --no-package-lock playwright@1.58.2
npx playwright install chromium
```

別のターミナルでローカルサーバーを起動し、テストします。

```bash
python3 -m http.server 8000
```

```bash
node tests/browser-smoke.mjs
```

テストはモバイル相当（390×844）とPC（1280×900）の表示を確認し、「予想線を描く → 答え合わせ → リセット」とブラウザエラー・横はみ出しを検査します。生成される画像は `artifacts/` に保存されます。

**注意:** 現在のモバイルテストはモバイル幅の画面をマウス操作で試験しており、実機タッチ操作の再現ではありません。見た目の良し悪しや参考画像との一致度を自動判定するものでもありません。

## GitHubで自動検証する

`main` へのPushやPull Requestで、[GitHub Actions](https://github.com/Tsundoq/keizai-lab/actions) の `Visual and Interaction Smoke Test` が実行されます。

1. GitHub → **Actions** を開く
2. `Visual and Interaction Smoke Test` の実行結果を選択する
3. `browser-smoke` のログでテスト成功・失敗を確認する
4. 実行画面の **Artifacts** にある `browser-screenshots` を取得し、初期・結果表示を確認する

自動テストが通っても完成とは限りません。最終的なデザイン品質は、参考画像・実物のスクリーンショットと見比べて判断してください。

## AIで改修する際の順序

1. `AGENTS.md` と既存コードを読む
2. 変更範囲・維持する部分・完成基準を決める
3. 対象だけを修正する
4. Playwrightを実行しスクリーンショットを確認する
5. 失敗時は原因を修正し、再テストする
6. 検証済み項目と未検証項目を区別して報告する

既存画面やデータを、明示的な依頼なく全面変更しないでください。
