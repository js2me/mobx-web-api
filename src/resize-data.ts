import type { Ref } from 'yummies/mobx';
import { createEmptyDOMRect } from './dom-rect.js';
import {
  createElementDataController,
  createElementDataEntry,
  type ElementDataController,
} from './utils/element-data.js';

export interface ResizeData {
  width: number;
  height: number;
  rect: DOMRectReadOnly;
  isSupported: boolean;
}

export type ResizeDataController = ElementDataController<ResizeData>;

const createResizeDataEntry = (element: Element | Ref<Element, any>) => {
  let contentRect = createEmptyDOMRect();

  return createElementDataEntry(element, {
    createData: (reportObserved): ResizeData => ({
      get width() {
        reportObserved();
        return contentRect.width;
      },
      get height() {
        reportObserved();
        return contentRect.height;
      },
      get rect() {
        reportObserved();
        return contentRect;
      },
      get isSupported() {
        return typeof globalThis.ResizeObserver === 'function';
      },
    }),
    observe: (target, reportChanged) => {
      if (typeof globalThis.ResizeObserver !== 'function') {
        return () => undefined;
      }

      let isActive = true;
      const observer = new globalThis.ResizeObserver(([entry]) => {
        if (entry && isActive) {
          contentRect = entry.contentRect;
          reportChanged();
        }
      });

      observer.observe(target);
      contentRect = target.getBoundingClientRect();
      reportChanged();

      return () => {
        isActive = false;
        observer.unobserve(target);
        observer.disconnect();
      };
    },
    onDispose: () => {
      contentRect = createEmptyDOMRect();
    },
  });
};

/** Creates a controller for explicitly observing and unobserving elements. */
export function createResizeData(target: null): ResizeDataController;
/**
 * Creates reactive size data for multiple elements or MobX `Ref`s.
 *
 * Each returned item corresponds to the element at the same index.
 */
export function createResizeData<TElement extends Element>(
  elements: readonly (TElement | Ref<TElement, any>)[],
): ResizeData[];
/**
 * Creates reactive size data for an element or a MobX `Ref`.
 *
 * The underlying `ResizeObserver` is created lazily while the returned data is
 * observed and disconnected when it is no longer observed.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/resize-data.html)
 * [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
 */
export function createResizeData<TElement extends Element>(
  element: TElement | Ref<TElement, any>,
): ResizeData;
export function createResizeData<TElement extends Element>(
  target:
    | null
    | TElement
    | Ref<TElement, any>
    | readonly (TElement | Ref<TElement, any>)[],
): ResizeDataController | ResizeData | ResizeData[] {
  const controller = createElementDataController(createResizeDataEntry);

  if (target === null) {
    return controller;
  }

  if (Array.isArray(target)) {
    return target.map((element) => controller.observe(element));
  }

  return controller.observe(target as TElement | Ref<TElement, any>);
}
