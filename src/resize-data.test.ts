import { reaction } from 'mobx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'yummies/mobx';
import { createResizeData } from './resize-data.js';

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

describe('createResizeData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tracks an element and disconnects when the reaction is disposed', () => {
    let callback: ResizeCallback | undefined;
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();

    vi.stubGlobal(
      'ResizeObserver',
      vi.fn((nextCallback: ResizeCallback) => {
        callback = nextCallback;
        return { observe, unobserve, disconnect };
      }),
    );

    const element = document.createElement('div');
    const data = createResizeData(element);
    const widths: number[] = [];
    const dispose = reaction(
      () => data.width,
      (width) => widths.push(width),
    );

    expect(observe).toHaveBeenCalledWith(element);

    callback?.([
      {
        contentRect: { width: 320, height: 180 } as DOMRectReadOnly,
      } as ResizeObserverEntry,
    ]);

    expect(data.width).toBe(320);
    expect(data.height).toBe(180);
    expect(data.rect.width).toBe(320);
    expect(data.isSupported).toBe(true);
    expect(widths).toEqual([320]);

    dispose();
    expect(unobserve).toHaveBeenCalledWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('returns safe defaults when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const data = createResizeData(document.createElement('div'));

    expect(data.isSupported).toBe(false);
    expect(data.width).toBe(0);
    expect(data.height).toBe(0);
    expect(data.rect.width).toBe(0);
  });

  it('reconnects when a MobX ref changes its element', () => {
    const observe = vi.fn();
    const unobserve = vi.fn();

    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(() => ({
        observe,
        unobserve,
        disconnect: vi.fn(),
      })),
    );

    const firstElement = document.createElement('div');
    const secondElement = document.createElement('div');
    const elementRef = createRef<HTMLDivElement>({ initial: firstElement });
    const data = createResizeData(elementRef);
    const dispose = reaction(
      () => data.width,
      () => undefined,
    );

    elementRef.set(secondElement);

    expect(unobserve).toHaveBeenCalledWith(firstElement);
    expect(observe).toHaveBeenCalledWith(secondElement);
    dispose();
  });
});
