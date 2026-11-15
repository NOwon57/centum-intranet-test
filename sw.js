/* 센텀 인트라넷 시험 서버: 화면의 파일 주소(<base>_blob/<id>)를 Supabase 비공개 파일 보관함에서 로그인 정보로 받아 온다.
   파일은 올릴 때마다 새 id라 내용이 바뀌지 않으므로 이 기기에 저장해 두고 다시 쓴다(로그아웃하면 지움). */
const SB_URL = 'https://tgnzmwvfvackjldwngxn.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnptd3ZmdmFja2psZHduZ3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzY1NDEsImV4cCI6MjEwODI1MjU0MX0.YgpXVAHXFibMACKUxGV6UegoZMvTFwSFma_xkdjYHQU';
const TRK_FN = 'swift-endpoint'; /* 의뢰인 파일 함수(대시보드에서 만든 이름) */
const BASE = new URL(self.registration.scope).pathname;
const PFX = BASE + '_blob/';
const CACHE = 'sbx-blobs-v1';
let TOKEN = null;
let CKEY = null; /* 의뢰인 진행 조회: 로그인 대신 조회 키로 그 사람 서류만 받음 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'token') TOKEN = m.token || null;
  else if (m.type === 'client' && /^[0-9a-f]{40}$/.test(m.key || '')) CKEY = m.key;
  else if (m.type === 'claim') self.clients.claim();
  else if (m.type === 'logout') { TOKEN = null; caches.delete(CACHE); }
  else if (m.type === 'forget' && /^[0-9a-f]{32}$/.test(m.id || '')) caches.open(CACHE).then((c) => c.delete(PFX + m.id));
});

async function askToken() {
  const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of cs) {
    const t = await new Promise((res) => {
      const mc = new MessageChannel();
      const to = setTimeout(() => res(null), 1500);
      mc.port1.onmessage = (ev) => { clearTimeout(to); const d = ev.data || {}; if (/^[0-9a-f]{40}$/.test(d.key || '')) CKEY = d.key; res(d.token || null); };
      c.postMessage({ type: 'token?' }, [mc.port2]);
    });
    if (t) return t;
  }
  return null;
}

/* 의뢰인: trk-file 함수가 그 조회 키의 서류인지 확인하고 5분짜리 주소를 준다 */
async function pullClient(id) {
  const a = await fetch(SB_URL + '/functions/v1/' + TRK_FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }, body: JSON.stringify({ action: 'url', key: CKEY, id }) });
  if (!a.ok) return new Response('', { status: 404 });
  const b = await a.json().catch(() => null);
  if (!b || !b.url) return new Response('', { status: 404 });
  return fetch(b.url);
}

async function getBlob(id) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(PFX + id);
  if (hit) return hit;
  const pull = (t) => fetch(SB_URL + '/storage/v1/object/authenticated/blobs/' + id, { headers: { Authorization: 'Bearer ' + t, apikey: SB_KEY } });
  let t = TOKEN || (TOKEN = await askToken());
  let r = t ? await pull(t) : null;
  if (r && !r.ok && r.status !== 404) { TOKEN = await askToken(); r = TOKEN ? await pull(TOKEN) : null; } /* 로그인 정보가 바뀐 경우 한 번 더 */
  if (!r && CKEY) r = await pullClient(id);
  if (!r) return new Response('로그인이 필요합니다.', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  if (!r.ok) return new Response('파일을 찾을 수 없습니다.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const type = r.headers.get('Content-Type') || 'application/octet-stream';
  const body = await r.blob();
  const res = new Response(body, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=31536000, immutable' } });
  try { await cache.put(PFX + id, res.clone()); } catch (e) {}
  return res;
}

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || !u.pathname.startsWith(PFX) || e.request.method !== 'GET') return;
  const id = u.pathname.slice(PFX.length);
  if (!/^[0-9a-f]{32}$/.test(id)) return;
  e.respondWith(getBlob(id).catch(() => new Response('파일을 받지 못했습니다.', { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
});
