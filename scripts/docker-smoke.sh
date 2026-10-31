#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
docker compose up -d --build --wait --wait-timeout 120
docker compose exec -T reader node -e '
const assert = require("node:assert/strict");
(async () => {
  assert.notEqual(process.getuid(), 0, "runtime must not run as root");
  const response = await fetch("http://127.0.0.1:3000");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html/);
  const assets = [...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m => m[1]);
  assert.ok(assets.length > 0, "page must reference static assets");
  for (const asset of assets) {
    const result = await fetch(new URL(asset.replaceAll("&amp;", "&"), "http://127.0.0.1:3000"));
    assert.equal(result.status, 200, asset);
  }
  console.log(`PASS: non-root runtime, HTTP 200, ${assets.length} static assets`);
})().catch(error => { console.error(error); process.exit(1); });
'
