import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionInfo } from './connection-info.js';

type ConnectionEvent = 'change';

type FakeConnection = {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  emit(event: ConnectionEvent): void;
};

const createFakeConnection = (
  values?: Partial<
    Pick<FakeConnection, 'effectiveType' | 'downlink' | 'rtt' | 'saveData'>
  >,
): FakeConnection => {
  const listeners: Record<ConnectionEvent, Set<() => void>> = {
    change: new Set(),
  };

  const fakeConnection: FakeConnection = {
    effectiveType: values?.effectiveType ?? '4g',
    downlink: values?.downlink ?? 10,
    rtt: values?.rtt ?? 50,
    saveData: values?.saveData ?? false,
    addEventListener: vi.fn((event: ConnectionEvent, listener: () => void) => {
      listeners[event].add(listener);
    }),
    removeEventListener: vi.fn(
      (event: ConnectionEvent, listener: () => void) => {
        listeners[event].delete(listener);
      },
    ),
    emit(event: ConnectionEvent) {
      listeners[event].forEach((listener) => {
        listener();
      });
    },
  };

  return fakeConnection;
};

describe('connectionInfo', () => {
  const originalConnectionDescriptor = Object.getOwnPropertyDescriptor(
    globalThis.navigator,
    'connection',
  );
  const originalMozConnectionDescriptor = Object.getOwnPropertyDescriptor(
    globalThis.navigator,
    'mozConnection',
  );
  const originalWebkitConnectionDescriptor = Object.getOwnPropertyDescriptor(
    globalThis.navigator,
    'webkitConnection',
  );

  beforeEach(() => {
    vi.clearAllMocks();
    connectionInfo._atom = undefined;
  });

  afterEach(() => {
    connectionInfo._atom = undefined;
    vi.restoreAllMocks();

    if (originalConnectionDescriptor) {
      Object.defineProperty(
        globalThis.navigator,
        'connection',
        originalConnectionDescriptor,
      );
    } else {
      // @ts-expect-error cleanup for environments without this property
      delete globalThis.navigator.connection;
    }

    if (originalMozConnectionDescriptor) {
      Object.defineProperty(
        globalThis.navigator,
        'mozConnection',
        originalMozConnectionDescriptor,
      );
    } else {
      // @ts-expect-error cleanup for environments without this property
      delete globalThis.navigator.mozConnection;
    }

    if (originalWebkitConnectionDescriptor) {
      Object.defineProperty(
        globalThis.navigator,
        'webkitConnection',
        originalWebkitConnectionDescriptor,
      );
    } else {
      // @ts-expect-error cleanup for environments without this property
      delete globalThis.navigator.webkitConnection;
    }
  });

  it('reads values from navigator.connection', () => {
    const fakeConnection = createFakeConnection({
      effectiveType: '3g',
      downlink: 2.5,
      rtt: 300,
      saveData: true,
    });

    Object.defineProperty(globalThis.navigator, 'connection', {
      value: fakeConnection,
      configurable: true,
      writable: true,
    });

    expect(connectionInfo.effectiveType).toBe('3g');
    expect(connectionInfo.downlink).toBe(2.5);
    expect(connectionInfo.rtt).toBe(300);
    expect(connectionInfo.saveData).toBe(true);
  });

  it('falls back to defaults when connection api is unavailable', () => {
    Object.defineProperty(globalThis.navigator, 'connection', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis.navigator, 'mozConnection', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis.navigator, 'webkitConnection', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(connectionInfo.effectiveType).toBe('unknown');
    expect(connectionInfo.downlink).toBe(0);
    expect(connectionInfo.rtt).toBe(0);
    expect(connectionInfo.saveData).toBe(false);
    expect(connectionInfo.isSlow).toBe(false);
  });

  it('uses vendor-prefixed connection as fallback', () => {
    const fakeConnection = createFakeConnection({ effectiveType: '2g' });

    Object.defineProperty(globalThis.navigator, 'connection', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis.navigator, 'mozConnection', {
      value: fakeConnection,
      configurable: true,
      writable: true,
    });

    expect(connectionInfo.effectiveType).toBe('2g');
    expect(connectionInfo.isSlow).toBe(true);
  });

  it('reacts to connection change events', () => {
    const fakeConnection = createFakeConnection({ downlink: 10 });
    Object.defineProperty(globalThis.navigator, 'connection', {
      value: fakeConnection,
      configurable: true,
      writable: true,
    });

    const downlinkSpy = vi.fn();

    const dispose = reaction(
      () => connectionInfo.downlink,
      (downlink) => downlinkSpy(downlink),
    );

    fakeConnection.downlink = 1.2;
    fakeConnection.emit('change');

    expect(downlinkSpy).toHaveBeenCalledTimes(1);
    expect(downlinkSpy).toHaveBeenNthCalledWith(1, 1.2);

    dispose();
  });

  it('attaches and detaches change listener while observed', () => {
    const fakeConnection = createFakeConnection();
    Object.defineProperty(globalThis.navigator, 'connection', {
      value: fakeConnection,
      configurable: true,
      writable: true,
    });

    const dispose = reaction(
      () => connectionInfo.effectiveType,
      () => undefined,
    );

    expect(fakeConnection.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );

    dispose();

    expect(fakeConnection.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
