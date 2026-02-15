import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

/**
 * Reactive info based on Visual Viewport API.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/viewport-info.html)
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
 */
export interface ViewportInfo {
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/width) */
  width: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/height) */
  height: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetLeft) */
  offsetLeft: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetTop) */
  offsetTop: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/pageLeft) */
  pageLeft: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/pageTop) */
  pageTop: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/scale) */
  scale: number;
  /** Heuristic flag for mobile keyboard-like overlay (not a native VisualViewport field). */
  isKeyboardLikeOverlay: boolean;
  /** `true` when `window.visualViewport` is available. */
  isSupported: boolean;
  _atom?: IEnhancedAtom;
}

const getViewport = () => globalThis.visualViewport;

const viewportInfoKeys = [
  'width',
  'height',
  'offsetLeft',
  'offsetTop',
  'pageLeft',
  'pageTop',
  'scale',
] as const satisfies (keyof VisualViewport)[];

const viewportInfoRaw = viewportInfoKeys.reduce(
  (acc, viewportKey) => {
    Object.defineProperty(acc, viewportKey, {
      get() {
        const viewport = getViewport();

        if (!viewport) {
          if (viewportKey === 'width') {
            return globalThis.innerWidth ?? 0;
          }

          if (viewportKey === 'height') {
            return globalThis.innerHeight ?? 0;
          }

          if (viewportKey === 'scale') {
            return 1;
          }

          return 0;
        }

        if (!acc._atom) {
          acc._atom = createEnhancedAtom(
            process.env.NODE_ENV === 'production' ? '' : 'viewportInfo',
            (atom) => {
              viewport.addEventListener('resize', atom.reportChanged);
              viewport.addEventListener('scroll', atom.reportChanged);
            },
            (atom) => {
              viewport.removeEventListener('resize', atom.reportChanged);
              viewport.removeEventListener('scroll', atom.reportChanged);
            },
          );
        }

        acc._atom.reportObserved();
        return viewport[viewportKey];
      },
    });

    return acc;
  },
  {
    get isSupported() {
      return Boolean(getViewport());
    },
    get isKeyboardLikeOverlay() {
      const viewportHeight =
        getViewport()?.height ?? globalThis.innerHeight ?? 0;
      const layoutHeight = globalThis.innerHeight ?? viewportHeight;

      // In many mobile browsers an opened keyboard shrinks visual viewport.
      return layoutHeight - viewportHeight > 120;
    },
  } as Omit<
    ViewportInfo,
    keyof Pick<VisualViewport, (typeof viewportInfoKeys)[number]>
  >,
);

/**
 * Reactive VisualViewport state for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/viewport-info.html)
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
 */
export const viewportInfo: ViewportInfo = viewportInfoRaw as ViewportInfo;
