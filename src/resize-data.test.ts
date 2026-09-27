import { reaction } from 'mobx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'yummies/mobx';
import { createResizeData } from './resize-data.js';

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

const createResizeEntry = (
  target: Element,
  width: number,
  height = 0,
): ResizeObserverEntry => {
  const boxSize = [{ inlineSize: width, blockSize: height }];

  return {
    target,
    contentRect: {
      x: 0,
      y: 0,
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      toJSON: () => ({}),
    },
    borderBoxSize: boxSize,
    contentBoxSize: boxSize,
    devicePixelContentBoxSize: boxSize,
  };
};

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

    callback?.([createResizeEntry(element, 320, 180)]);

    expect(data.width).toBe(320);
    expect(data.height).toBe(180);
    expect(data.rect.width).toBe(320);
    expect(data.isSupported).toBe(true);
    expect(widths).toEqual([320]);

    dispose();
    expect(unobserve).toHaveBeenCalledWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(data.width).toBe(320);
  });

  it('tracks multiple elements and returns data in input order', () => {
    const callbacks: ResizeCallback[] = [];
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    const ResizeObserverMock = vi.fn((nextCallback: ResizeCallback) => {
      callbacks.push(nextCallback);
      return { observe, unobserve, disconnect };
    });

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    const firstElement = document.createElement('div');
    const secondElement = document.createElement('div');
    const data = createResizeData([firstElement, secondElement]);
    expect(ResizeObserverMock).not.toHaveBeenCalled();
    expect(data.map(({ width }) => width)).toEqual([0, 0]);
    expect(ResizeObserverMock).not.toHaveBeenCalled();

    const dispose = reaction(
      () => data.map(({ width }) => width),
      () => undefined,
    );

    expect(data).toHaveLength(2);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledWith(firstElement);
    expect(observe).toHaveBeenCalledWith(secondElement);

    callbacks[0]?.([createResizeEntry(firstElement, 320)]);
    callbacks[1]?.([createResizeEntry(secondElement, 640)]);

    expect(data.map(({ width }) => width)).toEqual([320, 640]);

    dispose();
    expect(unobserve).toHaveBeenCalledWith(firstElement);
    expect(unobserve).toHaveBeenCalledWith(secondElement);
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('creates an observer only when data is reactively read and disconnects on disposal', () => {
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    const ResizeObserverMock = vi.fn(() => ({
      observe,
      unobserve,
      disconnect,
    }));
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    const element = document.createElement('div');
    const ref = createRef<HTMLDivElement>({ initial: element });
    const controller = createResizeData(null);
    const data = controller.observe(ref);

    expect(data.width).toBe(0);
    expect(data.isSupported).toBe(true);
    expect(ResizeObserverMock).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();

    const dispose = reaction(
      () => data.width,
      () => undefined,
    );
    expect(ResizeObserverMock).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(element);

    dispose();
    expect(unobserve).toHaveBeenCalledWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);

    const disposeAgain = reaction(
      () => data.height,
      () => undefined,
    );
    expect(ResizeObserverMock).toHaveBeenCalledTimes(2);
    disposeAgain();
    controller.unobserve(ref);
  });

  it('returns the same data for repeated observe calls and keeps observing until unobserve', () => {
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
    const controller = createResizeData(null);
    const data = controller.observe(element);
    expect(controller.observe(element)).toBe(data);

    const widths: number[] = [];
    const dispose = reaction(
      () => data.width,
      (width) => widths.push(width),
    );

    expect(observe).toHaveBeenCalledTimes(1);
    callback?.([createResizeEntry(element, 250)]);
    expect(widths).toEqual([250]);

    controller.unobserve(element);
    controller.unobserve(element);
    expect(unobserve).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(data.width).toBe(0);

    dispose();
  });

  it('tracks two refs that point at the same element independently', () => {
    const callbacks: ResizeCallback[] = [];
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn((nextCallback: ResizeCallback) => {
        callbacks.push(nextCallback);
        return { observe, unobserve, disconnect };
      }),
    );

    const element = document.createElement('div');
    const firstRef = createRef<HTMLDivElement>({ initial: element });
    const secondRef = createRef<HTMLDivElement>({ initial: element });
    const controller = createResizeData(null);
    const firstData = controller.observe(firstRef);
    const secondData = controller.observe(secondRef);
    const disposeFirst = reaction(
      () => firstData.width,
      () => undefined,
    );
    const disposeSecond = reaction(
      () => secondData.width,
      () => undefined,
    );

    expect(observe).toHaveBeenCalledTimes(2);
    callbacks[0]?.([createResizeEntry(element, 300)]);
    callbacks[1]?.([createResizeEntry(element, 300)]);
    expect(firstData.width).toBe(300);
    expect(secondData.width).toBe(300);

    controller.unobserve(firstRef);
    expect(unobserve).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);

    callbacks[1]?.([createResizeEntry(element, 350)]);
    expect(firstData.width).toBe(0);
    expect(secondData.width).toBe(350);

    disposeFirst();
    disposeSecond();
    expect(unobserve).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledTimes(2);
    controller.unobserve(secondRef);
  });

  it('reconnects after unobserve when the same element is observed again', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const ResizeObserverMock = vi.fn(() => ({
      observe,
      unobserve: vi.fn(),
      disconnect,
    }));
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    const element = document.createElement('div');
    const controller = createResizeData(null);
    const firstData = controller.observe(element);
    const disposeFirst = reaction(
      () => firstData.width,
      () => undefined,
    );
    controller.unobserve(element);
    expect(disconnect).toHaveBeenCalledTimes(1);

    const secondData = controller.observe(element);
    expect(secondData).not.toBe(firstData);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(1);

    const disposeSecond = reaction(
      () => secondData.width,
      () => undefined,
    );
    expect(ResizeObserverMock).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledTimes(2);

    disposeFirst();
    expect(disconnect).toHaveBeenCalledTimes(1);
    disposeSecond();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('observes and unobserves elements through a controller', () => {
    const callbacks: ResizeCallback[] = [];
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();

    vi.stubGlobal(
      'ResizeObserver',
      vi.fn((nextCallback: ResizeCallback) => {
        callbacks.push(nextCallback);
        return { observe, unobserve, disconnect };
      }),
    );

    const controller = createResizeData(null);
    const firstElement = document.createElement('div');
    const secondElement = document.createElement('div');
    const replacementElement = document.createElement('div');
    const firstRef = createRef<HTMLDivElement>({ initial: firstElement });
    const firstData = controller.observe(firstRef);
    const secondData = controller.observe(secondElement);
    const widths: number[][] = [];
    const dispose = reaction(
      () => [firstData.width, secondData.width],
      (nextWidths) => widths.push(nextWidths),
    );

    expect(observe).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenNthCalledWith(1, firstElement);
    expect(observe).toHaveBeenNthCalledWith(2, secondElement);

    callbacks[0]?.([createResizeEntry(firstElement, 320)]);
    callbacks[1]?.([createResizeEntry(secondElement, 640)]);
    expect(widths.at(-1)).toEqual([320, 640]);

    firstRef.set(replacementElement);
    expect(unobserve).toHaveBeenCalledWith(firstElement);
    expect(observe).toHaveBeenCalledWith(replacementElement);

    controller.unobserve(firstRef);
    expect(unobserve).toHaveBeenCalledWith(replacementElement);
    controller.unobserve(secondElement);
    expect(unobserve).toHaveBeenCalledWith(secondElement);
    expect(disconnect).toHaveBeenCalledTimes(3);

    dispose();
  });

  it('returns safe defaults when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const data = createResizeData(document.createElement('div'));
    const controller = createResizeData(null);
    const controlledData = controller.observe(document.createElement('div'));
    const dispose = reaction(
      () => controlledData.width,
      () => undefined,
    );

    expect(data.isSupported).toBe(false);
    expect(data.width).toBe(0);
    expect(data.height).toBe(0);
    expect(data.rect.width).toBe(0);
    expect(controlledData.isSupported).toBe(false);
    expect(controlledData.width).toBe(0);
    dispose();
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
