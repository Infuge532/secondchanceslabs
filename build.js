const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ROOT = __dirname;
const HTML_FILES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const ASSETS = ['styles.css', 'script.js'];

// Generate config.js from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.');
  process.exit(1);
}
fs.writeFileSync(
  path.join(ROOT, 'config.js'),
  `window.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};\nwindow.SUPABASE_ANON_KEY = ${JSON.stringify(supabaseKey)};\n`
);
console.log('  config.js generated');

// Build a map of filename → 8-char content hash
const hashes = {};
for (const asset of ASSETS) {
  const file = path.join(ROOT, asset);
  if (!fs.existsSync(file)) continue;
  const hash = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  hashes[asset] = hash;
  console.log(`  ${asset} → ${hash}`);
}

// Rewrite ?v=... query strings in every HTML file
for (const htmlFile of HTML_FILES) {
  const file = path.join(ROOT, htmlFile);
  let html = fs.readFileSync(file, 'utf8');
  for (const [asset, hash] of Object.entries(hashes)) {
    html = html.replace(new RegExp(`(${asset})\\?v=[^"']+`, 'g'), `$1?v=${hash}`);
  }
  fs.writeFileSync(file, html);
  console.log(`  updated ${htmlFile}`);
}

console.log('Build complete.');
