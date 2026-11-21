export const ACCOUNT_STATUS_STORAGE_KEY = 'account-status-updated';
const STATUS_EVENT = 'account-status-changed';

export function notifyAccountStatusChanged() {
  window.dispatchEvent(new Event(STATUS_EVENT));
  try {
    // Notify other tabs without storing account or enterprise information.
    window.localStorage.setItem(
      ACCOUNT_STATUS_STORAGE_KEY,
      `${Date.now()}:${Math.random()}`,
    );
  } catch {
    // Same-tab refresh still works when browser storage is unavailable.
  }
}

export function subscribeToAccountStatusChanges(refresh: () => void) {
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCOUNT_STATUS_STORAGE_KEY) onVisible();
  };
  window.addEventListener(STATUS_EVENT, onVisible);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', onVisible);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener(STATUS_EVENT, onVisible);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', onVisible);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
