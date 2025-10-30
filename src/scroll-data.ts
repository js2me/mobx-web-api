import { createEnhancedAtom, createRef, isRef, type Ref } from 'yummies/mobx';
import type { Maybe } from 'yummies/utils/types';

type InternalScrollData = {
  top: number;
  left: number;
  width: number;
  height: number;
  scrollY: number;
  scrollX: number;
  scrollHeight: number;
  scrollWidth: number;
};

export type ScrollDataMapperConfig = Record<
  string,
  (internalScrollData: InternalScrollData) => any
>;

export type ScrollData<TMapperConfig extends ScrollDataMapperConfig = {}> = {
  [K in keyof TMapperConfig]: ReturnType<TMapperConfig[K]>;
} & InternalScrollData;

export const createScrollData = <TMappedData extends ScrollDataMapperConfig>(
  element: HTMLElement | Ref<HTMLElement>,
  opts?: {
    scrollingElement?: Window | HTMLElement | Ref<HTMLElement | Window>;
    mapper?: TMappedData;
  },
): ScrollData<TMappedData> => {
  let lastUsedScrollingElement: Maybe<HTMLElement | Window>;

  const { mapper = {}, scrollingElement = globalThis.window } = opts ?? {};

  const elementRef = isRef<HTMLElement>(element)
    ? element
    : createRef({ initial: element });

  const scrollingElementRef = isRef<HTMLElement | Window>(scrollingElement)
    ? scrollingElement
    : createRef({ initial: scrollingElement });

  const collectScrollData = () => {
    const internalScrollData = {
      top: elementRef.current?.scrollTop ?? 0,
      left: elementRef.current?.scrollLeft ?? 0,
      width: elementRef.current?.scrollWidth ?? 0,
      height: elementRef.current?.scrollHeight ?? 0,
      scrollY: 0,
      scrollX: 0,
      scrollHeight: 0,
      scrollWidth: 0,
    };

    if (!scrollingElementRef.current) {
      return internalScrollData;
    }

    if ('scrollY' in scrollingElementRef.current) {
      internalScrollData.scrollY = scrollingElementRef.current?.scrollY ?? 0;
      internalScrollData.scrollX = scrollingElementRef.current?.scrollX ?? 0;
      internalScrollData.scrollHeight = scrollingElementRef.current.innerHeight;
      internalScrollData.scrollWidth = scrollingElementRef.current.innerWidth;
    } else {
      internalScrollData.scrollY = scrollingElementRef.current?.scrollTop ?? 0;
      internalScrollData.scrollX = scrollingElementRef.current?.scrollLeft ?? 0;
      internalScrollData.scrollHeight =
        scrollingElementRef.current?.scrollHeight ?? 0;
      internalScrollData.scrollWidth =
        scrollingElementRef.current?.scrollWidth ?? 0;
    }
    return internalScrollData;
  };

  const elementScrollData = collectScrollData();

  const updateHandler = () => {
    let changed = false;

    Object.entries(collectScrollData()).forEach(([key, value]) => {
      // @ts-expect-error
      if (elementScrollData[key] !== value) {
        // @ts-expect-error
        elementScrollData[key] = value;
        changed = true;
      }
    });

    if (changed) {
      atom.reportChanged();
    }
  };

  const updateListeners = (scrollingElement: Maybe<HTMLElement | Window>) => {
    if (lastUsedScrollingElement) {
      lastUsedScrollingElement.removeEventListener('scroll', updateHandler);
      lastUsedScrollingElement.removeEventListener('resize', updateHandler);
    }

    if (scrollingElement) {
      lastUsedScrollingElement = scrollingElement;
      lastUsedScrollingElement.addEventListener('scroll', updateHandler);
      lastUsedScrollingElement.addEventListener('resize', updateHandler);
    } else {
      lastUsedScrollingElement = null;
    }
  };

  const atom = createEnhancedAtom(
    '',
    () => {
      updateListeners(scrollingElementRef.current);
      scrollingElementRef.listeners.add(atom.reportChanged);
      scrollingElementRef.listeners.add(updateListeners);
      elementRef.listeners.add(atom.reportChanged);
    },
    () => {
      scrollingElementRef.listeners.delete(atom.reportChanged);
      scrollingElementRef.listeners.delete(updateListeners);
      elementRef.listeners.delete(atom.reportChanged);
      updateListeners(null);
    },
  );

  return new Proxy(
    {},
    {
      get(_, property) {
        atom.reportObserved();
        return (
          // @ts-expect-error
          elementScrollData[property] ?? mapper[property]?.(elementScrollData)
        );
      },
    },
  ) as ScrollData<TMappedData>;
};
