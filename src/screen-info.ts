import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

interface ScreenOrientationInfo
  extends Pick<globalThis.Screen['orientation'], 'angle' | 'type'> {
  _atom?: IEnhancedAtom;
}

const screenOrientationKeys = [
  'angle',
  'type',
] as const satisfies (keyof globalThis.ScreenOrientation)[];

/**
 * The orientation of the screen without methods
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Screen/orientation)
 */
const screenOrientationInfo: ScreenOrientationInfo =
  screenOrientationKeys.reduce((acc, key) => {
    Object.defineProperty(acc, key, {
      get() {
        if (!acc._atom) {
          acc._atom = createEnhancedAtom(
            process.env.NODE_ENV === 'production'
              ? ''
              : 'screen-orientation-info-atom',
            (atom) => {
              globalThis.screen.orientation.addEventListener(
                'change',
                atom.reportChanged,
              );
            },
            (atom) => {
              globalThis.screen.orientation.removeEventListener(
                'change',
                atom.reportChanged,
              );
            },
          );
        }

        acc._atom.reportObserved();
        return globalThis.screen.orientation[key];
      },
    });

    return acc;
  }, {} as ScreenOrientationInfo);

/**
 * A screen, usually the one on which the current window is being rendered, and is obtained using window.screen.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Screen)
 */
export interface ScreenInfo extends Omit<globalThis.Screen, 'orientation'> {
  /**
   * The orientation of the screen without methods
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Screen/orientation)
   */
  readonly orientation: ScreenOrientationInfo;

  _atom?: IEnhancedAtom;
}

const screenKeys = [
  'availWidth',
  'availHeight',
  'colorDepth',
  'height',
  'pixelDepth',
  'width',
  'orientation',
] as const satisfies (keyof globalThis.Screen)[];

export const screenInfo: ScreenInfo = screenKeys.reduce((acc, screenKey) => {
  Object.defineProperty(acc, screenKey, {
    get() {
      if (!acc._atom) {
        acc._atom = createEnhancedAtom(
          process.env.NODE_ENV === 'production' ? '' : 'screen-change-atom',
          (atom) => {
            // @ts-expect-error new api
            globalThis.screen.addEventListener?.('change', atom.reportChanged);
          },
          (atom) => {
            // @ts-expect-error new api
            globalThis.screen.removeEventListener?.(
              'change',
              atom.reportChanged,
            );
          },
        );
      }

      acc._atom.reportObserved();

      if (screenKey === 'orientation') {
        return screenOrientationInfo;
      }

      return globalThis.screen[screenKey as keyof typeof globalThis.screen];
    },
  });

  return acc;
}, {} as ScreenInfo);
