#!/usr/bin/env node
// Convert images in second/ folders and upload each folder as a gallery project.
// Uses sips (macOS built-in) for HEIC→JPG conversion.
//
// Usage: node upload-second.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const os = require('os');

const PAT = process.env.SUPABASE_PAT;
const PROJECT_REF = 'sfxubyyetfetfxbghuzo';
const SUPABASE_URL = 'https://sfxubyyetfetfxbghuzo.supabase.co';
const SOURCE_DIR = path.join(__dirname, 'second');

// Folder name → project display name
const PROJECT_NAMES = {
  'Mantle':         'Mantle',
  'black-island':   'Black Island Kitchen',
  'blue-coffee':    'Blue Coffee Table',
  'Other projects': 'Other Projects',
  'gray-desk':      'Gray Desk',
  'console table':  'Console Table',
  'Game table':     'Game Table',
};

// Folder name → URL-safe slug for storage paths
function toSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

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
  if (res.status !== 200) throw new Error(`Auth error: ${res.status} ${res.body}`);
  const keys = JSON.parse(res.body.toString());
  const svc = keys.find(k => k.name === 'service_role');
  if (!svc) throw new Error('service_role key not found');
  return svc.api_key;
}

async function upsertProject(key, name, sortOrder) {
  // Check if project exists by name
  const getRes = await request('GET',
    `${SUPABASE_URL}/rest/v1/gallery_projects?name=eq.${encodeURIComponent(name)}&select=id`,
    { 'Authorization': `Bearer ${key}`, 'apikey': key }
  );
  if (getRes.status === 200) {
    const rows = JSON.parse(getRes.body.toString());
    if (rows.length > 0) return rows[0].id;
  }

  const body = Buffer.from(JSON.stringify({ name, sort_order: sortOrder }));
  const res = await request('POST',
    `${SUPABASE_URL}/rest/v1/gallery_projects`,
    {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'application/json',
      'Content-Length': body.length,
      'Prefer': 'return=representation',
    }, body
  );
  if (res.status !== 201) throw new Error(`Failed to create project "${name}": HTTP ${res.status} ${res.body}`);
  return JSON.parse(res.body.toString())[0].id;
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

async function insertPhoto(key, projectId, storagePath, sortOrder) {
  // Check if already exists
  const getRes = await request('GET',
    `${SUPABASE_URL}/rest/v1/gallery_photos?storage_path=eq.${encodeURIComponent(storagePath)}&select=id`,
    { 'Authorization': `Bearer ${key}`, 'apikey': key }
  );
  if (getRes.status === 200) {
    const rows = JSON.parse(getRes.body.toString());
    if (rows.length > 0) return 'existing';
  }

  const body = Buffer.from(JSON.stringify({ project_id: projectId, storage_path: storagePath, sort_order: sortOrder }));
  const res = await request('POST',
    `${SUPABASE_URL}/rest/v1/gallery_photos`,
    {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'application/json',
      'Content-Length': body.length,
      'Prefer': 'return=minimal',
    }, body
  );
  return res.status;
}

function convertToJpg(srcPath, tmpPath) {
  execSync(`sips -s format jpeg "${srcPath}" --out "${tmpPath}" -s formatOptions 85`, { stdio: 'pipe' });
}

async function main() {
  process.stdout.write('Authenticating... ');
  const key = await getServiceKey();
  console.log('OK\n');

  const folders = fs.readdirSync(SOURCE_DIR).filter(f => {
    const full = path.join(SOURCE_DIR, f);
    return fs.statSync(full).isDirectory() && !f.startsWith('.');
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scs-upload-'));

  for (const folder of folders) {
    const displayName = PROJECT_NAMES[folder] || folder;
    const slug = toSlug(folder);
    const folderPath = path.join(SOURCE_DIR, folder);

    const images = fs.readdirSync(folderPath)
      .filter(f => /\.(jpg|jpeg|heic)$/i.test(f) && !f.startsWith('.'))
      .sort();

    if (!images.length) {
      console.log(`  ${folder}: no images, skipping`);
      continue;
    }

    console.log(`\n[${displayName}] (${images.length} images)`);

    let projectId;
    try {
      projectId = await upsertProject(key, displayName, folders.indexOf(folder) + 1);
      console.log(`  project id: ${projectId}`);
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
      continue;
    }

    for (let i = 0; i < images.length; i++) {
      const imgFile = images[i];
      const srcPath = path.join(folderPath, imgFile);
      const baseName = path.basename(imgFile, path.extname(imgFile)).toLowerCase().replace(/\s+/g, '-');
      const storagePath = `projects/${slug}/${baseName}.jpg`;
      const tmpPath = path.join(tmpDir, `${slug}-${baseName}.jpg`);

      process.stdout.write(`  [${i + 1}/${images.length}] ${imgFile} → ${storagePath} ...`);

      try {
        convertToJpg(srcPath, tmpPath);
      } catch (e) {
        console.log(` ✗ conversion failed: ${e.message}`);
        continue;
      }

      const buffer = fs.readFileSync(tmpPath);
      const uploadStatus = await uploadFile(key, storagePath, buffer);
      if (uploadStatus !== 200 && uploadStatus !== 201) {
        console.log(` ✗ storage HTTP ${uploadStatus}`);
        continue;
      }

      const dbStatus = await insertPhoto(key, projectId, storagePath, i + 1);
      if (dbStatus === 'existing' || dbStatus === 201 || dbStatus === 200) {
        const kb = Math.round(buffer.length / 1024);
        console.log(` ✓ (${kb}KB)`);
      } else {
        console.log(` ✗ DB HTTP ${dbStatus}`);
      }
    }
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('\nDone! All projects are live on the gallery.');
}

main().catch(e => { console.error(e); process.exit(1); });
