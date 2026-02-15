import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { colorScheme } from './color-scheme.js';

type MediaChangeEvent = 'change';

type FakeMediaQueryList = {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  emit(event: MediaChangeEvent): void;
};

const createFakeMediaQueryList = (
  media: string,
  initialMatches = false,
): FakeMediaQueryList => {
  const listeners: Record<MediaChangeEvent, Set<() => void>> = {
    change: new Set(),
  };

  return {
    media,
    matches: initialMatches,
    addEventListener: vi.fn((event: MediaChangeEvent, listener: () => void) => {
      listeners[event].add(listener);
    }),
    removeEventListener: vi.fn(
      (event: MediaChangeEvent, listener: () => void) => {
        listeners[event].delete(listener);
      },
    ),
    emit(event: MediaChangeEvent) {
      listeners[event].forEach((listener) => {
        listener();
      });
    },
  };
};

describe('colorScheme', () => {
  const originalMatchMediaDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'matchMedia',
  );

  beforeEach(() => {
    vi.clearAllMocks();
    colorScheme._atom = undefined;
  });

  afterEach(() => {
    colorScheme._atom = undefined;
    vi.restoreAllMocks();

    if (originalMatchMediaDescriptor) {
      Object.defineProperty(
        globalThis,
        'matchMedia',
        originalMatchMediaDescriptor,
      );
    } else {
      // @ts-expect-error cleanup for env without matchMedia
      delete globalThis.matchMedia;
    }
  });

  it('returns dark scheme when dark query matches', () => {
    const darkMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: dark)',
      true,
    );
    const lightMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: light)',
      false,
    );

    Object.defineProperty(globalThis, 'matchMedia', {
      value: vi.fn((query: string) =>
        query.includes('dark') ? darkMedia : lightMedia,
      ),
      configurable: true,
      writable: true,
    });

    expect(colorScheme.scheme).toBe('dark');
    expect(colorScheme.isDark).toBe(true);
    expect(colorScheme.isLight).toBe(false);
    expect(colorScheme.isNoPreference).toBe(false);
  });

  it('returns light scheme when light query matches', () => {
    const darkMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: dark)',
      false,
    );
    const lightMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: light)',
      true,
    );

    Object.defineProperty(globalThis, 'matchMedia', {
      value: vi.fn((query: string) =>
        query.includes('dark') ? darkMedia : lightMedia,
      ),
      configurable: true,
      writable: true,
    });

    expect(colorScheme.scheme).toBe('light');
    expect(colorScheme.isDark).toBe(false);
    expect(colorScheme.isLight).toBe(true);
    expect(colorScheme.isNoPreference).toBe(false);
  });

  it('falls back to no-preference when matchMedia is unavailable', () => {
    Object.defineProperty(globalThis, 'matchMedia', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(colorScheme.scheme).toBe('no-preference');
    expect(colorScheme.isDark).toBe(false);
    expect(colorScheme.isLight).toBe(false);
    expect(colorScheme.isNoPreference).toBe(true);
  });

  it('reacts to media query change events', () => {
    const darkMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: dark)',
      false,
    );
    const lightMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: light)',
      true,
    );

    Object.defineProperty(globalThis, 'matchMedia', {
      value: vi.fn((query: string) =>
        query.includes('dark') ? darkMedia : lightMedia,
      ),
      configurable: true,
      writable: true,
    });

    const schemeSpy = vi.fn();

    const dispose = reaction(
      () => colorScheme.scheme,
      (scheme) => schemeSpy(scheme),
    );

    darkMedia.matches = true;
    lightMedia.matches = false;
    darkMedia.emit('change');

    expect(schemeSpy).toHaveBeenCalledTimes(1);
    expect(schemeSpy).toHaveBeenNthCalledWith(1, 'dark');

    dispose();
  });

  it('attaches and detaches media listeners while observed', () => {
    const darkMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: dark)',
      false,
    );
    const lightMedia = createFakeMediaQueryList(
      '(prefers-color-scheme: light)',
      true,
    );

    Object.defineProperty(globalThis, 'matchMedia', {
      value: vi.fn((query: string) =>
        query.includes('dark') ? darkMedia : lightMedia,
      ),
      configurable: true,
      writable: true,
    });

    const dispose = reaction(
      () => colorScheme.scheme,
      () => undefined,
    );

    expect(darkMedia.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(lightMedia.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );

    dispose();

    expect(darkMedia.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(lightMedia.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
