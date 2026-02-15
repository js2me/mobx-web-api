import { computed, makeObservable } from 'mobx';
import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface MatchMediaTracker {
  matches: boolean;
  _atom: IEnhancedAtom;
}

const matchMediaTrackerFactory = {
  _trackers: new Map<string, MatchMediaTracker>(),
  create(query: string): MatchMediaTracker {
    if (this._trackers.has(query)) {
      return this._trackers.get(query)!;
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
      get matches() {
        this._atom.reportObserved();
        return mediaQueryList.matches;
      },
    };

    this._trackers.set(query, tracker);

    return tracker;
  },
};

/**
 * Reactive media query info API.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/media-query.html)
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
 */
export interface MediaQueryInfo {
  /**
   * Object which contains all posible document sizes.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/media-query.html#sizes)
   */
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
  /**
   * Allows to track for media query (first argument)
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/media-query.html#track-query-string)
   *
   * [MDN Reference](https://developer.mozilla.org/ru/docs/Web/API/Window/matchMedia)
   *
   * @example
   *
   * ```ts
   * console.log(mediaQuery.track("(min-width: 400px)").matches)
   * ```
   */
  track(query: string): MatchMediaTracker;
  /**
   * Short form of [`mediaQuery.track(query).matches`](#track-query-string)
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/media-query.html#match-query-string)
   */
  match(query: string): boolean;
  _atom?: IEnhancedAtom;
}

/**
 * Reactive media query API for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/media-query.html)
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
 */
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
    match(query: string) {
      return matchMediaTrackerFactory.create(query).matches;
    },
  },
  {
    sizes: computed.struct,
  },
);
