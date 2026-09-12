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
