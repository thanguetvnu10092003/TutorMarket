export const FAVORITES_UPDATED_EVENT = 'student-favorites-updated';

export function dispatchFavoritesUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
}
