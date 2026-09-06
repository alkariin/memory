import { registerSW } from 'virtual:pwa-register';

// The service worker only looks for a new version on a real navigation.
// An installed app resumed from the background never navigates, so ask for
// an update check every time it comes back to the foreground. In autoUpdate
// mode the page reloads on its own once the new version has taken over.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update();
      }
    });
  },
});
