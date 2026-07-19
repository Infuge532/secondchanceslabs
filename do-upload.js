#!/usr/bin/env node
// Fetches service role key via PAT, then uploads all photos from second-converted/

const fs = require('fs');
const path = require('path');
const https = require('https');

const PAT = process.env.SUPABASE_PAT;
const PROJECT_REF = 'sfxubyyetfetfxbghuzo';
const SUPABASE_URL = 'https://sfxubyyetfetfxbghuzo.supabase.co';
const PHOTOS_DIR = path.join(__dirname, 'second-converted');

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method, headers };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getServiceKey() {
  const res = await request('GET',
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' }
  );
  if (res.status !== 200) throw new Error(`Management API error: ${res.status} ${res.body}`);
  const keys = JSON.parse(res.body.toString());
  const svc = keys.find(k => k.name === 'service_role');
  if (!svc) throw new Error('service_role key not found in response');
  return svc.api_key;
}

async function getExistingPaths(key) {
  const res = await request('GET', `${SUPABASE_URL}/rest/v1/gallery_photos?select=storage_path`,
    { 'Authorization': `Bearer ${key}`, 'apikey': key });
  if (res.status !== 200) return new Set();
  return new Set(JSON.parse(res.body.toString()).map(r => r.storage_path));
}

async function uploadFile(key, filename, buffer) {
  const res = await request('POST',
    `${SUPABASE_URL}/storage/v1/object/gallery/${encodeURIComponent(filename)}`,
    { 'Authorization': `Bearer ${key}`, 'Content-Type': 'image/jpeg',
      'Content-Length': buffer.length, 'x-upsert': 'true' },
    buffer);
  return res.status;
}

async function insertRecord(key, filename, sortOrder) {
  const body = Buffer.from(JSON.stringify({ storage_path: filename, sort_order: sortOrder }));
  const res = await request('POST', `${SUPABASE_URL}/rest/v1/gallery_photos`,
    { 'Authorization': `Bearer ${key}`, 'apikey': key,
      'Content-Type': 'application/json', 'Content-Length': body.length, 'Prefer': 'return=minimal' },
    body);
  return res.status;
}

async function main() {
  process.stdout.write('Authenticating... ');
  const key = await getServiceKey();
  console.log('OK');

  const files = fs.readdirSync(PHOTOS_DIR)
    .filter(f => f.toLowerCase().endsWith('.jpg'))
    .sort();
  console.log(`Found ${files.length} photos.\n`);

  const existing = await getExistingPaths(key);
  console.log(`Already in DB: ${existing.size}\n`);

  let uploaded = 0, skipped = 0, errors = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    if (existing.has(filename)) {
      console.log(`  skip  [${i+1}/${files.length}] ${filename}`);
      skipped++;
      continue;
    }
    const buffer = fs.readFileSync(path.join(PHOTOS_DIR, filename));
    process.stdout.write(`  [${i+1}/${files.length}] ${filename} — uploading...`);

    const s = await uploadFile(key, filename, buffer);
    if (s !== 200 && s !== 201) { console.log(` ✗ storage HTTP ${s}`); errors++; continue; }

    const d = await insertRecord(key, filename, i + 1);
    if (d !== 201) { console.log(` ✗ DB HTTP ${d}`); errors++; continue; }

    console.log(` ✓ (${Math.round(buffer.length/1024)}KB)`);
    uploaded++;
  }

  console.log(`\n✓ Done: ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`);
  if (uploaded > 0) console.log('Photos are live on the gallery page.');
}

main().catch(err => { console.error('\nError:', err.message); process.exit(1); });
