#!/usr/bin/env bash
# Collects the files that are published to the web server into ./dist
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
cp index.html dist/
cp -r assets dist/
echo "Built dist/ for version $(grep -oP "APP_VERSION = '\K[^']+" assets/js/config.js)"
