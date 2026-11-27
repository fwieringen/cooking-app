#!/usr/bin/env bash
# Collects the files that are published to the web server into ./dist
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(grep -oP "APP_VERSION = '\K[^']+" assets/js/config.js)
rm -rf dist
mkdir -p dist
cp .htaccess dist/
cp -r assets dist/
# Add ?v=<version> to every asset link, so each release loads its own scripts, styles and images
# instead of an older copy from a cache (scripts/serve.js does the same when testing locally)
sed -E "s#(src|href)=\"(assets/[^\"?]+)\"#\1=\"\2?v=${version}\"#g" index.html > dist/index.html
echo "Built dist/ for version ${version}"
