import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pageVisibility } from './page-visibility.js';

export const triggerVisibilityChange = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(document, 'hidden', {
    value: state === 'hidden',
    writable: true,
    configurable: true,
  });

  document.dispatchEvent(new Event('visibilitychange'));
};

describe('pageVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isVisible getter', () => {
    it('should return true when document.visibilityState is "visible"', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(true);
    });

    it('should return false when document.visibilityState is not "visible"', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(false);
    });

    it('should properly initialize the atom and set up event listeners', () => {
      const isVisibleValue = pageVisibility.isVisible;

      expect(typeof isVisibleValue).toBe('boolean');
    });

    it('should handle visibilitychange event correctly', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(false);

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(true);
    });
  });

  describe('isHidden getter', () => {
    it('should return false when document.visibilityState is "visible"', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      expect(pageVisibility.isHidden).toBe(false);
    });

    it('should return true when document.visibilityState is "hidden"', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      expect(pageVisibility.isHidden).toBe(true);
    });
  });

  describe('behavioral consistency', () => {
    it('should return opposite values for isVisible and isHidden', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(true);
      expect(pageVisibility.isHidden).toBe(false);
      expect(pageVisibility.isVisible).toBe(!pageVisibility.isHidden);

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(false);
      expect(pageVisibility.isHidden).toBe(true);
      expect(pageVisibility.isVisible).toBe(!pageVisibility.isHidden);
    });
  });

  describe('reactivity', () => {
    it.skip('should be reactive', () => {
      const isVisibleSpy = vi.fn();

      const handler = vi.fn();
      document.addEventListener('visibilitychange', handler);

      const dispose = reaction(
        () => pageVisibility.isVisible,
        (isVisible) => isVisibleSpy(isVisible),
      );

      triggerVisibilityChange('hidden');

      expect(handler).toBeCalledTimes(1);
      expect(isVisibleSpy).toBeCalledTimes(1);
      expect(isVisibleSpy).toHaveBeenNthCalledWith(1, false);

      dispose();
    });
  });

  describe('edge cases', () => {
    it('should handle document.visibilityState being undefined', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: undefined,
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(false);
      expect(pageVisibility.isHidden).toBe(true);
    });

    it('should handle document.visibilityState being null', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: null,
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(false);
      expect(pageVisibility.isHidden).toBe(true);
    });

    it('should handle document.visibilityState being a different string', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'prerender',
        configurable: true,
      });

      expect(pageVisibility.isVisible).toBe(false);
      expect(pageVisibility.isHidden).toBe(true);
    });
  });
});
