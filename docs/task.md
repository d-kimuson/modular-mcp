# Serena-Module MCP 仕様書 v0.1

> **目的**: 既存の *Modular MCP* をベースに、単一の上流 MCP（例: **serena**）の“ツール集合”を**カテゴリ単位**でオンデマンド公開・実行できる **MCP プロキシサーバ**を実装する。LLM のコンテキスト使用量を抑えつつ、頻出 MCP の巨大なツール群を小分けにして扱えるようにする。

---

## 1. スコープ / 非スコープ

### 1.1 スコープ

* MCP サーバ（プロキシ）の実装（fork リポジトリの構成を利用）
* **カテゴリ**（Category）という概念の導入

  * 1 つの上流 MCP（例: `serena`）が持つツールを **複数カテゴリ**に分割して管理
  * LLM には **カテゴリ一覧のみ**を説明に埋め込み、**必要なカテゴリのツール定義だけ**を `get-category-tools` でロード
* **最小限の MCP ツール公開**

  * `get-category-tools`（カテゴリに属するツールのスキーマ取得）
  * `call-category-tool`（カテゴリ配下の個別ツール実行）
* 設定ファイルでの制御

  * **カテゴリ定義**（説明文を含む）
  * **ツールごとの `description` 上書き**と **enable/disable**
  * 上流サーバ（serena など）の起動方法（stdio/http/sse）
* 起動・実行時の**キャッシュ**、**エラー処理**、**ログ**の最小実装

### 1.2 非スコープ（v0.1 では実装しない）

* 複数 MCP を横断した**跨りカテゴリ**（v0.2 以降で検討）
* LLM クライアント側の "skills" 管理や永続メモリ連携の実装（サーバからは説明文を返すのみ）
* 認可・認証、レート制限の高度化（必要最小限のガードのみ）

---

## 2. 公開する MCP ツール（サーバが LLM に登録するツール）

> **設計方針**: 公開ツールは **2つだけ**。カテゴリの存在は**ツール説明文**に含め、LLM は説明文を読むだけでカテゴリを把握できる。詳細スキーマは必要時にのみ取得する。

### 2.1 `get-category-tools`

* **目的**: 指定カテゴリに属する *有効化済み* ツールのスキーマ一覧を返す
* **引数**:

  * `category: string`（必須）
  * `toolNames?: string[]`（任意。指定時は部分取得。未指定ならカテゴリ内の全ツール）
* **戻り値**:

  * `tools: { [toolName: string]: ToolSchema }`
  * `meta: { category: string; sourceServer: string; unavailableTools?: string[] }`
* **失敗**: `UnknownCategory` / `UpstreamUnavailable` / `SchemaFetchError`

### 2.2 `call-category-tool`

* **目的**: カテゴリ配下の特定ツールを代理実行（上流 MCP へプロキシ）
* **引数**:

  * `category: string`（必須）
  * `name: string`（必須。カテゴリに属するツール名）
  * `args: object`（必須。ツール引数）
* **戻り値**: 上流 MCP の実行結果をそのまま返却（必要最小のラップのみ）
* **失敗**: `UnknownCategory` / `ToolDisabled` / `UnknownTool` / `UpstreamCallError`

### 2.3 2ツールの**説明文**（例）

* `get-category-tools` の説明文に **利用可能カテゴリ一覧**と各カテゴリの短い説明を含める（上流ツールスキーマは含めない）。
* `call-category-tool` の説明文には、**実行フロー**（1. 必要カテゴリを `get-category-tools` でロード → 2. このツールで実行）を簡潔に明記。

---

## 3. カテゴリ設計

### 3.1 目的

* serena の巨大ツール群を **用途別**に分割し、LLM がその場で必要なカテゴリだけを選べるようにする。

### 3.2 例: serena のカテゴリ案

* `fs`（ファイル操作）

  * `read_file`, `create_text_file`, `list_dir`, `find_file`, `replace_regex`, `search_for_pattern`
* `code`（コードナビ/編集）

  * `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`, `rename_symbol`
* `memory`（メモリ操作）

  * `write_memory`, `read_memory`, `list_memories`, `delete_memory`
* `session`（実行・初期化・構成）

  * `execute_shell_command`, `activate_project`, `switch_modes`, `get_current_config`, `onboarding`, `check_onboarding_performed`, `prepare_for_new_conversation`
* `meta`（メタ思考/初期指示）

  * `think_about_collected_information`, `think_about_task_adherence`, `think_about_whether_you_are_done`, `initial_instructions`

> 実装では **カテゴリ名 → ツール集合** を設定ファイルで宣言。ツール名の**明示列挙**を基本とし、将来は `includePatterns` / `excludePatterns`（glob/regex）にも対応可能。

