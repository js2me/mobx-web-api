import {
  createEnhancedAtom,
  type IEnhancedAtom,
  type Ref,
  toRef,
} from 'yummies/mobx';

export interface Fullscreen {
  isSupported: boolean;
  isActive: boolean;
  element: Element | null;
  error?: unknown;
  request(element?: Element | Ref<Element, any>): Promise<boolean>;
  exit(): Promise<boolean>;
  toggle(element?: Element | Ref<Element, any>): Promise<boolean>;
  _atom?: IEnhancedAtom;
}

let fullscreenError: unknown;

const reportError = (error: unknown) => {
  fullscreenError = error;
  fullscreen._atom?.reportChanged();
};

const run = async (operation: () => Promise<void>): Promise<boolean> => {
  try {
    await operation();
    return true;
  } catch (error) {
    reportError(error);
    return false;
  }
};

/**
 * Reactive Fullscreen API for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/fullscreen.html)
 * [MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
 */
export const fullscreen: Fullscreen = {
  get isSupported() {
    const document = globalThis.document;
    const documentElement = document?.documentElement as
      | (Document['documentElement'] & {
          requestFullscreen?: unknown;
        })
      | undefined;

    return Boolean(
      document?.fullscreenEnabled &&
        typeof documentElement?.requestFullscreen === 'function' &&
        typeof document?.exitFullscreen === 'function',
    );
  },
  get isActive() {
    return this.element !== null;
  },
  get element() {
    const document = globalThis.document;

    if (!document) {
      return null;
    }

    if (!this._atom) {
      this._atom = createEnhancedAtom(
        process.env.NODE_ENV === 'production' ? '' : 'fullscreen',
        (atom) => {
          document.addEventListener('fullscreenchange', atom.reportChanged);
          document.addEventListener('fullscreenerror', reportError);
        },
        (atom) => {
          document.removeEventListener('fullscreenchange', atom.reportChanged);
          document.removeEventListener('fullscreenerror', reportError);
        },
      );
    }

    this._atom.reportObserved();
    return document.fullscreenElement;
  },
  request(element?) {
    if (!this.isSupported) {
      return Promise.resolve(false);
    }

    const target =
      element != null
        ? toRef(element).current
        : globalThis.document?.documentElement;

    if (!target?.requestFullscreen) {
      return Promise.resolve(false);
    }

    return run(() => target.requestFullscreen());
  },
  exit() {
    if (!this.isSupported || !globalThis.document?.fullscreenElement) {
      return Promise.resolve(false);
    }

    return run(() => globalThis.document!.exitFullscreen());
  },
  toggle(element) {
    return this.isActive ? this.exit() : this.request(element);
  },
  get error() {
    this.element;
    return fullscreenError;
  },
};
