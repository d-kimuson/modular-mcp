#!/usr/bin/env bash

set -ueo pipefail

temp_dir="e2e-check-temp"
temp_cache_dir="npm-cache" # 空のキャッシュディレクトリを使うことでクリーンインストール時の動作を再現

pnpm build
output_file=$(pnpm pack --pack-destination ./$temp_dir --json | jq -r '.filename')

npx --yes --cache "./$temp_dir/$temp_cache_dir" --package "$output_file" modular-mcp --version
npx --yes --cache "./$temp_dir/$temp_cache_dir" --package "$output_file" modular-mcp --help

rm -rf $temp_dir