---

## 4. 設定ファイル（拡張スキーマ）

> 既存の `config-schema.json` を拡張。**上流 MCP の定義**は現状どおり `mcpServers` に記述（`description` 必須）。加えて、本サーバ固有の `categories` を追加。

### 4.1 ルート構造

```jsonc
{
  "$schema": "<このリポジトリの config-schema.json の raw URL>",
  "mcpServers": {
    "serena": {
      "description": "社内コードベース操作に最適化された MCP。",
      "type": "stdio", // 省略可（デフォルト stdio）
      "command": "npx",
      "args": ["-y", "@org/serena-mcp@latest"],
      "env": {}
    }
  },
  "categories": {
    "fs": {
      "description": "ファイル/ディレクトリの読み書きと検索。",
      "server": "serena",
      "tools": {
        "includeNames": [
          "read_file", "create_text_file", "list_dir",
          "find_file", "replace_regex", "search_for_pattern"
        ],
        // 将来: includePatterns/excludePatterns も許容
        "overrides": {
          "read_file": {
            "enabled": true,
            "description": "大きなファイルは部分読み取りを推奨。"
          },
          "replace_regex": {
            "enabled": true,
            "description": "正規表現の安全性に注意（バックトラッキング過多を避ける）。"
          }
        }
      }
    },
    "code": {
      "description": "シンボル探索とコード編集。",
      "server": "serena",
      "tools": {
        "includeNames": [
          "get_symbols_overview", "find_symbol", "find_referencing_symbols",
          "replace_symbol_body", "insert_after_symbol", "insert_before_symbol", "rename_symbol"
        ],
        "overrides": {
          "replace_symbol_body": { "enabled": false } // 一時停止など
        }
      }
    }
    // ... memory / session / meta も同様に記述
  }
}
```

### 4.2 バリデーション（概略）

* `categories.*.server` は `mcpServers` のキーと一致必須
* `includeNames` は一意であること
* `overrides.*.enabled` は boolean（省略時は true）
* `overrides.*.description` は string（省略可）
* 不明ツール名を `includeNames` / `overrides` に含めた場合は起動時に **警告ログ**、実行時は **UnknownTool** とする

### 4.3 ホットリロード（任意/軽量）

* v0.1 は **起動時ロードのみ**。ファイル監視・再読込は v0.2 以降で検討

---

## 5. ランタイム挙動

### 5.1 起動フロー

1. 設定ファイルの読み込み（`src/config-loader.ts` 拡張）
2. スキーマ検証（現行 `generate-schema.ts` を流用して JSON Schema を更新）
3. 上流 MCP の起動（`stdio` 既定、`http`/`sse` も対応：`src/transport.ts`）
4. **カテゴリ索引の構築**（`category → server, tool set, overrides`）
5. LLM へ 2 ツールを登録

   * `get-category-tools` の説明文に **カテゴリ一覧**を埋め込み

### 5.2 `get-category-tools` 実行時

1. 入力 `category` を検証
2. 対応する上流サーバ（例: serena）から **ツールスキーマ一覧**を取得（初回のみ）
3. `includeNames` で**抽出** → `overrides` を**適用** → `enabled=false` は**除外**
4. 結果をキャッシュ（メモリ、TTL 既定 10 分）

### 5.3 `call-category-tool` 実行時

1. 入力 `category`/`name` を検証
2. `enabled=false` なら `ToolDisabled`
3. スキーマ未ロードでも**実行は許可**（上流に透過プロキシ）

   * ただし、設定にツールが存在しない場合は `UnknownTool`
4. 上流サーバへプロキシ実行 → 結果をそのまま返却

### 5.4 キャッシュ

* **上流ツールスキーマ**のみメモリキャッシュ
* キー: `{server}:{schemaVersion-hash}`（schemaVersion が取れない場合は一覧の `name+hash`）
* カテゴリごとの最終整形結果も短期キャッシュ可（任意）

---

## 6. エラー処理 / フォールバック

* 上流起動失敗: `unavailableServers` を保持し、`get-category-tools` の `meta.unavailableTools` に反映
* 上流切断・リトライ: 最小限の指数バックオフ（起動時/実行時）
* 不明カテゴリ/ツール: 400 相当のエラーを返す
* JSON 直列化不可な引数: バリデーションエラー

---

## 7. セキュリティ / ガード

* `execute_shell_command` など **危険度の高いツールは既定で disabled** 推奨（設定例で示す）
* リクエストサイズ / 実行時間の簡易制限（サーバ側タイムアウト）
* 上流が http/sse の場合は **ヘッダに秘匿値**を載せる前提（設定ファイルでのみ管理）

