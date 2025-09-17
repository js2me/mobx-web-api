import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  _atom?: IEnhancedAtom;
}

export const networkStatus: NetworkStatus = {
  get isOnline() {
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
