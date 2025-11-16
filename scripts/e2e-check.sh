#!/usr/bin/env bash

set -ueo pipefail

pnpm build
output_file=$(pnpm pack --json | jq -r '.filename')

mkdir temp-pkg
cd temp-pkg && npm init -y
npm install ../$output_file

rm -rf ../node_modules

npx modular-mcp --version
npx modular-mcp --help
cd ..

rm -rf temp-pkg
