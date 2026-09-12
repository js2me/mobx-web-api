import { createEnhancedAtom, type Ref, toRef } from 'yummies/mobx';
import { createEmptyDOMRect } from './dom-rect.js';

export interface ResizeData {
  width: number;
  height: number;
  rect: DOMRectReadOnly;
  isSupported: boolean;
}

/**
 * Creates reactive size data for an element or a MobX `Ref`.
 *
 * The underlying `ResizeObserver` is created lazily while the returned data is
 * observed and disconnected when it is no longer observed.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/resize-data.html)
 * [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
 */
export const createResizeData = <TElement extends Element>(
  element: TElement | Ref<TElement, any>,
): ResizeData => {
  const elementRef = toRef(element);
  let contentRect = createEmptyDOMRect();
  let observer: ResizeObserver | undefined;
  let observedElement: TElement | null = null;
  let updateObservedElement: VoidFunction = () => undefined;

  const atom = createEnhancedAtom(
    '',
    () => {
      updateObservedElement = () => {
        const nextElement = elementRef.current;

        if (nextElement === observedElement) {
          return;
        }

        if (observedElement) {
          observer?.unobserve(observedElement);
        }

        observedElement = nextElement;
        if (observedElement) {
          observer?.observe(observedElement);
          const rect = observedElement.getBoundingClientRect();
          contentRect = rect;
          atom.reportChanged();
        }
      };

      if (typeof globalThis.ResizeObserver === 'function') {
        observer = new globalThis.ResizeObserver(([entry]) => {
          if (entry) {
            contentRect = entry.contentRect;
            atom.reportChanged();
          }
        });
        updateObservedElement();
      }

      elementRef.listeners.add(updateObservedElement);
    },
    () => {
      elementRef.listeners.delete(updateObservedElement);
      if (observedElement) {
        observer?.unobserve(observedElement);
      }
      observer?.disconnect();
      observer = undefined;
      observedElement = null;
    },
  );

  return {
    get width() {
      atom.reportObserved();
      return contentRect.width;
    },
    get height() {
      atom.reportObserved();
      return contentRect.height;
    },
    get rect() {
      atom.reportObserved();
      return contentRect;
    },
    get isSupported() {
      return typeof globalThis.ResizeObserver === 'function';
    },
  };
};
