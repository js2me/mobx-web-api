import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

/**
 * Browser preferred color scheme.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/color-scheme)
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
 */
export type ColorSchemeType = 'dark' | 'light' | 'no-preference';

/**
 * Reactive preferred color scheme API.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/color-scheme)
 * [MDN Window.matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
 */
export interface ColorScheme {
  /**
   * Current system color scheme.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/color-scheme#scheme)
   * [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
   */
  scheme: ColorSchemeType;
  /**
   * Shortcut for `scheme === "dark"`.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/color-scheme#isdark)
   */
  isDark: boolean;
  /**
   * Shortcut for `scheme === "light"`.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/color-scheme#islight)
   */
  isLight: boolean;
  /**
   * Shortcut for `scheme === "no-preference"`.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/color-scheme#isnopreference)
   */
  isNoPreference: boolean;
  _atom?: IEnhancedAtom;
}

/**
 * Reactive color scheme state for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/color-scheme)
 * [MDN Window.matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
 */
export const colorScheme: ColorScheme = {
  get scheme() {
    if (!globalThis.matchMedia) {
      return 'no-preference';
    }

    const darkMedia = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const lightMedia = globalThis.matchMedia('(prefers-color-scheme: light)');

    if (!this._atom) {
      this._atom = createEnhancedAtom(
        process.env.NODE_ENV === 'production' ? '' : 'colorScheme',
        (atom) => {
          darkMedia.addEventListener('change', atom.reportChanged);
          lightMedia.addEventListener('change', atom.reportChanged);
        },
        (atom) => {
          darkMedia.removeEventListener('change', atom.reportChanged);
          lightMedia.removeEventListener('change', atom.reportChanged);
        },
      );
    }

    this._atom.reportObserved();

    if (darkMedia.matches) {
      return 'dark';
    }

    if (lightMedia.matches) {
      return 'light';
    }

    return 'no-preference';
  },
  get isDark() {
    return this.scheme === 'dark';
  },
  get isLight() {
    return this.scheme === 'light';
  },
  get isNoPreference() {
    return this.scheme === 'no-preference';
  },
};
