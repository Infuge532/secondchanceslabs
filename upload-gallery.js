#!/usr/bin/env node
// Upload converted photos from second-converted/ to Supabase gallery storage + DB.
//
// Usage:
//   SUPABASE_SERVICE_KEY=<your-service-role-key> node upload-gallery.js
//
// Get your service role key from:
//   Supabase Dashboard → Settings → API → "service_role" (secret)

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://sfxubyyetfetfxbghuzo.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PHOTOS_DIR = path.join(__dirname, 'second-converted');

if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY env var is required.');
  console.error('Get it from Supabase Dashboard → Settings → API → service_role secret');
  process.exit(1);
}

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers,
    };
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

async function uploadFile(filename, buffer) {
  const url = `${SUPABASE_URL}/storage/v1/object/gallery/${encodeURIComponent(filename)}`;
  const res = await request('POST', url, {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'image/jpeg',
    'Content-Length': buffer.length,
    'x-upsert': 'true',
  }, buffer);
  return res.status;
}

async function insertPhotoRecord(filename, sortOrder) {
  const url = `${SUPABASE_URL}/rest/v1/gallery_photos`;
  const body = Buffer.from(JSON.stringify({
    storage_path: filename,
    sort_order: sortOrder,
  }));
  const res = await request('POST', url, {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Content-Length': body.length,
    'Prefer': 'return=minimal',
  }, body);
  return res.status;
}

async function getExistingPaths() {
  const url = `${SUPABASE_URL}/rest/v1/gallery_photos?select=storage_path`;
  const res = await request('GET', url, {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
  });
  if (res.status !== 200) return new Set();
  const rows = JSON.parse(res.body.toString());
  return new Set(rows.map(r => r.storage_path));
}

async function main() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`Photos directory not found: ${PHOTOS_DIR}`);
    console.error('Run the image conversion first (wait for it to finish).');
    process.exit(1);
  }

  const files = fs.readdirSync(PHOTOS_DIR)
    .filter(f => f.toLowerCase().endsWith('.jpg'))
    .sort();

  if (!files.length) {
    console.error('No .jpg files found in second-converted/');
    process.exit(1);
  }

  console.log(`Found ${files.length} photos to upload.\n`);

  console.log('Checking existing gallery records...');
  const existing = await getExistingPaths();
  console.log(`Already in DB: ${existing.size}\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    if (existing.has(filename)) {
      console.log(`  skip  ${filename} (already uploaded)`);
      skipped++;
      continue;
    }

    const filePath = path.join(PHOTOS_DIR, filename);
    const buffer = fs.readFileSync(filePath);

    process.stdout.write(`  [${i + 1}/${files.length}] ${filename} — uploading...`);

    const storageStatus = await uploadFile(filename, buffer);
    if (storageStatus !== 200 && storageStatus !== 201) {
      console.log(` ✗ storage error (HTTP ${storageStatus})`);
      errors++;
      continue;
    }

    const dbStatus = await insertPhotoRecord(filename, i + 1);
    if (dbStatus !== 201) {
      console.log(` ✗ DB error (HTTP ${dbStatus})`);
      errors++;
      continue;
    }

    const kb = Math.round(buffer.length / 1024);
    console.log(` ✓ (${kb}KB)`);
    uploaded++;
  }

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`);
  if (uploaded > 0) {
    console.log('\nPhotos are live on your gallery page.');
    console.log('Open the admin panel to add piece names and categories.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
