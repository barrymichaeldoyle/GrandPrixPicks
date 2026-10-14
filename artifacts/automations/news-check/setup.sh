#!/usr/bin/env bash
set -euo pipefail

# Run from the cloned repository root. No credentials belong in this script.
npm install -g pnpm@12.4.1 @bufferapp/cli@2.0.1
pnpm install --frozen-lockfile
