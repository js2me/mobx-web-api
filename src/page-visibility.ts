import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface PageVisibility {
  isVisible: boolean;
  isHidden: boolean;
  _atom?: IEnhancedAtom;
}

export const pageVisibility: PageVisibility = {
  get isVisible() {
    if (!this._atom) {
      this._atom = createEnhancedAtom(
        process.env.NODE_ENV === 'production' ? '' : 'pageVisibility',
        (atom) =>
          document.addEventListener('visibilitychange', atom.reportChanged),
        (atom) => {
          document.removeEventListener('visibilitychange', atom.reportChanged);
        },
      );
    }

    this._atom.reportObserved();

    return document.visibilityState === 'visible';
  },
  get isHidden() {
    return !this.isVisible;
  },
};
