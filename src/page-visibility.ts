import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface PageVisibility {
  isVisible: boolean;
  isHidden: boolean;
  _atom?: IEnhancedAtom;
}

export const pageVisibility: PageVisibility = {
  get isVisible() {
    if (!globalThis.document) {
      return true;
    }

    if (!this._atom) {
      this._atom = createEnhancedAtom(
        process.env.NODE_ENV === 'production' ? '' : 'pageVisibility',
        (atom) =>
          globalThis.document.addEventListener(
            'visibilitychange',
            atom.reportChanged,
          ),
        (atom) => {
          globalThis.document.removeEventListener(
            'visibilitychange',
            atom.reportChanged,
          );
        },
      );
    }

    this._atom.reportObserved();

    return globalThis.document.visibilityState === 'visible';
  },
  get isHidden() {
    return !this.isVisible;
  },
};
