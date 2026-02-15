import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

/**
 * Reactive network status API.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/network-status.html)
 * [MDN Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
 */
export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  _atom?: IEnhancedAtom;
}

/**
 * Reactive network online/offline state for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/network-status.html)
 * [MDN Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
 */
export const networkStatus: NetworkStatus = {
  get isOnline() {
    if (!globalThis.navigator) {
      return true;
    }

    if (!this._atom) {
      this._atom = createEnhancedAtom(
        process.env.NODE_ENV === 'production' ? '' : 'networkStatus',
        (atom) => {
          globalThis.addEventListener('online', atom.reportChanged);
          globalThis.addEventListener('offline', atom.reportChanged);
        },
        (atom) => {
          globalThis.removeEventListener('online', atom.reportChanged);
          globalThis.removeEventListener('offline', atom.reportChanged);
        },
      );
    }

    this._atom.reportObserved();

    return globalThis.navigator.onLine;
  },
  get isOffline() {
    return !this.isOnline;
  },
};
