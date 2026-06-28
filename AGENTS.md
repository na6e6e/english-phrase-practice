# Phrase Master — Project Guidelines

ビジネス英語フレーズを単語並べ替えクイズ形式で学習する静的Webアプリ。GitHub Pages で公開。

## Architecture

```
phrase-master/
├── index.html          # ホーム画面（円グラフ進捗 + テーマ選択）
├── quiz.html           # クイズ画面（単語並べ替え）
├── css/style.css       # 全画面共通スタイル（CSS変数・モバイル対応）
├── data/
│   └── questions.json  # 問題データ（唯一の問題管理ファイル）
└── js/
    ├── storage.js      # localStorage 抽象化（進捗・フラグ管理）
    ├── tts.js          # Web Speech API ラッパー（正解時に英文読み上げ）
    ├── home.js         # ホーム画面ロジック（Chart.js 円グラフ）
    └── quiz.js         # クイズエンジン（出題・判定・フラグ）
```

**制約:** ビルドステップなし。純粋な HTML/CSS/JS のみ。外部ライブラリは Chart.js (CDN) のみ。

## Local Development

ファイルを直接ブラウザで開くと `fetch('./data/questions.json')` が失敗する。必ず簡易サーバーを使用すること。

```bash
# VS Code の Live Server 拡張 (推奨)
# または
npx serve e:/work/phrase-master
```

## questions.json Schema

問題の追加・編集はこのファイルのみ変更すれば自動反映される。

```json
{
  "id": "rm_031",               // テーマ接頭辞_連番 (rm_ or gb_)
  "japanese": "日本語の説明",
  "answer": ["Word1", "Word2"], // 1〜8語・語順厳密・大文字小文字正確に
  "distractors": ["Fake1", "Fake2", "Fake3", "Fake4", "Fake5"]
                                // answer と重複禁止・5語前後
}
```

**ルール:**
- `answer` に同一単語の重複は避ける
- `distractors` の単語を `answer` に含めない（大文字小文字を問わず）
- `id` はテーマ全体でユニーク

## URL Parameters (quiz.html)

| パラメータ | 値 | 動作 |
|---|---|---|
| `theme` | `remote_meeting` / `general` | テーマ別出題 |
| `filter` | `incomplete` | 未正解（unanswered + incorrect）のみ出題 |
| `mode` | `review` | フラグ付き問題のみ出題 |

例: `quiz.html?theme=general&filter=incomplete`

## localStorage Schema

キー: `phraseMasterProgress`

```json
{
  "rm_001": { "status": "correct|incorrect|unanswered", "flagged": false }
}
```

`status` は `incorrect` → `correct` にしか変化しない（`storage.js` の `setQuestionStatus` で制御）。

## Code Conventions

- 全 JS ファイルは `'use strict'` で始まる
- DOM 操作はすべて `DOMContentLoaded` 後に実行
- `quiz.js` のグローバル状態: `questions`, `slots`, `wordBankItems`, `quizState` (`'idle'|'wrong'|'correct'`)
- CSS 色はすべて `:root` の CSS 変数 (`--primary`, `--success`, `--danger` 等) を使用
- 新テーマ追加は `questions.json` の `themes` 配列にオブジェクトを追加するだけでホーム画面に自動表示される
