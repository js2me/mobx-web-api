import { computed, makeObservable } from 'mobx';
import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface MatchMediaTracker {
  matches: boolean;
  _atom: IEnhancedAtom;
}

const matchMediaTrackerFactory = {
  _atoms: new Map<string, MatchMediaTracker>(),
  create(query: string): MatchMediaTracker {
    if (this._atoms.has(query)) {
      return this._atoms.get(query)!;
    }

    const mediaQueryList = globalThis.matchMedia(query);

    const tracker: MatchMediaTracker = {
      _atom: createEnhancedAtom(
        process.env.NODE_ENV === 'production'
          ? ''
          : `matchMediaTracker_${query}`,
        (atom) => {
          mediaQueryList.addEventListener('change', atom.reportChanged);
        },
        (atom) => {
          mediaQueryList.removeEventListener('change', atom.reportChanged);
        },
      ),
      matches: mediaQueryList.matches,
    };

    this._atoms.set(query, tracker);

    return tracker;
  },
};

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
  track(query: string): MatchMediaTracker;
  _atom?: IEnhancedAtom;
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
    track(query: string) {
      return matchMediaTrackerFactory.create(query);
    },
  },
  {
    sizes: computed.struct,
  },
);
