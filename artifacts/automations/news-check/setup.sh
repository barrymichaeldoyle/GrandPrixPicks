#!/usr/bin/env bash
set -euo pipefail

# Cloud setup may run outside the clone. The task installs dependencies after checkout.
# No credentials belong in this script.
npm install -g pnpm@12.4.1 @bufferapp/cli@2.0.1
