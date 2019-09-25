import Store from './Store';

const store = new Store();

let stopLiveTimer = null;
function handleVisibilityChange() {
  // Stop live if user changes tabs for over a specified time
  if (document.hidden && store.isLive) {
    const delay = 1000 * 60 * 5; // 5 minutes
    stopLiveTimer = setTimeout(store.stopLive, delay);
  }

  // Cancel if user comes back before timer runs out
  if (!document.hidden && stopLiveTimer !== null) {
    clearTimeout(stopLiveTimer);
    stopLiveTimer = null;
  }
}

async function initStore() {
  if (typeof document.addEventListener === 'undefined' || typeof document.hidden === 'undefined') {
    console.error('Page Visibility API is not supported on this browser.');
  } else {
    document.addEventListener('visibilitychange', handleVisibilityChange, false);
  }
  // First check if session is alive
  await store.checkLogin();
}

initStore();

export default store;
