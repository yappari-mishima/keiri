/* 経理メイト サービスワーカー
   index.html（アプリ本体）をキャッシュし、オフラインでも起動できるようにする。
   アプリを更新したら CACHE_VERSION を上げると、次回オンライン時に新版へ入れ替わる。

   【重要・v9での修正】
   以前は「すべての通信」をキャッシュしていたため、GAS（クラウド保存先）からの
   データ読込まで保存されていた。起動時に通信が一瞬でも不安定だと、何日も前の
   古い応答をキャッシュから返してしまい、アプリが古いデータを表示し続ける事故が
   起きた（2026年8月・8月分の日報が表示されない不具合）。
   そのため、自分のサイト以外への通信（GAS・天気API）はキャッシュに一切関与しない。
   この安全装置は外さないこと。 */
const CACHE_VERSION = "keiri-multi-v9";
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

  // 【安全装置】自分のサイト以外（GAS・天気APIなど）は素通しする。
  // respondWith を呼ばなければ、ブラウザが普通に通信し、キャッシュも一切残らない。
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  // 念のため、GASのURLが同一オリジン扱いになる環境でも除外する
  if (url.hostname.indexOf("script.google.com") >= 0) return;

  // ここから下は自分のサイトのファイルのみ。
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
