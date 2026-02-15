import {
  computed,
  type IComputedValue,
  makeObservable,
  observable,
} from 'mobx';
import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';
import type { Maybe } from 'yummies/types';

export interface PreferredLanguages {
  _atom?: IEnhancedAtom<{
    headerLanguage: IComputedValue<globalThis.NavigatorLanguage | null>;
  }>;
  /**
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/preferred-languages#acceptlanguageheader)
   */
  acceptLanguageHeader?: Maybe<string>;
  /**
   * current language from user's system
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/preferred-languages#current)
   */
  readonly current: globalThis.NavigatorLanguage['language'];
  /**
   * all languages from user's system
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/preferred-languages#all)
   */
  readonly all: globalThis.NavigatorLanguage['languages'];
}

const keysMapping = [
  ['current', 'language'],
  ['all', 'languages'],
] as const satisfies [
  keyof PreferredLanguages,
  keyof globalThis.NavigatorLanguage,
][];

/**
 * Reactive preferred languages information for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/preferred-languages.html)
 * [MDN NavigatorLanguage](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage)
 */
export const preferredLanguages = makeObservable(
  keysMapping.reduce(
    (acc, [mappingKey, navigatorKey]) => {
      Object.defineProperty(acc, mappingKey, {
        get() {
          if (!acc._atom) {
            acc._atom = createEnhancedAtom<{
              headerLanguage: IComputedValue<globalThis.NavigatorLanguage | null>;
            }>(
              process.env.NODE_ENV === 'production' ? '' : 'languages',
              (atom) => {
                globalThis.addEventListener(
                  'languagechange',
                  atom.reportChanged,
                );
              },
              (atom) => {
                globalThis.removeEventListener(
                  'languagechange',
                  atom.reportChanged,
                );
              },
              {
                headerLanguage: computed(
                  (): globalThis.NavigatorLanguage | null => {
                    if (!acc.acceptLanguageHeader) {
                      return null;
                    }

                    const languages = acc.acceptLanguageHeader
                      .split(',')
                      .map((lang) => lang.split(';')[0]?.trim())
                      .filter((lang) => lang && lang !== '*');

                    if (!languages.length) {
                      return null;
                    }

                    return {
                      language: languages[0],
                      languages: languages,
                    };
                  },
                ),
              },
            );
          }

          acc._atom.reportObserved();

          const headerLanguage = acc._atom.meta.headerLanguage.get();

          const language = headerLanguage ?? globalThis.navigator;

          return language[navigatorKey];
        },
      });

      return acc;
    },
    {
      acceptLanguageHeader: undefined,
    } as PreferredLanguages,
  ),
  {
    acceptLanguageHeader: observable.ref,
  },
);
