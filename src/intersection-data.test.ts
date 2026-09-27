import { reaction } from 'mobx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'yummies/mobx';
import { createIntersectionData } from './intersection-data.js';

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

describe('createIntersectionData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tracks intersection entries and passes observer options', () => {
    let callback: IntersectionCallback | undefined;
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    const options = { threshold: 0.5 };

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn((nextCallback: IntersectionCallback) => {
        callback = nextCallback;
        return { observe, unobserve, disconnect };
      }),
    );

    const element = document.createElement('div');
    const data = createIntersectionData(element, options);
    const states: boolean[] = [];
    const dispose = reaction(
      () => data.isIntersecting,
      (isIntersecting) => states.push(isIntersecting),
    );

    expect(observe).toHaveBeenCalledWith(element);

    callback?.([
      {
        isIntersecting: true,
        intersectionRatio: 0.75,
      } as IntersectionObserverEntry,
    ]);

    expect(data.isIntersecting).toBe(true);
    expect(data.intersectionRatio).toBe(0.75);
    expect(data.boundingClientRect).toBeDefined();
    expect(data.intersectionRect).toBeDefined();
    expect(data.rootBounds).toBeNull();
    expect(data.isSupported).toBe(true);
    expect(states).toEqual([true]);

    dispose();
    expect(unobserve).toHaveBeenCalledWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('tracks multiple elements in array order with lazy observers', () => {
    const callbacks: IntersectionCallback[] = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    const ObserverMock = vi.fn((nextCallback: IntersectionCallback) => {
      callbacks.push(nextCallback);
      return { observe, unobserve: vi.fn(), disconnect };
    });
    vi.stubGlobal('IntersectionObserver', ObserverMock);

    const firstElement = document.createElement('div');
    const secondElement = document.createElement('div');
    const data = createIntersectionData([firstElement, secondElement]);
    expect(ObserverMock).not.toHaveBeenCalled();

    const dispose = reaction(
      () => data.map(({ isIntersecting }) => isIntersecting),
      () => undefined,
    );
    expect(ObserverMock).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledWith(firstElement);
    expect(observe).toHaveBeenCalledWith(secondElement);

    callbacks[0]?.([
      {
        isIntersecting: true,
        intersectionRatio: 1,
      } as IntersectionObserverEntry,
    ]);
    callbacks[1]?.([
      {
        isIntersecting: false,
        intersectionRatio: 0,
      } as IntersectionObserverEntry,
    ]);
    expect(data.map(({ isIntersecting }) => isIntersecting)).toEqual([
      true,
      false,
    ]);

    dispose();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('supports lazy observe and unobserve through a controller', () => {
    const callbacks: IntersectionCallback[] = [];
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    const ObserverMock = vi.fn((nextCallback: IntersectionCallback) => {
      callbacks.push(nextCallback);
      return { observe, unobserve, disconnect };
    });
    vi.stubGlobal('IntersectionObserver', ObserverMock);

    const element = document.createElement('div');
    const elementRef = createRef<HTMLDivElement>({ initial: element });
    const controller = createIntersectionData(null, { threshold: 0.5 });
    const data = controller.observe(elementRef);

    expect(ObserverMock).not.toHaveBeenCalled();
    const dispose = reaction(
      () => data.isIntersecting,
      () => undefined,
    );
    expect(ObserverMock).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(element);

    callbacks[0]?.([
      {
        isIntersecting: true,
        intersectionRatio: 0.75,
      } as IntersectionObserverEntry,
    ]);
    expect(data.isIntersecting).toBe(true);

    controller.unobserve(elementRef);
    expect(unobserve).toHaveBeenCalledWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(data.isIntersecting).toBe(false);

    dispose();
  });

  it('returns safe defaults when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const element = document.createElement('div');
    const data = createIntersectionData(element);

    expect(data.isSupported).toBe(false);
    expect(data.isIntersecting).toBe(false);
    expect(data.intersectionRatio).toBe(0);
    expect(data.boundingClientRect.width).toBe(0);
    expect(data.intersectionRect.width).toBe(0);
    expect(data.rootBounds).toBeNull();
  });

  it('recreates the observer when a root ref changes', () => {
    const observers: Array<{
      observe: ReturnType<typeof vi.fn>;
      unobserve: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(() => {
        const observer = {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn(),
        };
        observers.push(observer);
        return observer;
      }),
    );

    const element = document.createElement('div');
    const firstRoot = document.createElement('section');
    const secondRoot = document.createElement('section');
    const rootRef = createRef<HTMLElement>({ initial: firstRoot });
    const data = createIntersectionData(element, { root: rootRef });
    const dispose = reaction(
      () => data.isIntersecting,
      () => undefined,
    );

    rootRef.set(secondRoot);

    expect(observers).toHaveLength(2);
    expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1);
    expect(observers[1]?.observe).toHaveBeenCalledWith(element);
    dispose();
  });
});
