import { createEnhancedAtom } from 'yummies/mobx';

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
  element: HTMLElement,
  opts?: {
    scrollingElement?: Window | HTMLElement;
    mapper?: TMappedData;
  },
): ScrollData<TMappedData> => {
  const scrollingElement = opts?.scrollingElement || window;
  const mapper = opts?.mapper ?? {};

  const collectScrollData = () => {
    const internalScrollData = {
      top: element.scrollTop,
      left: element.scrollLeft,
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollY: 0,
      scrollX: 0,
      scrollHeight: 0,
      scrollWidth: 0,
    };

    if ('scrollY' in scrollingElement) {
      internalScrollData.scrollY = scrollingElement.scrollY;
      internalScrollData.scrollX = scrollingElement.scrollX;
      internalScrollData.scrollHeight = scrollingElement.innerHeight;
      internalScrollData.scrollWidth = scrollingElement.innerWidth;
    } else {
      internalScrollData.scrollY = scrollingElement.scrollTop;
      internalScrollData.scrollX = scrollingElement.scrollLeft;
      internalScrollData.scrollHeight = scrollingElement.scrollHeight;
      internalScrollData.scrollWidth = scrollingElement.scrollWidth;
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

  const atom = createEnhancedAtom(
    '',
    () => {
      scrollingElement.addEventListener('scroll', updateHandler);
      scrollingElement.addEventListener('resize', updateHandler);
    },
    () => {
      scrollingElement.removeEventListener('scroll', updateHandler);
      scrollingElement.removeEventListener('resize', updateHandler);
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
