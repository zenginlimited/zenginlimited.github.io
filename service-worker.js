const CACHE_VERSION = 1;
const OFFLINE_CACHE = "offline_cache_" + CACHE_VERSION;
const OFFLINE_PATHNAME = "/"; // "/offline/";
const OFFLINE_RESOURCES = [
	OFFLINE_PATHNAME,
	"/script.js",
	// "/favicon-disabled.ico",
	// "/styles/default.css",
	// "/styles/light.css",
	// "/styles/dark.css"
	"/style.css"
];

self.addEventListener('install', function (event) {
	event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => {
		cache.addAll(OFFLINE_RESOURCES).then(() =>
			self.skipWaiting()
		);
	}));
	event.waitUntil(caches.keys().then(keys => keys.filter(key => key != OFFLINE_CACHE)).then(keys => {
		return Promise.all(keys.map(key =>
			caches.delete(key)
		))
	}))
});

self.addEventListener('activate', function (event) {
	event.waitUntil(self.registration.navigationPreload.enable());
	event.waitUntil(self.clients.claim())
});

self.addEventListener('fetch', function (event) {
	navigator.onLine || event.preventDefault();
	switch (event.request.method) {
	case 'GET':
		return event.respondWith(fetchResponse(event).catch(() =>
			caches.open(OFFLINE_CACHE).then(cache =>
				cache.match(event.request.url).then(res =>
					res || cache.match(OFFLINE_PATHNAME)
				)
			)
		))
	}
});

async function fetchResponse(event) {
	const cachedResponse = await caches.match(event.request);
	const response = await event.preloadResponse;
	return cachedResponse || response || fetch(event.request)
}