import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullscreen } from './fullscreen.js';

describe('fullscreen', () => {
  let originalFullscreenEnabled: PropertyDescriptor | undefined;
  let originalExitFullscreen: PropertyDescriptor | undefined;
  let originalRequestFullscreen: PropertyDescriptor | undefined;
  let originalFullscreenElement: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalFullscreenEnabled = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenEnabled',
    );
    originalExitFullscreen = Object.getOwnPropertyDescriptor(
      document,
      'exitFullscreen',
    );
    originalRequestFullscreen = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'requestFullscreen',
    );
    originalFullscreenElement = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenElement',
    );
    fullscreen._atom = undefined;
  });

  afterEach(() => {
    fullscreen._atom = undefined;
    vi.restoreAllMocks();

    for (const [target, property, descriptor] of [
      [document, 'fullscreenEnabled', originalFullscreenEnabled],
      [document, 'exitFullscreen', originalExitFullscreen],
      [document, 'fullscreenElement', originalFullscreenElement],
      [HTMLElement.prototype, 'requestFullscreen', originalRequestFullscreen],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(target, property, descriptor);
      } else {
        // @ts-expect-error test cleanup
        delete target[property];
      }
    }
  });

  it('reacts to fullscreen changes and supports toggle', async () => {
    const element = document.createElement('div');
    const states: boolean[] = [];

    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(async () => {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          value: element,
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      }),
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn(async () => {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          value: null,
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      }),
    });

    const dispose = reaction(
      () => fullscreen.isActive,
      (isActive) => states.push(isActive),
    );

    await fullscreen.toggle(element);
    expect(fullscreen.element).toBe(element);
    expect(fullscreen.isActive).toBe(true);

    await fullscreen.toggle(element);
    expect(fullscreen.element).toBeNull();
    expect(states).toEqual([true, false]);

    dispose();
  });

  it('reports unsupported environments and does not exit when inactive', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });

    expect(fullscreen.isSupported).toBe(false);
    expect(fullscreen.isActive).toBe(false);
    await expect(fullscreen.exit()).resolves.toBe(false);
    await expect(
      fullscreen.request(document.createElement('div')),
    ).resolves.toBe(false);
  });

  it('stores request errors and returns false', async () => {
    const requestError = new Error('request failed');
    const element = document.createElement('div');

    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => Promise.reject(requestError)),
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn(),
    });

    await expect(fullscreen.request(element)).resolves.toBe(false);
    expect(fullscreen.error).toBe(requestError);
  });
});
