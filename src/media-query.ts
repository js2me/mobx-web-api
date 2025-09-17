import { computed, type IAtom, makeObservable } from 'mobx';
import { createEnhancedAtom } from 'yummies/mobx';

export interface MediaQuerySize {
  width: number;
  height: number;
}

export interface MediaQueryInfo {
  sizes: {
    inner: MediaQuerySize;
    outer: MediaQuerySize;
    client: MediaQuerySize;
  };
  track(): void;
  _atom?: IAtom;
}

export const mediaQuery = makeObservable<MediaQueryInfo>(
  {
    get sizes() {
      if (!this._atom) {
        this._atom = createEnhancedAtom(
          process.env.NODE_ENV === 'production' ? '' : 'mediaQuery_sizes',
          (atom) => {
            globalThis.addEventListener('resize', atom.reportChanged);
          },
          (atom) => {
            globalThis.removeEventListener('resize', atom.reportChanged);
          },
        );
      }

      this._atom.reportObserved();

      return {
        inner: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        outer: {
          width: window.outerWidth,
          height: window.outerHeight,
        },
        client: {
          width: globalThis.document?.documentElement?.clientWidth ?? 0,
          height: globalThis.document?.documentElement?.clientHeight ?? 0,
        },
      };
    },
    track() {},
  },
  {
    sizes: computed.struct,
  },
);
