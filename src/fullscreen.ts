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
  request(element: Element | Ref<Element, any>): Promise<void>;
  exit(): Promise<void>;
  toggle(element: Element | Ref<Element, any>): Promise<void>;
  _atom?: IEnhancedAtom;
}

const getDocument = () => globalThis.document;

const createUnsupportedError = () =>
  new Error('Fullscreen API is not supported');

let fullscreenError: unknown;

const reportError = (error: unknown) => {
  fullscreenError = error;
  fullscreen._atom?.reportChanged();
};

/**
 * Reactive Fullscreen API for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/fullscreen.html)
 * [MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
 */
export const fullscreen: Fullscreen = {
  get isSupported() {
    const document = getDocument();
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
    const document = getDocument();

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
  async request(element) {
    if (!this.isSupported) {
      const error = createUnsupportedError();
      reportError(error);
      throw error;
    }

    const target = toRef(element).current;
    if (!target?.requestFullscreen) {
      const error = new Error('Fullscreen target is not available');
      reportError(error);
      throw error;
    }

    try {
      await target.requestFullscreen();
    } catch (error) {
      reportError(error);
      throw error;
    }
  },
  async exit() {
    if (!this.isSupported || !getDocument()?.fullscreenElement) {
      return;
    }

    try {
      await getDocument()!.exitFullscreen();
    } catch (error) {
      reportError(error);
      throw error;
    }
  },
  async toggle(element) {
    if (this.isActive) {
      await this.exit();
    } else {
      await this.request(element);
    }
  },
  get error() {
    this.element;
    return fullscreenError;
  },
};
