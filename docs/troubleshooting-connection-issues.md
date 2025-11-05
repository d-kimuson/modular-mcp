# serena-modular MCP接続問題のトラブルシューティング

## 問題の概要

serena-modular MCPサーバーが実行できず、すべてのカテゴリ（fs、code、memory、session、meta）で「Connection closed」エラーが発生する問題が報告されています。

## 調査結果

### 1. プロジェクトのビルドが必要

**問題**: `dist/`ディレクトリが存在しない

- `package.json`の`bin`フィールドは`./dist/index.js`を指定している
- しかし、プロジェクトはビルドされていないため、このファイルが存在しない
- TypeScriptソースコード（`src/`）は直接実行できない

**解決方法**:
```bash
# 依存関係のインストール
pnpm install

# プロジェクトのビルド
pnpm build
```

ビルド後、`dist/index.js`が作成されます。

### 2. 上流MCPサーバーの問題

**問題**: `@org/serena-mcp`パッケージが存在しない

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

**原因分析**:
- `@org/serena-mcp`は存在しないか、プライベートパッケージである可能性がある
- Modular MCPは上流のMCPサーバーに接続できないため、カテゴリツールが利用できない
- `src/client-manager.ts:58-60`で接続エラーが発生し、`recordFailedConnection`に記録される

### 3. 設定ファイルのパス指定

**問題**: 設定ファイルのパスが必須

`src/index.ts:8-12`の実装：
```typescript
const configPath = process.argv[2];

if (!configPath) {
  process.exit(1);
}
```

設定ファイルのパスが提供されない場合、サーバーは即座に終了します。

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

### オプション1: 既存の公開MCPサーバーを使用

`config.example.json`の例のように、公開されているMCPサーバーを使用：

```json
{
  "$schema": "https://raw.githubusercontent.com/d-kimuson/modular-mcp/refs/heads/main/config-schema.json",
  "mcpServers": {
    "playwright": {
      "description": "Use when you need to control or automate web browsers.",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    },
    "context7": {
      "description": "Use when you need to search library documentation.",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {}
    }
  }
}
```

### オプション2: @org/serena-mcpの実装

`@org/serena-mcp`が実際に必要な場合は、このMCPサーバーを実装する必要があります。以下のツールを提供する必要があります：

- **fs カテゴリ**: `read_file`, `create_text_file`, `list_dir`, `find_file`, `replace_regex`, `search_for_pattern`
- **code カテゴリ**: `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `replace_symbol_body`, など
- **memory カテゴリ**: `write_memory`, `read_memory`, `list_memories`, `delete_memory`
- **session カテゴリ**: `activate_project`, `switch_modes`, `get_current_config`, など
- **meta カテゴリ**: `think_about_collected_information`, `initial_instructions`, など

### オプション3: プライベートパッケージへのアクセス設定

`@org/serena-mcp`がプライベートnpmパッケージの場合：

1. `.npmrc`に認証情報を設定
2. 適切なnpm registryへのアクセス権を取得
3. パッケージをインストール可能にする

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

## 確認手順

1. **ビルドの確認**:
   ```bash
   ls -la dist/index.js
   # ファイルが存在することを確認
   ```

2. **手動テスト**（オプション）:
   ```bash
   # config.example.jsonを使用してテスト
   node dist/index.js config.example.json
   # サーバーが起動し、stdioで入力を待機する
   ```

3. **ログの確認**:
   - Claude Desktop: `View` → `Developer` → `Developer Tools` → `Console`タブ
   - 接続エラーやサーバーログを確認

## まとめ

serena-modular MCPが動作しない主な原因：

1. ✅ **ビルドされていない** → `pnpm build`で解決
2. ❌ **上流MCPサーバー（@org/serena-mcp）が存在しない** → 別のMCPサーバーを使用するか、実装が必要
3. ⚠️ **設定ファイルパスが必須** → Claude Desktop設定で正しいパスを指定

現在、最大の障害は`@org/serena-mcp`パッケージが存在しないことです。このパッケージを実装するか、既存の公開MCPサーバーを使用する必要があります。
