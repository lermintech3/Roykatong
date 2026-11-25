// Cloudflare Pages Function: /api/krathongs
// ต้องผูก D1 database กับโปรเจกต์ Pages โดยตั้ง Variable name = DB
// ตารางจะถูกสร้างให้อัตโนมัติในการเรียกครั้งแรก

const STYLES = ['leaf', 'lotus', 'bread', 'crown'];
const FLOWERS = ['marigold', 'rose', 'orchid', 'jasmine', 'lotus'];
const CANDLES = ['white', 'bee', 'pink'];
const SHOW = 60;            // จำนวนกระทงล่าสุดที่ส่งให้หน้าเว็บ
const LIMIT = 5;            // ลอยได้กี่กระทงต่อ IP ...
const WINDOW_MS = 10 * 60e3; // ... ในช่วง 10 นาที

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

let ready = false;
async function init(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS krathongs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      k TEXT UNIQUE NOT NULL,
      n TEXT NOT NULL,
      w TEXT NOT NULL,
      s TEXT NOT NULL,
      f TEXT NOT NULL,
      c TEXT NOT NULL,
      t INTEGER NOT NULL,
      ip TEXT,
      hidden INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS krathongs_t ON krathongs (t)'),
    db.prepare('CREATE INDEX IF NOT EXISTS krathongs_ip_t ON krathongs (ip, t)'),
  ]);
  ready = true;
}

async function list(db) {
  const { results } = await db
    .prepare('SELECT k, n, w, s, f, c, t FROM krathongs WHERE hidden = 0 ORDER BY t DESC LIMIT ?')
    .bind(SHOW)
    .all();
  const row = await db.prepare('SELECT COUNT(*) AS total FROM krathongs').first();
  return { items: results || [], total: row ? row.total : 0 };
}

async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + ip));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: 'no_database' }, 503);
  await init(env.DB);
  return json(await list(env.DB));
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'no_database' }, 503);
  await init(env.DB);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'bad_json' }, 400);

  const k = text(body.k, 24).replace(/[^\w-]/g, '');
  const n = text(body.n, 30) || 'ผู้ไม่ประสงค์ออกนาม';
  const w = text(body.w, 160);
  if (!k || !w) return json({ error: 'invalid' }, 400);
  const s = STYLES.includes(body.s) ? body.s : 'leaf';
  const f = FLOWERS.includes(body.f) ? body.f : 'marigold';
  const c = CANDLES.includes(body.c) ? body.c : 'white';

  const now = Date.now();
  const ip = await hashIp(request.headers.get('cf-connecting-ip') || 'unknown', env.SALT || 'loykrathong');
  const recent = await env.DB
    .prepare('SELECT COUNT(*) AS c FROM krathongs WHERE ip = ? AND t > ?')
    .bind(ip, now - WINDOW_MS)
    .first();
  if (recent && recent.c >= LIMIT) return json({ error: 'slow_down' }, 429);

  await env.DB
    .prepare('INSERT OR IGNORE INTO krathongs (k, n, w, s, f, c, t, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(k, n, w, s, f, c, now, ip)
    .run();

  return json({ ok: true, ...(await list(env.DB)) });
}