---

## 8. ロギング / 観測性（最小）

* 起動時: 読み込みカテゴリ数、ツール数、無効ツール数、未解決ツール数
* 実行時: `call-category-tool` の `category/name` とレイテンシ（成功/失敗）
* `src/logger.ts` を流用

---

## 9. 実装変更点（ファイル別）

* `src/types.ts`

  * `CategoryConfig` / `ToolOverrides` / `ResolvedCategory` 型を追加
* `src/config-loader.ts`

  * 既存の `mcpServers` ロードに加えて `categories` をロード&検証
  * 上流キー参照チェック、未知ツールの警告
* `src/transport.ts`

  * 既存の stdio/http/sse ハンドラを流用（変更最小）
* `src/client-manager.ts`

  * 上流接続のライフサイクル管理（allSettled + リトライ）
  * **上流ツールスキーマの取得 API** を公開
* `src/server.ts`

  * MCP サーバ登録時に 2 ツールのみ公開
  * 説明文に **カテゴリ一覧**を埋め込み（行数と情報量を制限）
  * 2 ツールのルーティングとハンドラを実装
* `src/index.ts`

  * CLI エントリ。既存と同じ（設定ファイルパス引数の受け取りのみ）
* `src/scripts/generate-schema.ts`

  * `categories` 拡張を含む JSON Schema を生成

---

## 10. 受け入れ基準（Acceptance Criteria）

1. サーバ起動時、`get-category-tools` の説明文に **カテゴリ名と説明**が列挙される
2. `get-category-tools(category="fs")` 実行で、`fs` に含まれる **有効化ツールのスキーマ**のみが返る
3. `call-category-tool(category, name)` で対象ツールが上流 serena で実行され、結果が返る
4. `overrides` の `enabled=false` を付与したツールは 2/3 のいずれでも**実行されない**
5. 不明カテゴリ/ツール指定時に適切なエラーコード/メッセージ
6. 上流未接続でも、説明文のカテゴリ一覧は LLM から確認できる

---

## 11. 例: `serena-module.json`（抜粋）

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/<you>/serena-module/refs/heads/main/config-schema.json",
  "mcpServers": {
    "serena": {
      "description": "社内コードベースを操作する高頻度 MCP（大規模ツール群）",
      "command": "npx",
      "args": ["-y", "@org/serena-mcp@latest"],
      "env": {}
    }
  },
  "categories": {
    "fs": {
      "description": "ファイル/ディレクトリ操作と検索",
      "server": "serena",
      "tools": {
        "includeNames": [
          "mcp__serena__read_file",
          "mcp__serena__create_text_file",
          "mcp__serena__list_dir",
          "mcp__serena__find_file",
          "mcp__serena__replace_regex",
          "mcp__serena__search_for_pattern"
        ],
        "overrides": {
          "mcp__serena__read_file": {
            "description": "大きなファイルは範囲指定を推奨（O(n) 回避）。",
            "enabled": true
          },
          "mcp__serena__execute_shell_command": { "enabled": false }
        }
      }
    },
    "code": {
      "description": "シンボル探索とコード編集",
      "server": "serena",
      "tools": {
        "includeNames": [
          "mcp__serena__get_symbols_overview",
          "mcp__serena__find_symbol",
          "mcp__serena__find_referencing_symbols",
          "mcp__serena__replace_symbol_body",
          "mcp__serena__insert_after_symbol",
          "mcp__serena__insert_before_symbol",
          "mcp__serena__rename_symbol"
        ],
        "overrides": {
          "mcp__serena__replace_symbol_body": { "enabled": false }
        }
      }
    }
  }
}
```

---

## 12. テスト計画（最小）

* **ユニット**: カテゴリ解決、オーバーライド適用、未知ツール検出
* **結合**: 上流モックに対するスキーマ取得/実行、エラー伝播
* **E2E**: 実サーバ起動 → Claude Code 等から 2 ツールのみ表示されること → fs カテゴリ読み込み → 実行

---

## 13. 将来拡張（参考・非必須）

* 複数 MCP を跨る**横断カテゴリ**（例: `search` に serena + context7 を混在）
* `includePatterns`/`excludePatterns`（glob/regex）
* 設定ホットリロード
* カテゴリ毎の *skill snippet* を `get-category-tools` の `meta` に同梱
* レート制限/同時実行制御の強化

---

### 付記

* 本仕様は **MCP として必要最小限**の機能に限定している。まずは serena 用のカテゴリ分割を確立し、LLM のコンテキスト圧縮効果を確認したうえで段階的に拡張する。
