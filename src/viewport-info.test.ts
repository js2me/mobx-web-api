import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { viewportInfo } from './viewport-info.js';

type ViewportEvent = 'resize' | 'scroll';

type FakeViewport = VisualViewport & {
  emit(event: ViewportEvent): void;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

const createFakeViewport = (
  values?: Partial<
    Pick<
      VisualViewport,
      | 'width'
      | 'height'
      | 'offsetLeft'
      | 'offsetTop'
      | 'pageLeft'
      | 'pageTop'
      | 'scale'
    >
  >,
): FakeViewport => {
  const listeners: Record<ViewportEvent, Set<() => void>> = {
    resize: new Set(),
    scroll: new Set(),
  };

  const fakeViewport = {
    width: values?.width ?? 1000,
    height: values?.height ?? 700,
    offsetLeft: values?.offsetLeft ?? 10,
    offsetTop: values?.offsetTop ?? 20,
    pageLeft: values?.pageLeft ?? 30,
    pageTop: values?.pageTop ?? 40,
    scale: values?.scale ?? 1,
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === 'resize' || event === 'scroll') {
        listeners[event].add(listener);
      }
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === 'resize' || event === 'scroll') {
        listeners[event].delete(listener);
      }
    }),
    emit(event: ViewportEvent) {
      listeners[event].forEach((listener) => {
        listener();
      });
    },
  };

  return fakeViewport as FakeViewport;
};

describe('viewportInfo', () => {
  const originalVisualViewport = Object.getOwnPropertyDescriptor(
    globalThis,
    'visualViewport',
  );
  const originalInnerWidth = Object.getOwnPropertyDescriptor(
    globalThis,
    'innerWidth',
  );
  const originalInnerHeight = Object.getOwnPropertyDescriptor(
    globalThis,
    'innerHeight',
  );

  beforeEach(() => {
    vi.clearAllMocks();
    viewportInfo._atom = undefined;
  });

  afterEach(() => {
    viewportInfo._atom = undefined;
    vi.restoreAllMocks();

    if (originalVisualViewport) {
      Object.defineProperty(
        globalThis,
        'visualViewport',
        originalVisualViewport,
      );
    } else {
      // @ts-expect-error cleanup for env without visualViewport descriptor
      delete globalThis.visualViewport;
    }

    if (originalInnerWidth) {
      Object.defineProperty(globalThis, 'innerWidth', originalInnerWidth);
    }

    if (originalInnerHeight) {
      Object.defineProperty(globalThis, 'innerHeight', originalInnerHeight);
    }
  });

  it('reads values from visualViewport when available', () => {
    const fakeViewport = createFakeViewport({
      width: 1200,
      height: 800,
      offsetLeft: 11,
      offsetTop: 22,
      pageLeft: 33,
      pageTop: 44,
      scale: 1.5,
    });

    Object.defineProperty(globalThis, 'visualViewport', {
      value: fakeViewport,
      configurable: true,
      writable: true,
    });

    expect(viewportInfo.isSupported).toBe(true);
    expect(viewportInfo.width).toBe(1200);
    expect(viewportInfo.height).toBe(800);
    expect(viewportInfo.offsetLeft).toBe(11);
    expect(viewportInfo.offsetTop).toBe(22);
    expect(viewportInfo.pageLeft).toBe(33);
    expect(viewportInfo.pageTop).toBe(44);
    expect(viewportInfo.scale).toBe(1.5);
  });

  it('uses fallback values when visualViewport is unavailable (SSR-safe)', () => {
    Object.defineProperty(globalThis, 'visualViewport', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'innerHeight', {
      value: 480,
      configurable: true,
      writable: true,
    });

    expect(() => viewportInfo.width).not.toThrow();
    expect(viewportInfo.isSupported).toBe(false);
    expect(viewportInfo.width).toBe(640);
    expect(viewportInfo.height).toBe(480);
    expect(viewportInfo.offsetLeft).toBe(0);
    expect(viewportInfo.offsetTop).toBe(0);
    expect(viewportInfo.pageLeft).toBe(0);
    expect(viewportInfo.pageTop).toBe(0);
    expect(viewportInfo.scale).toBe(1);
  });

  it('reacts to resize events from visualViewport', () => {
    const fakeViewport = createFakeViewport({ width: 1000 });
    Object.defineProperty(globalThis, 'visualViewport', {
      value: fakeViewport,
      configurable: true,
      writable: true,
    });

    const widthSpy = vi.fn();
    const dispose = reaction(
      () => viewportInfo.width,
      (width) => widthSpy(width),
    );

    fakeViewport.width = 777;
    fakeViewport.emit('resize');

    expect(widthSpy).toHaveBeenCalledTimes(1);
    expect(widthSpy).toHaveBeenNthCalledWith(1, 777);

    dispose();
  });

  it('adds listeners on observe and removes them on dispose', () => {
    const fakeViewport = createFakeViewport();
    Object.defineProperty(globalThis, 'visualViewport', {
      value: fakeViewport,
      configurable: true,
      writable: true,
    });

    const dispose = reaction(
      () => viewportInfo.width,
      () => undefined,
    );

    expect(fakeViewport.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(fakeViewport.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );

    dispose();

    expect(fakeViewport.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(fakeViewport.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );
  });

  it('computes keyboard-like overlay flag', () => {
    Object.defineProperty(globalThis, 'innerHeight', {
      value: 900,
      configurable: true,
      writable: true,
    });

    const fakeViewport = createFakeViewport({ height: 700 });
    Object.defineProperty(globalThis, 'visualViewport', {
      value: fakeViewport,
      configurable: true,
      writable: true,
    });

    expect(viewportInfo.isKeyboardLikeOverlay).toBe(true);

    fakeViewport.height = 840;
    expect(viewportInfo.isKeyboardLikeOverlay).toBe(false);
  });
});
