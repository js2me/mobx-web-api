// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNavigationInfo } from './navigation-info.js';

describe('createNavigationInfo in Node (SSR)', () => {
  const originalNavigation = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigation',
  );
  const originalLocation = Object.getOwnPropertyDescriptor(
    globalThis,
    'location',
  );

  afterEach(() => {
    for (const [key, descriptor] of [
      ['navigation', originalNavigation],
      ['location', originalLocation],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  it('returns a usable entry without window, navigation, or location', () => {
    Reflect.deleteProperty(globalThis, 'navigation');
    Reflect.deleteProperty(globalThis, 'location');

    const info = createNavigationInfo();

    expect(info.isSupported).toBe(false);
    expect(info.currentEntry.index).toBe(-1);
    expect(info.url).toBeNull();
    expect(info.state).toBeUndefined();
    expect(info.navigate({ tab: 'profile' })).toBeUndefined();
  });

  it('does not navigate to a missing current URL', () => {
    Reflect.deleteProperty(globalThis, 'location');
    const navigate = vi.fn();
    Object.defineProperty(globalThis, 'navigation', {
      value: { currentEntry: null, navigate },
      configurable: true,
    });

    const info = createNavigationInfo();

    expect(info.navigate(null)).toBeUndefined();
    expect(info.navigate('')).toBeUndefined();
    expect(info.navigate({ tab: 'profile' })).toBeUndefined();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to an absolute URL with query without a location base', () => {
    Reflect.deleteProperty(globalThis, 'location');
    const navigate = vi.fn();
    Object.defineProperty(globalThis, 'navigation', {
      value: { currentEntry: null, navigate },
      configurable: true,
    });

    createNavigationInfo().navigate('https://example.com/settings#section', {
      history: 'replace',
      query: { tab: 'profile' },
    });

    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      'https://example.com/settings?tab=profile#section',
      { history: 'replace' },
    );
  });
});
