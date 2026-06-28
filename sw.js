/* 経理メイト サービスワーカー
   index.html（アプリ本体）をキャッシュし、オフラインでも起動できるようにする。
   アプリを更新したら CACHE_VERSION を上げると、次回オンライン時に新版へ入れ替わる。 */
const CACHE_VERSION = "keiri-v1";
const APP_SHELL = "./";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(["./", "./index.html"]).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // ネット優先＋失敗時キャッシュ（最新を取りつつ、オフラインでも開ける）
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
