#!/usr/bin/env node
// Uploads 6 process stage photos and updates the process_photos table.

const fs = require('fs');
const path = require('path');
const https = require('https');

const PAT = process.env.SUPABASE_PAT;
const PROJECT_REF = 'sfxubyyetfetfxbghuzo';
const SUPABASE_URL = 'https://sfxubyyetfetfxbghuzo.supabase.co';
const PHOTOS_DIR = path.join(__dirname, 'second-converted');

const STAGES = [
  { stage: 1, file: 'IMG_1864.jpg', alt: 'A raw walnut slab on the shop floor beside the JointaWood CNC router sled — before any work begins.' },
  { stage: 2, file: 'IMG_1876.jpg', alt: 'Walnut slabs and cookie rounds arranged in the Tyvek-lined mold — the layout before the pour.' },
  { stage: 3, file: 'IMG_1999.jpg', alt: 'Blue epoxy being poured into the river channel between walnut slabs.' },
  { stage: 4, file: 'IMG_1903.jpg', alt: 'The JointaWood CNC router sled flattening the cured walnut-and-epoxy surface.' },
  { stage: 5, file: 'IMG_1912.jpg', alt: 'Edge detail showing CNC machining marks before eight grits of hand sanding begin.' },
  { stage: 6, file: 'IMG_1916.jpg', alt: 'Underside of a finished walnut table top showing steel mounting hardware and monitor brackets routed into solid wood.' },
];

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method, headers };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
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
    { 'Authorization': `Bearer ${PAT}` }
  );
  if (res.status !== 200) throw new Error(`Auth error: ${res.status}`);
  const keys = JSON.parse(res.body.toString());
  const svc = keys.find(k => k.name === 'service_role');
  if (!svc) throw new Error('service_role key not found');
  return svc.api_key;
}

async function uploadFile(key, storagePath, buffer) {
  const url = `${SUPABASE_URL}/storage/v1/object/gallery/${encodeURIComponent(storagePath)}`;
  const res = await request('POST', url, {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'image/jpeg',
    'Content-Length': buffer.length,
    'x-upsert': 'true',
  }, buffer);
  return res.status;
}

async function updateStage(key, stage, storagePath, altText) {
  const body = Buffer.from(JSON.stringify({ storage_path: storagePath, alt_text: altText }));
  const url = `${SUPABASE_URL}/rest/v1/process_photos?stage=eq.${stage}`;
  const res = await request('PATCH', url, {
    'Authorization': `Bearer ${key}`,
    'apikey': key,
    'Content-Type': 'application/json',
    'Content-Length': body.length,
    'Prefer': 'return=minimal',
  }, body);
  return res.status;
}

async function main() {
  process.stdout.write('Authenticating... ');
  const key = await getServiceKey();
  console.log('OK\n');

  for (const s of STAGES) {
    const localPath = path.join(PHOTOS_DIR, s.file);
    const storagePath = `process/stage-${s.stage}.jpg`;
    const buffer = fs.readFileSync(localPath);

    process.stdout.write(`  Stage ${s.stage} — uploading ${s.file}...`);
    const uploadStatus = await uploadFile(key, storagePath, buffer);
    if (uploadStatus !== 200 && uploadStatus !== 201) {
      console.log(` ✗ storage HTTP ${uploadStatus}`);
      continue;
    }

    const dbStatus = await updateStage(key, s.stage, storagePath, s.alt);
    if (dbStatus === 204 || dbStatus === 200) {
      console.log(` ✓`);
    } else {
      console.log(` ✗ DB HTTP ${dbStatus}`);
    }
  }

  console.log('\nDone. Process photos are live on /process.html');
}

main().catch(e => { console.error(e.message); process.exit(1); });
