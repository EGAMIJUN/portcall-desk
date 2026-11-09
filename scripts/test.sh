#!/usr/bin/env bash
# Runs the unit tests. The logic test bundles src/ with a fake in-memory Jira (test/fake-jira.js).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build-test && mkdir -p build-test
cp -r src build-test/src
cp test/fake-jira.js build-test/src/jira.js
printf "export * from './src/portcall.js';\nexport { db } from './src/jira.js';\n" > build-test/entry.js
npx --yes esbuild build-test/entry.js --bundle --platform=node --format=esm --outfile=build-test/bundle.mjs --log-level=warning
node --experimental-default-type=module --test test/schedule.test.js test/portcall.test.js
