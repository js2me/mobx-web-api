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
    scrollingElement?: Window | HTMLElement | Ref<HTMLElement>;
    mapper?: TMappedData;
  },
): ScrollData<TMappedData> => {
  const scrollingElement = opts?.scrollingElement || window;
  const mapper = opts?.mapper ?? {};

  const elementRef = isRef<HTMLElement>(element)
    ? element
    : createRef({ initial: element });

  const scrollingElementRef: Ref<HTMLElement | Window> = isRef<any>(
    scrollingElement,
  )
    ? scrollingElement
    : createRef<any>({ initial: scrollingElement });

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

  let usedScrollingElement: Maybe<HTMLElement | Window>;

  const setupListeners = (scrollingElement: Maybe<HTMLElement | Window>) => {
    if (scrollingElement) {
      usedScrollingElement = scrollingElement;
      scrollingElement.addEventListener('scroll', updateHandler);
      scrollingElement.addEventListener('resize', updateHandler);
    }
  };

  const atom = createEnhancedAtom(
    '',
    () => {
      if (scrollingElementRef.current) {
        setupListeners(scrollingElementRef.current);
      } else {
        scrollingElementRef.listeners.add(setupListeners);
      }
    },
    () => {
      scrollingElementRef.listeners.delete(setupListeners);

      if (usedScrollingElement) {
        usedScrollingElement.removeEventListener('scroll', updateHandler);
        usedScrollingElement.removeEventListener('resize', updateHandler);
      }
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
