import { isRef, type Ref } from 'yummies/mobx';
import { createEmptyDOMRect } from './dom-rect.js';
import {
  createElementDataController,
  createElementDataEntry,
  type ElementDataController,
} from './utils/element-data.js';

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

export type IntersectionDataController =
  ElementDataController<IntersectionData>;

const createIntersectionDataEntry = (
  element: Element | Ref<Element, any>,
  options: IntersectionDataOptions = {},
) => {
  const { root, ...observerOptions } = options;
  const rootRef = root && isRef(root) ? root : undefined;
  const staticRoot = root && !isRef(root) ? root : null;
  let entry: IntersectionObserverEntry | undefined;

  return createElementDataEntry(element, {
    createData: (reportObserved): IntersectionData => ({
      get isIntersecting() {
        reportObserved();
        return entry?.isIntersecting ?? false;
      },
      get intersectionRatio() {
        reportObserved();
        return entry?.intersectionRatio ?? 0;
      },
      get boundingClientRect() {
        reportObserved();
        return entry?.boundingClientRect ?? createEmptyDOMRect();
      },
      get intersectionRect() {
        reportObserved();
        return entry?.intersectionRect ?? createEmptyDOMRect();
      },
      get rootBounds() {
        reportObserved();
        return entry?.rootBounds ?? null;
      },
      get isSupported() {
        return typeof globalThis.IntersectionObserver === 'function';
      },
    }),
    observe: (target, reportChanged) => {
      if (typeof globalThis.IntersectionObserver !== 'function') {
        return () => undefined;
      }

      let isActive = true;
      const observer = new globalThis.IntersectionObserver(
        ([nextEntry]) => {
          if (nextEntry && isActive) {
            entry = nextEntry;
            reportChanged();
          }
        },
        {
          ...observerOptions,
          root: rootRef?.current ?? staticRoot,
        },
      );

      observer.observe(target);
      return () => {
        isActive = false;
        observer.unobserve(target);
        observer.disconnect();
      };
    },
    dependencies: rootRef ? [rootRef as Ref<Element, any>] : undefined,
    onDispose: () => {
      entry = undefined;
    },
  });
};

/** Creates a controller for explicitly observing and unobserving elements. */
export function createIntersectionData(
  target: null,
  options?: IntersectionDataOptions,
): IntersectionDataController;
/**
 * Creates reactive intersection data for multiple elements or MobX `Ref`s.
 *
 * Each returned item corresponds to the element at the same index.
 */
export function createIntersectionData<TElement extends Element>(
  elements: readonly (TElement | Ref<TElement, any>)[],
  options?: IntersectionDataOptions,
): IntersectionData[];
/**
 * Creates reactive intersection data for an element or a MobX `Ref`.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/intersection-data.html)
 * [MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
 */
export function createIntersectionData<TElement extends Element>(
  element: TElement | Ref<TElement, any>,
  options?: IntersectionDataOptions,
): IntersectionData;
export function createIntersectionData<TElement extends Element>(
  target:
    | null
    | TElement
    | Ref<TElement, any>
    | readonly (TElement | Ref<TElement, any>)[],
  options?: IntersectionDataOptions,
): IntersectionDataController | IntersectionData | IntersectionData[] {
  const controller = createElementDataController((element) =>
    createIntersectionDataEntry(element, options),
  );

  if (target === null) {
    return controller;
  }

  if (Array.isArray(target)) {
    return target.map((element) => controller.observe(element));
  }

  return controller.observe(target as TElement | Ref<TElement, any>);
}
