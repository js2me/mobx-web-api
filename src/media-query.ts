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

export interface MediaQueryInfo {
  sizes: {
    inner: {
      /**
       * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth)
       */
      width: number;
      /**
       * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/innerHeight)
       */
      height: number;
    };
    outer: {
      /**
       * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/outerWidth)
       */
      width: number;
      /**
       * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/outerHeight)
       */
      height: number;
    };
    client: {
      /**
       *  **document?.documentElement?.clientWidth**
       *
       *  [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Element/clientWidth)
       */
      width: number;
      /**
       *  **document?.documentElement?.clientHeight**
       *
       *  [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Element/clientHeight)
       */
      height: number;
    };
    offset: {
      /**
       *  **document?.documentElement?.offsetWidth**
       *
       *  [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth)
       */
      width: number;
      /**
       *  **document?.documentElement?.offsetHeight**
       *
       *  [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight)
       */
      height: number;
    };
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
            globalThis.addEventListener?.('resize', atom.reportChanged);
          },
          (atom) => {
            globalThis.removeEventListener?.('resize', atom.reportChanged);
          },
        );
      }

      this._atom.reportObserved();

      return {
        inner: {
          width: globalThis.innerWidth ?? 0,
          height: globalThis.innerHeight ?? 0,
        },
        outer: {
          width: globalThis.outerWidth ?? 0,
          height: globalThis.outerHeight ?? 0,
        },
        client: {
          width: globalThis.document?.documentElement?.clientWidth ?? 0,
          height: globalThis.document?.documentElement?.clientHeight ?? 0,
        },
        offset: {
          width: globalThis.document?.documentElement?.offsetWidth ?? 0,
          height: globalThis.document?.documentElement?.offsetHeight ?? 0,
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
