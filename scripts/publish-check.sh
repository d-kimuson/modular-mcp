#!/usr/bin/env bash

set -ueo pipefail

pnpm typecheck
pnpm lint
pnpm build
pnpm audit

output_file=$(npm pack --json | jq -r '.[].filename')
trap 'if [ -n "$output_file" ]; then rm -f ./$output_file; fi' EXIT

npx -y ./$output_file --help
