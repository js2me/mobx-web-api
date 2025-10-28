import { createEnhancedAtom } from 'yummies/mobx';

export type ScrollDataMapperConfig = Record<string, (scrollTop: number) => any>;

export type ScrollData<TMapperConfig extends ScrollDataMapperConfig = {}> = {
  [K in keyof TMapperConfig]: ReturnType<TMapperConfig[K]>;
} & {
  scrollTop: number;
};

export const createScrollData = <TMappedData extends ScrollDataMapperConfig>(
  element: HTMLElement,
  opts?: {
    scrollingElement?: Window | HTMLElement | Document;
    mapper?: TMappedData;
  },
): ScrollData<TMappedData> => {
  const scrollingElement = opts?.scrollingElement || window;
  const mapper = opts?.mapper ?? {};

  let lastScrollTop = element.scrollTop;

  const scrollHandler = () => {
    if (lastScrollTop !== element.scrollTop) {
      lastScrollTop = element.scrollTop;
      atom.reportChanged();
    }
  };

  const atom = createEnhancedAtom(
    '',
    () => {
      scrollingElement.addEventListener('scroll', scrollHandler);
    },
    () => {
      scrollingElement.removeEventListener('scroll', scrollHandler);
    },
  );

  return new Proxy(
    {},
    {
      get(_, property) {
        atom.reportObserved();

        if (property === 'scrollTop') {
          return lastScrollTop;
        }

        return (mapper as TMappedData)[property as keyof TMappedData]?.(
          lastScrollTop,
        );
      },
    },
  ) as unknown as ScrollData<TMappedData>;
};
