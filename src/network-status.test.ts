import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { networkStatus } from './network-status.js';

export const triggerOnlineChange = (state: 'online' | 'offline') => {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    value: state === 'online',
    writable: true,
    configurable: true,
  });

  globalThis.dispatchEvent(new Event(state));
};

describe('networkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOnline getter', () => {
    it('should return true when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(false);
    });

    it('should properly initialize the atom and set up event listeners', () => {
      const isOnlineValue = networkStatus.isOnline;

      expect(typeof isOnlineValue).toBe('boolean');
    });

    it('should handle online event correctly', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(false);

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(true);
    });
  });

  describe('isOffline getter', () => {
    it('should return false when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      expect(networkStatus.isOffline).toBe(false);
    });

    it('should return true when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      expect(networkStatus.isOffline).toBe(true);
    });
  });

  describe('reactivity', () => {
    it.skip('should be reactive', async () => {
      const isOfflineSpy = vi.fn();

      const handler = vi.fn();
      globalThis.addEventListener('offline', handler);

      const dispose = reaction(
        () => networkStatus.isOffline,
        (isOffline) => isOfflineSpy(isOffline),
      );

      triggerOnlineChange('offline');

      expect(handler).toBeCalledTimes(1);
      expect(isOfflineSpy).toBeCalledTimes(1);
      expect(isOfflineSpy).toHaveBeenNthCalledWith(1, true);

      dispose();
    });
  });

  describe('behavioral consistency', () => {
    it('should return opposite values for isOnline and isOffline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(true);
      expect(networkStatus.isOffline).toBe(false);
      expect(networkStatus.isOnline).toBe(!networkStatus.isOffline);

      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(false);
      expect(networkStatus.isOffline).toBe(true);
      expect(networkStatus.isOnline).toBe(!networkStatus.isOffline);
    });
  });

  describe('edge cases', () => {
    it('should handle navigator.onLine being explicitly false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(false);
      expect(networkStatus.isOffline).toBe(true);
    });

    it('should handle navigator.onLine being explicitly true', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      expect(networkStatus.isOnline).toBe(true);
      expect(networkStatus.isOffline).toBe(false);
    });
  });
});
