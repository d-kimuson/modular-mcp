# serena-modular MCP接続問題のトラブルシューティング

## 現在の問題

serena-modular MCPサーバーを実行しても、すべてのカテゴリ（fs、code、memory、session、meta）で「Connection closed」エラーが発生します。

**主な原因**: 上流MCPサーバー（`@org/serena-mcp`）が存在しないため、Modular MCPが接続できません。

## 前提条件（既に解決済み）

以下の準備が完了していることを前提とします：

- ✅ **ビルド完了**: `pnpm install && pnpm build`を実行し、`dist/index.js`が生成されている
- ✅ **設定ファイル**: `serena-config.example.json`などの設定ファイルを用意している

## 主要問題：上流MCPサーバーが存在しない

**問題の核心**: `@org/serena-mcp`パッケージが存在しない

`serena-config.example.json`では、以下のように上流MCPサーバーとして`@org/serena-mcp`を指定しています：

```json
{
  "mcpServers": {
    "serena": {
      "description": "社内コードベース操作に最適化された MCP。",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@org/serena-mcp@latest"],
      "env": {}
    }
  }
}
```

しかし、このパッケージはnpm registryに存在しません：
```bash
$ npm view @org/serena-mcp
npm error 404 Not Found - '@org/serena-mcp@*' is not in this registry.
```

### なぜこれが問題なのか

Modular MCPは**プロキシサーバー**です。つまり：
- Modular MCP自体はツールを持っていません
- 上流のMCPサーバー（この場合は`@org/serena-mcp`）に接続し、そのツールを中継します
- 上流サーバーが存在しない、または接続できない場合、すべてのツールが使用不可になります

### エラーの流れ

1. Modular MCPが起動
2. `serena-config.example.json`を読み込み
3. `npx -y @org/serena-mcp@latest`を実行しようとする
4. ❌ パッケージが見つからず、接続失敗
5. `src/client-manager.ts:58-60`で接続エラーが発生し、`recordFailedConnection`に記録される
6. 結果：すべてのカテゴリツールが「Connection closed」エラーになる

## アーキテクチャの理解

Modular MCPは**プロキシサーバー**として動作します：

1. **プロキシパターン**: Modular MCP自体はツールを提供せず、上流のMCPサーバーに接続してツールをプロキシする
2. **カテゴリベースの整理**: 上流サーバーのツールをカテゴリに整理し、必要なときだけロードする
3. **コンテキスト効率化**: すべてのツールスキーマを一度にロードせず、オンデマンドでロードする

```
Claude Desktop
    ↓ (MCP stdio)
Modular MCP (this project)
    ↓ (MCP stdio)
Upstream MCP Server (@org/serena-mcp など)
```

## 解決策

### 推奨：動作確認のため公開MCPサーバーでテスト

まず、Modular MCPが正しく動作するか確認するため、公開されているMCPサーバーでテストすることを推奨します。

**テスト用設定ファイルを作成** (`test-config.json`):

```json
{
  "$schema": "https://raw.githubusercontent.com/d-kimuson/modular-mcp/refs/heads/main/config-schema.json",
  "mcpServers": {
    "filesystem": {
      "description": "File system operations",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem@latest", "/tmp"],
      "env": {}
    }
  }
}
```

**テスト実行**:
```bash
# ローカルでテスト
node dist/index.js test-config.json

# または、Claude Desktopから接続してテスト
```

このテストが成功すれば、Modular MCP自体は正常に動作していることが確認できます。

### 本題：@org/serena-mcpの対応

`@org/serena-mcp`を使用するには、以下のいずれかの対応が必要です：

#### オプション1: @org/serena-mcpを実装する

`serena-config.example.json`で指定されている以下のツールを提供するMCPサーバーを実装する必要があります：

**必要なツール一覧**:
- **fs カテゴリ** (6ツール):
  - `mcp__serena__read_file`
  - `mcp__serena__create_text_file`
  - `mcp__serena__list_dir`
  - `mcp__serena__find_file`
  - `mcp__serena__replace_regex`
  - `mcp__serena__search_for_pattern`

- **code カテゴリ** (7ツール):
  - `mcp__serena__get_symbols_overview`
  - `mcp__serena__find_symbol`
  - `mcp__serena__find_referencing_symbols`
  - `mcp__serena__replace_symbol_body`
  - `mcp__serena__insert_after_symbol`
  - `mcp__serena__insert_before_symbol`
  - `mcp__serena__rename_symbol`

- **memory カテゴリ** (4ツール):
  - `mcp__serena__write_memory`
  - `mcp__serena__read_memory`
  - `mcp__serena__list_memories`
  - `mcp__serena__delete_memory`

