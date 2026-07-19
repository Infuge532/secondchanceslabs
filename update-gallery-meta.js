#!/usr/bin/env node
// Updates piece_name, category, caption, sort_order for every gallery photo.

const https = require('https');

const PAT = process.env.SUPABASE_PAT;
const PROJECT_REF = 'sfxubyyetfetfxbghuzo';
const SUPABASE_URL = 'https://sfxubyyetfetfxbghuzo.supabase.co';

// ── Metadata ──────────────────────────────────────────────────────────────────
// sort_order: finished installed pieces first (10–99), beauty/detail shots (100–199),
// in-shop process shots (200+)
const META = [
  // ── Finished / installed pieces ─────────────────────────────────────────────
  { f:'IMG_1923.jpg', name:'Walnut Cookie Dining Table', cat:'Dining & Conference Tables',
    cap:'Installed in a home kitchen — dark metallic epoxy river with walnut cookie rounds, viewed from above.', s:10 },
  { f:'IMG_1820.jpg', name:'Walnut Cookie Dining Table', cat:'Dining & Conference Tables',
    cap:'Finished top: dark blue metallic river surrounds natural walnut cookie inlays. A table no showroom carries.', s:20 },
  { f:'IMG_2039.jpg', name:'River Rock Sofa Table', cat:'Coffee & Sofa Tables',
    cap:'Finished — Colorado river rocks set in teal epoxy along the live edge of a reclaimed walnut slab. Sold within days.', s:30 },
  { f:'IMG_0294.jpg', name:'Natural Slab Feature Display', cat:'Featured Work',
    cap:'A massive free-form walnut slab with organic voids, installed as a lobby feature piece.', s:40 },
  { f:'IMG_2025.jpg', name:'Blue River Coffee Table', cat:'Coffee & Sofa Tables',
    cap:'Blue epoxy river flowing diagonally across four matched walnut slabs, installed in a home living room.', s:50 },
  { f:'IMG_1901.jpg', name:'Live-Edge Walnut & Epoxy Desk', cat:'Dining & Conference Tables',
    cap:'Walnut live-edge desk with a dark epoxy waterfall side panel, installed in a home office.', s:60 },
  { f:'IMG_0259.jpg', name:'Live-Edge Walnut Bar Top', cat:'Mantels & Shelving',
    cap:'Polished live-edge walnut with bark-on front face, installed above a tiled fireplace.', s:70 },
  { f:'IMG_1977.jpg', name:'Live-Edge Floating Shelves', cat:'Mantels & Shelving',
    cap:'Three live-edge walnut shelves installed in a home office, styled with family photos and decor.', s:80 },
  { f:'IMG_1978.jpg', name:'Live-Edge Floating Shelves', cat:'Mantels & Shelving',
    cap:'Corner detail showing the live edge and tinted epoxy void fill on the shelf end.', s:81 },
  { f:'IMG_1979.jpg', name:'Live-Edge Floating Shelves', cat:'Mantels & Shelving',
    cap:'Shelf edge — natural bark preserved, void filled with blue epoxy.', s:82 },
  { f:'IMG_1980.jpg', name:'Live-Edge Floating Shelves', cat:'Mantels & Shelving',
    cap:'Close-up of live edge with epoxy fill, showing the depth of the pour.', s:83 },

  // ── Detail / beauty shots ────────────────────────────────────────────────────
  { f:'IMG_2055.jpg', name:'Quilted Walnut Dining Table', cat:'Dining & Conference Tables',
    cap:'Quilted grain close-up — the branch pressure that created these ripples grew eighty years ago.', s:100 },
  { f:'IMG_2046.jpg', name:'River Rock Sofa Table', cat:'Coffee & Sofa Tables',
    cap:'Edge detail of cured teal epoxy — depth and sparkle that caught every eye it met.', s:110 },
  { f:'IMG_1855.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Dark metallic burl epoxy river — the texture that forms in the cured resin between live-edge faces.', s:120 },
  { f:'IMG_2065.jpg', name:'Quilted Walnut Dining Table', cat:'Dining & Conference Tables',
    cap:'Blue epoxy crack fill running through quilted grain — where the wood met the resin.', s:130 },
  { f:'IMG_2062.jpg', name:'Quilted Walnut Dining Table', cat:'Dining & Conference Tables',
    cap:'Quilted walnut with blue epoxy along the live edge — depth and character in the same surface.', s:140 },
  { f:'IMG_1786.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'First pour of dark metallic epoxy settling into the void — burl texture forming as it cures.', s:150 },
  { f:'IMG_2063.jpg', name:'Quilted Walnut Dining Table', cat:'Dining & Conference Tables',
    cap:'Blue oval fills and crack detail — each void becomes its own small composition.', s:160 },

  // ── In-shop: Walnut Cookie Dining Table ─────────────────────────────────────
  { f:'IMG_1876.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Walnut cookie rounds placed in the mold before the color epoxy pour.', s:200 },
  { f:'IMG_1147.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Dark metallic epoxy pooling around walnut cookie inlays mid-pour.', s:210 },
  { f:'IMG_1842.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Two matched walnut slabs laid out in the Tyvek-lined mold.', s:220 },
  { f:'IMG_1784.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Large walnut slab set in the mold — clear base coat holds the wood in place before the color pour.', s:230 },
  { f:'IMG_1864.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'A large raw walnut slab on the shop floor beside the JointaWood CNC router sled.', s:240 },
  { f:'IMG_1841.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Raw slabs flat on the CNC sled, ready to be surfaced before the pour.', s:250 },
  { f:'IMG_1903.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'JointaWood CNC router sled flattening the cured walnut-and-epoxy surface after the pour.', s:260 },
  { f:'IMG_1843.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Slab layout in the mold before sealing.', s:270 },
  { f:'IMG_1846.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Walnut slabs in the mold — the river channel taking shape.', s:275 },
  { f:'IMG_1865.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process — epoxy pour in progress.', s:280 },
  { f:'IMG_1866.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process — epoxy settling into the voids.', s:285 },
  { f:'IMG_1885.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:290 },
  { f:'IMG_1887.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:295 },
  { f:'IMG_1888.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:300 },
  { f:'IMG_1890.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:305 },
  { f:'IMG_1893.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:310 },
  { f:'IMG_1894.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:315 },
  { f:'IMG_1895.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:320 },
  { f:'IMG_1905.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:325 },
  { f:'IMG_1912.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:330 },
  { f:'IMG_1917.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Build process.', s:335 },

  // ── In-shop: Walnut Desk ─────────────────────────────────────────────────────
  { f:'IMG_1916.jpg', name:'Live-Edge Walnut & Epoxy Desk', cat:'In the Shop',
    cap:'Underside of the desk top — steel hardware and monitor-arm brackets recessed into solid walnut.', s:340 },

  // ── In-shop: Blue River Coffee Table ────────────────────────────────────────
  { f:'IMG_1994.jpg', name:'Blue River Coffee Table', cat:'In the Shop',
    cap:'Four walnut slabs arranged in the mold — their live edges will become the riverbanks.', s:350 },
  { f:'IMG_1999.jpg', name:'Blue River Coffee Table', cat:'In the Shop',
    cap:'Blue epoxy pour beginning — TotalBoat ThickSet fills the channel between slabs.', s:360 },
  { f:'IMG_2001.jpg', name:'Blue River Coffee Table', cat:'In the Shop',
    cap:'Fresh pour curing in the mold — the blue river beginning to take shape.', s:370 },
  { f:'IMG_2002.jpg', name:'Blue River Coffee Table', cat:'In the Shop',
    cap:'Blue epoxy river, top-down — four slabs, one continuous pour.', s:380 },
  { f:'IMG_2003.jpg', name:'Blue River Coffee Table', cat:'In the Shop',
    cap:'Walnut grain visible through fresh epoxy — the wood shows through even while the resin is still wet.', s:390 },
  { f:'IMG_2007.jpg', name:'Blue River Coffee Table', cat:'In the Shop',
    cap:'CNC router sled flattening the cured top — epoxy reveals its texture after the first pass.', s:400 },
  { f:'IMG_2018.jpg', name:'Blue River Coffee Table', cat:'In the Shop',
    cap:'Edge detail of the finished piece — deep blue river meets walnut grain.', s:410 },

  // ── In-shop: River Rock Sofa Table ──────────────────────────────────────────
  { f:'IMG_2032.jpg', name:'River Rock Sofa Table', cat:'In the Shop',
    cap:'Colorado river rocks placed along the live edge before the pour.', s:420 },
  { f:'IMG_2033.jpg', name:'River Rock Sofa Table', cat:'In the Shop',
    cap:'Rock placement and layout — each rock hand-selected for shape and color.', s:430 },
  { f:'IMG_2034.jpg', name:'River Rock Sofa Table', cat:'In the Shop',
    cap:'Eye Candy teal pigment and TotalBoat ThickSet — the materials behind the river rock pour.', s:440 },
  { f:'IMG_2035.jpg', name:'River Rock Sofa Table', cat:'In the Shop',
    cap:'Teal epoxy flooding in around the rocks — the color shifts with depth and light.', s:450 },
  { f:'IMG_2036.jpg', name:'River Rock Sofa Table', cat:'In the Shop',
    cap:'Rocks suspended in fresh teal epoxy at the live edge of the walnut slab.', s:460 },

  // ── In-shop: Quilted Walnut Dining Table ────────────────────────────────────
  { f:'IMG_2048.jpg', name:'Quilted Walnut Dining Table', cat:'In the Shop',
    cap:'Quilted walnut slab in the mold with blue epoxy fills placed in natural voids and knots.', s:470 },
  { f:'IMG_2054.jpg', name:'Quilted Walnut Dining Table', cat:'In the Shop',
    cap:'Blue lake fill in a natural void — the quilted grain visible through fresh epoxy.', s:480 },
  { f:'IMG_2068.jpg', name:'Quilted Walnut Dining Table', cat:'In the Shop',
    cap:'Top-down of the full slab in the mold — the flood coat of blue epoxy reveals the scale.', s:490 },

  // ── Mold / construction ──────────────────────────────────────────────────────
  { f:'IMG_0439.jpg', name:'Building the Mold', cat:'In the Shop',
    cap:'Pine mold frame under construction — every pour starts with a custom form built to the slab.', s:500 },
  { f:'IMG_0296.jpg', name:'Construction Detail', cat:'In the Shop',
    cap:'Hardware mounting detail on the finished underside of a walnut table.', s:510 },
  { f:'IMG_0299.jpg', name:'Construction Detail', cat:'In the Shop',
    cap:'Process detail.', s:515 },
  { f:'IMG_1147.jpg', name:'Walnut Cookie Dining Table', cat:'In the Shop',
    cap:'Dark metallic epoxy pooling around walnut cookie inlays mid-pour.', s:210 },
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

async function patch(key, filename, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  const url = `${SUPABASE_URL}/rest/v1/gallery_photos?storage_path=eq.${encodeURIComponent(filename)}`;
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

  // Deduplicate: IMG_1147 appears twice in the list above — remove the second entry
  const seen = new Set();
  const rows = META.filter(r => { if (seen.has(r.f)) return false; seen.add(r.f); return true; });

  let ok = 0, err = 0;
  for (const r of rows) {
    const status = await patch(key, r.f, {
      piece_name: r.name,
      category: r.cat,
      caption: r.cap,
      sort_order: r.s,
    });
    if (status === 204 || status === 200) {
      console.log(`  ✓ ${r.f}`);
      ok++;
    } else {
      console.log(`  ✗ ${r.f} (HTTP ${status})`);
      err++;
    }
  }
  console.log(`\nDone: ${ok} updated, ${err} errors`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
