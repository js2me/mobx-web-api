import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BaseGeolocationProvider, geolocation } from './geolocation.js';

describe('geolocation SSR safety', () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigator',
  );

  beforeEach(() => {
    geolocation.provider = undefined;
  });

  afterEach(() => {
    geolocation.provider = undefined;

    if (originalNavigatorDescriptor) {
      Object.defineProperty(
        globalThis,
        'navigator',
        originalNavigatorDescriptor,
      );
    }
  });

  it('returns default position when navigator is unavailable', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(() => geolocation.position).not.toThrow();
    expect(geolocation.position.coords.latitude).toBe(0);
    expect(geolocation.position.coords.longitude).toBe(0);
    expect(geolocation.position.timestamp).toBe(0);
  });

  it('provider.activate returns false when navigator is unavailable', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const provider = new BaseGeolocationProvider();
    expect(provider.activate()).toBe(false);
  });

  it('provider.deactivate does not throw in SSR mode', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const provider = new BaseGeolocationProvider();
    expect(() => provider.deactivate()).not.toThrow();
  });

  it('provider.deactivate does not throw with stale watchId in SSR mode', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const provider = new BaseGeolocationProvider();
    (provider as BaseGeolocationProvider & { watchId: number }).watchId = 1;

    expect(() => provider.deactivate()).not.toThrow();
  });

  it('reacting to position in SSR does not throw', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const dispose = reaction(
      () => geolocation.position.timestamp,
      () => undefined,
    );

    expect(() => geolocation.position).not.toThrow();
    dispose();
  });
});
