import { createEnhancedAtom, isRef, type Ref, toRef } from 'yummies/mobx';
import { createEmptyDOMRect } from './dom-rect.js';

export type IntersectionDataOptions = Omit<IntersectionObserverInit, 'root'> & {
  root?: Element | Ref<Element, any> | null;
};

export interface IntersectionData {
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRectReadOnly;
  intersectionRect: DOMRectReadOnly;
  rootBounds: DOMRectReadOnly | null;
  isSupported: boolean;
}

/**
 * Creates reactive intersection data for an element or a MobX `Ref`.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/intersection-data.html)
 * [MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
 */
export const createIntersectionData = <TElement extends Element>(
  element: TElement | Ref<TElement, any>,
  options?: IntersectionDataOptions,
): IntersectionData => {
  const elementRef = toRef(element);
  const { root, ...observerOptions } = options ?? {};
  const rootRef = root && isRef(root) ? root : undefined;
  const staticRoot = root && !isRef(root) ? root : null;
  let entry: IntersectionObserverEntry | undefined;
  let observer: IntersectionObserver | undefined;
  let observedElement: TElement | null = null;
  let updateObservedElement: VoidFunction = () => undefined;
  let updateObserver: VoidFunction = () => undefined;

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
          atom.reportChanged();
        }
      };

      updateObserver = () => {
        observer?.disconnect();
        observer = new globalThis.IntersectionObserver(
          ([nextEntry]) => {
            if (nextEntry) {
              entry = nextEntry;
              atom.reportChanged();
            }
          },
          {
            ...observerOptions,
            root: rootRef?.current ?? staticRoot,
          },
        );

        if (observedElement) {
          observer.observe(observedElement);
        } else {
          updateObservedElement();
        }
      };

      if (typeof globalThis.IntersectionObserver === 'function') {
        updateObserver();
      }

      elementRef.listeners.add(updateObservedElement);
      rootRef?.listeners.add(updateObserver);
    },
    () => {
      elementRef.listeners.delete(updateObservedElement);
      rootRef?.listeners.delete(updateObserver);
      if (observedElement) {
        observer?.unobserve(observedElement);
      }
      observer?.disconnect();
      observer = undefined;
      observedElement = null;
    },
  );

  return {
    get isIntersecting() {
      atom.reportObserved();
      return entry?.isIntersecting ?? false;
    },
    get intersectionRatio() {
      atom.reportObserved();
      return entry?.intersectionRatio ?? 0;
    },
    get boundingClientRect() {
      atom.reportObserved();
      return entry?.boundingClientRect ?? createEmptyDOMRect();
    },
    get intersectionRect() {
      atom.reportObserved();
      return entry?.intersectionRect ?? createEmptyDOMRect();
    },
    get rootBounds() {
      atom.reportObserved();
      return entry?.rootBounds ?? null;
    },
    get isSupported() {
      return typeof globalThis.IntersectionObserver === 'function';
    },
  };
};
