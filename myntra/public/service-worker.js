/* ==========================================================================
   Myntra Clone – Service Worker (v2)
   Handles: Web Push notifications, offline caching, background sync
   ========================================================================== */

const CACHE_NAME = "myntra-cache-v2";
const STATIC_ASSETS = ["/", "/index.html"];

// ── Install: pre-cache key assets ──────────────────────────────────────────
self.addEventListener("install", function (event) {
  console.log("[ServiceWorker] Install");
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Pre-cache failed (non-fatal):", err);
      });
    })
  );
});

// ── Activate: clean up old caches ──────────────────────────────────────────
self.addEventListener("activate", function (event) {
  console.log("[ServiceWorker] Activate");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache when offline ────────────────────────────────────
self.addEventListener("fetch", function (event) {
  // Only handle GET requests for static assets; skip API calls
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match("/index.html"));
    })
  );
});

// ── Push: show notification in system tray ─────────────────────────────────
self.addEventListener("push", function (event) {
  console.log("[ServiceWorker] Push received:", event.data ? event.data.text() : "no payload");

  let title = "Myntra";
  let body = "You have a new update!";
  let icon = "/assets/icon.png";
  let badge = "/assets/icon.png";
  let data = {};
  let tag = "myntra-notification";

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      data = payload.data || {};
      if (data.notificationType) tag = `myntra-${data.notificationType}`;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data,
    actions: [
      { action: "open", title: "Open Myntra" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Track delivery in background (best-effort)
      if (data && data.logId) {
        fetch("/api/notifications/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId: data.logId, event: "delivered" }),
        }).catch(() => {});
      }
    })
  );
});

// ── Notification Click: focus or open app ──────────────────────────────────
self.addEventListener("notificationclick", function (event) {
  console.log("[ServiceWorker] Notification clicked:", event.action, event.notification.data);
  event.notification.close();

  if (event.action === "dismiss") return;

  const data = event.notification.data || {};
  let targetUrl = "/";

  if (data.notificationType === "order_update" || data.notificationType === "delivery_alert") {
    targetUrl = "/orders";
  } else if (data.notificationType === "payment_status") {
    targetUrl = "/transaction-history";
  } else if (data.notificationType === "promotional" || data.notificationType === "cart_reminder") {
    targetUrl = "/";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if already open
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(self.location.origin + targetUrl);
      }
    })
  );

  // Track click event (best-effort)
  if (data.logId) {
    fetch("/api/notifications/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId: data.logId, event: "clicked" }),
    }).catch(() => {});
  }
});

// ── Push Subscription Change: re-register automatically ───────────────────
self.addEventListener("pushsubscriptionchange", function (event) {
  console.log("[ServiceWorker] Push subscription changed, re-subscribing...");
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true }).catch((err) => {
      console.error("[ServiceWorker] Failed to re-subscribe:", err);
    })
  );
});