- **session カテゴリ** (6ツール):
  - `mcp__serena__activate_project`
  - `mcp__serena__switch_modes`
  - `mcp__serena__get_current_config`
  - `mcp__serena__onboarding`
  - `mcp__serena__check_onboarding_performed`
  - `mcp__serena__prepare_for_new_conversation`

- **meta カテゴリ** (4ツール):
  - `mcp__serena__think_about_collected_information`
  - `mcp__serena__think_about_task_adherence`
  - `mcp__serena__think_about_whether_you_are_done`
  - `mcp__serena__initial_instructions`

**合計**: 27個のツールの実装が必要

#### オプション2: プライベートパッケージへのアクセス

`@org/serena-mcp`が既にプライベートパッケージとして存在する場合：

1. **認証情報の設定**:
   ```bash
   # .npmrcに認証トークンを追加
   echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN" >> ~/.npmrc

   # または、スコープ付きレジストリの場合
   echo "@org:registry=https://your-registry.com/" >> ~/.npmrc
   echo "//your-registry.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc
   ```

2. **アクセス権の確認**:
   ```bash
   npm view @org/serena-mcp
   # パッケージ情報が表示されればOK
   ```

#### オプション3: 既存の公開MCPサーバーで代替

`@org/serena-mcp`の機能が既存の公開MCPサーバーで代替可能な場合：

```json
{
  "mcpServers": {
    "filesystem": {
      "description": "File system operations",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem@latest", "."],
      "env": {}
    }
  },
  "categories": {
    "fs": {
      "description": "ファイル/ディレクトリの読み書き",
      "server": "filesystem",
      "tools": {
        "includeNames": ["read_file", "write_file", "list_directory"]
      }
    }
  }
}
```

## Claude Desktopでの設定例

正しく設定する場合（ビルド後）：

**macOS/Linux**: `~/.config/claude/config.json`
**Windows**: `%APPDATA%\Claude\config.json`

```json
{
  "mcpServers": {
    "serena-modular": {
      "command": "node",
      "args": [
        "/path/to/serena-modular-mcp/dist/index.js",
        "/path/to/your/config.json"
      ]
    }
  }
}
```

または、npm経由で公開されている場合：
```json
{
  "mcpServers": {
    "serena-modular": {
      "command": "npx",
      "args": [
        "-y",
        "@kimuson/modular-mcp",
        "/path/to/your/config.json"
      ]
    }
  }
}
```

## 診断方法

### 接続失敗を確認する方法

1. **ローカルでテスト実行**:
   ```bash
   node dist/index.js serena-config.example.json 2>&1
   ```

   出力例（接続失敗の場合）:
   ```
   Some MCP groups failed to connect. success_groups=[], failed_groups=[serena]
   ```

2. **Claude Desktopのログを確認**:
   - `View` → `Developer` → `Developer Tools` → `Console`タブ
   - "Connection closed" や "failed to connect" などのエラーメッセージを探す

3. **上流パッケージの存在確認**:
   ```bash
   npm view @org/serena-mcp
   # 404エラーが返ってくる = パッケージが存在しない
   ```

### 正常に動作している場合の出力

```
Successfully connected 1 MCP groups. All groups are valid.
```

## 次のステップ

### 短期的な対応（動作確認）

1. **公開MCPサーバーでテスト**:
   ```bash
   # test-config.jsonを作成（上記の「推奨：動作確認のため公開MCPサーバーでテスト」を参照）
   node dist/index.js test-config.json
   ```

2. **接続成功を確認**:
   - "Successfully connected" メッセージが表示されることを確認

### 長期的な対応（本番運用）

以下のいずれかを実施：

1. **@org/serena-mcpを実装** → 27個のツールを提供するMCPサーバーを開発
2. **プライベートパッケージへのアクセス設定** → 既に存在する場合
3. **既存MCPサーバーで代替** → 同等の機能を持つ公開サーバーを使用

## まとめ

### 現在の状況
- ✅ **ビルド完了** → `dist/index.js`が生成されている
- ✅ **設定ファイル用意** → `serena-config.example.json`が存在
- ❌ **上流MCPサーバーが存在しない** → これが現在の障害

### 根本原因
`@org/serena-mcp`パッケージがnpm registryに存在しないため、Modular MCPが上流サーバーに接続できず、すべてのカテゴリツールが使用不可になっています。

### 解決には
- 上流MCPサーバー（`@org/serena-mcp`）を実装するか、既存の公開MCPサーバーを使用する必要があります
- または、プライベートパッケージとして既に存在する場合は、アクセス権を取得してください
