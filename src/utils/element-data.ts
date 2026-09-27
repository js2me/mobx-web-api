import { createEnhancedAtom, type Ref, toRef } from 'yummies/mobx';

export interface ElementDataEntry<TData> {
  data: TData;
  dispose: VoidFunction;
}

export interface ElementDataController<TData> {
  observe<TElement extends Element>(
    element: TElement | Ref<TElement, any>,
  ): TData;
  unobserve<TElement extends Element>(
    element: TElement | Ref<TElement, any>,
  ): void;
}

export interface ElementDataEntryOptions<TData> {
  createData: (reportObserved: VoidFunction) => TData;
  observe: (element: Element, reportChanged: VoidFunction) => VoidFunction;
  dependencies?: readonly Ref<Element, any>[];
  onDispose?: VoidFunction;
}

export const createElementDataEntry = <TData>(
  target: Element | Ref<Element, any>,
  options: ElementDataEntryOptions<TData>,
): ElementDataEntry<TData> => {
  const elementRef = toRef(target) as unknown as Ref<Element, any>;
  const dependencies = options.dependencies ?? [];
  let isRegistered = true;
  let isActive = false;
  let observedElement: Element | null = null;
  let stopObserving: VoidFunction = () => undefined;
  let atom: ReturnType<typeof createEnhancedAtom>;

  const connect = () => {
    stopObserving();
    stopObserving = () => undefined;
    observedElement = elementRef.current;

    if (observedElement) {
      stopObserving = options.observe(observedElement, () =>
        atom.reportChanged(),
      );
    }
  };

  const updateElement = () => {
    if (isActive && observedElement !== elementRef.current) {
      connect();
    }
  };

  const refresh = () => {
    if (isActive) {
      connect();
    }
  };

  const activate = () => {
    if (!isRegistered || isActive) {
      return;
    }

    isActive = true;
    elementRef.listeners.add(updateElement);
    for (const dependency of dependencies) {
      dependency.listeners.add(refresh);
    }
    connect();
  };

  const deactivate = () => {
    if (!isActive) {
      return;
    }

    isActive = false;
    elementRef.listeners.delete(updateElement);
    for (const dependency of dependencies) {
      dependency.listeners.delete(refresh);
    }
    stopObserving();
    stopObserving = () => undefined;
    observedElement = null;
  };

  atom = createEnhancedAtom('', activate, deactivate);

  return {
    data: options.createData(() => atom.reportObserved()),
    dispose: () => {
      isRegistered = false;
      deactivate();
      options.onDispose?.();
      atom.reportChanged();
    },
  };
};

export const createElementDataController = <TData>(
  createEntry: (
    element: Element | Ref<Element, any>,
  ) => ElementDataEntry<TData>,
): ElementDataController<TData> => {
  const entries = new WeakMap<object, ElementDataEntry<TData>>();

  return {
    observe(element) {
      const key = element as object;
      let entry = entries.get(key);
      if (!entry) {
        entry = createEntry(element as Element | Ref<Element, any>);
        entries.set(key, entry);
      }
      return entry.data;
    },
    unobserve(element) {
      const key = element as object;
      const entry = entries.get(key);
      if (entry) {
        entries.delete(key);
        entry.dispose();
      }
    },
  };
};
