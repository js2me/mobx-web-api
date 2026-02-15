import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { batteryStatus } from './battery-status.js';

type BatteryEvent =
  | 'chargingchange'
  | 'chargingtimechange'
  | 'dischargingtimechange'
  | 'levelchange';

type FakeBatteryManager = {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  emit(event: BatteryEvent): void;
};

const createFakeBatteryManager = (
  values?: Partial<
    Pick<
      FakeBatteryManager,
      'charging' | 'chargingTime' | 'dischargingTime' | 'level'
    >
  >,
): FakeBatteryManager => {
  const listeners: Record<BatteryEvent, Set<() => void>> = {
    chargingchange: new Set(),
    chargingtimechange: new Set(),
    dischargingtimechange: new Set(),
    levelchange: new Set(),
  };

  return {
    charging: values?.charging ?? true,
    chargingTime: values?.chargingTime ?? Number.POSITIVE_INFINITY,
    dischargingTime: values?.dischargingTime ?? Number.POSITIVE_INFINITY,
    level: values?.level ?? 1,
    addEventListener: vi.fn((event: BatteryEvent, listener: () => void) => {
      listeners[event].add(listener);
    }),
    removeEventListener: vi.fn((event: BatteryEvent, listener: () => void) => {
      listeners[event].delete(listener);
    }),
    emit(event: BatteryEvent) {
      listeners[event].forEach((listener) => {
        listener();
      });
    },
  };
};

describe('batteryStatus', () => {
  const originalGetBatteryDescriptor = Object.getOwnPropertyDescriptor(
    globalThis.navigator,
    'getBattery',
  );

  const setGetBattery = (
    getBattery: (() => Promise<FakeBatteryManager>) | undefined,
  ) => {
    if (!getBattery) {
      // @ts-expect-error helper for deleting optional navigator property in tests
      delete globalThis.navigator.getBattery;
      return;
    }

    Object.defineProperty(globalThis.navigator, 'getBattery', {
      value: getBattery,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    batteryStatus._atom = undefined;
  });

  afterEach(() => {
    batteryStatus._atom = undefined;
    vi.restoreAllMocks();

    if (originalGetBatteryDescriptor) {
      Object.defineProperty(
        globalThis.navigator,
        'getBattery',
        originalGetBatteryDescriptor,
      );
    } else {
      // @ts-expect-error cleanup for environments without getBattery
      delete globalThis.navigator.getBattery;
    }
  });

  it('returns isSupported=true when navigator.getBattery exists', () => {
    setGetBattery(async () => createFakeBatteryManager());
    expect(batteryStatus.isSupported).toBe(true);
  });

  it('returns isSupported=false when navigator.getBattery is unavailable', () => {
    setGetBattery(undefined);
    expect(batteryStatus.isSupported).toBe(false);
  });

  it('returns default level when battery manager is not loaded (SSR-safe)', () => {
    setGetBattery(undefined);
    expect(() => batteryStatus.level).not.toThrow();
    expect(batteryStatus.level).toBe(1);
  });

  it('returns default charging=true when battery manager is not loaded', () => {
    setGetBattery(undefined);
    expect(batteryStatus.charging).toBe(true);
  });

  it('returns default chargingTime when battery manager is not loaded', () => {
    setGetBattery(undefined);
    expect(batteryStatus.chargingTime).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns default dischargingTime when battery manager is not loaded', () => {
    setGetBattery(undefined);
    expect(batteryStatus.dischargingTime).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns default levelPercent=100 before manager is loaded', () => {
    setGetBattery(undefined);
    expect(batteryStatus.levelPercent).toBe(100);
  });

  it('returns undefined error by default', () => {
    setGetBattery(undefined);
    expect(batteryStatus.error).toBeUndefined();
  });

  it('loads manager values after retry', async () => {
    const manager = createFakeBatteryManager({
      level: 0.53,
      charging: false,
      chargingTime: 120,
      dischargingTime: 2400,
    });
    setGetBattery(async () => manager);

    await batteryStatus.retry();

    expect(batteryStatus.level).toBe(0.53);
    expect(batteryStatus.levelPercent).toBe(53);
    expect(batteryStatus.charging).toBe(false);
    expect(batteryStatus.chargingTime).toBe(120);
    expect(batteryStatus.dischargingTime).toBe(2400);
  });

  it('retry resolves when getBattery is unavailable', async () => {
    setGetBattery(undefined);
    await expect(batteryStatus.retry()).resolves.toBeUndefined();
  });

  it('sets error when getBattery rejects', async () => {
    const error = new Error('battery-failed');
    setGetBattery(async () => {
      throw error;
    });

    await batteryStatus.retry();

    expect(batteryStatus.error).toBe(error);
  });

  it('retry clears previous error before next attempt', async () => {
    const firstError = new Error('first');
    const manager = createFakeBatteryManager({ level: 0.8 });

    const getBattery = vi
      .fn<() => Promise<FakeBatteryManager>>()
      .mockRejectedValueOnce(firstError)
      .mockResolvedValueOnce(manager);

    setGetBattery(getBattery);

    await batteryStatus.retry();
    expect(batteryStatus.error).toBe(firstError);

    const pendingRetry = batteryStatus.retry();
    expect(batteryStatus.error).toBeUndefined();
    await pendingRetry;

    expect(batteryStatus.error).toBeUndefined();
    expect(batteryStatus.level).toBe(0.8);
  });

  it('returns isLow=true when not charging and level <= 0.2', async () => {
    setGetBattery(async () =>
      createFakeBatteryManager({ charging: false, level: 0.2 }),
    );

    await batteryStatus.retry();
    expect(batteryStatus.isLow).toBe(true);
  });

  it('returns isLow=false when charging even with low level', async () => {
    setGetBattery(async () =>
      createFakeBatteryManager({ charging: true, level: 0.1 }),
    );

    await batteryStatus.retry();
    expect(batteryStatus.isLow).toBe(false);
  });

  it('returns isLow=false when not charging and level > 0.2', async () => {
    setGetBattery(async () =>
      createFakeBatteryManager({ charging: false, level: 0.21 }),
    );

    await batteryStatus.retry();
    expect(batteryStatus.isLow).toBe(false);
  });

  it('reacts to levelchange event', async () => {
    const manager = createFakeBatteryManager({ level: 0.9 });
    setGetBattery(async () => manager);
    await batteryStatus.retry();

    const levelSpy = vi.fn();
    const dispose = reaction(
      () => batteryStatus.level,
      (level) => levelSpy(level),
    );

    manager.level = 0.4;
    manager.emit('levelchange');

    expect(levelSpy).toHaveBeenCalledTimes(1);
    expect(levelSpy).toHaveBeenNthCalledWith(1, 0.4);
    dispose();
  });

  it('reacts to chargingchange event', async () => {
    const manager = createFakeBatteryManager({ charging: true });
    setGetBattery(async () => manager);
    await batteryStatus.retry();

    const chargingSpy = vi.fn();
    const dispose = reaction(
      () => batteryStatus.charging,
      (charging) => chargingSpy(charging),
    );

    manager.charging = false;
    manager.emit('chargingchange');

    expect(chargingSpy).toHaveBeenCalledTimes(1);
    expect(chargingSpy).toHaveBeenNthCalledWith(1, false);
    dispose();
  });

  it('reacts to chargingtimechange event', async () => {
    const manager = createFakeBatteryManager({ chargingTime: 1000 });
    setGetBattery(async () => manager);
    await batteryStatus.retry();

    const chargingTimeSpy = vi.fn();
    const dispose = reaction(
      () => batteryStatus.chargingTime,
      (chargingTime) => chargingTimeSpy(chargingTime),
    );

    manager.chargingTime = 500;
    manager.emit('chargingtimechange');

    expect(chargingTimeSpy).toHaveBeenCalledTimes(1);
    expect(chargingTimeSpy).toHaveBeenNthCalledWith(1, 500);
    dispose();
  });

  it('reacts to dischargingtimechange event', async () => {
    const manager = createFakeBatteryManager({ dischargingTime: 3600 });
    setGetBattery(async () => manager);
    await batteryStatus.retry();

    const dischargingTimeSpy = vi.fn();
    const dispose = reaction(
      () => batteryStatus.dischargingTime,
      (dischargingTime) => dischargingTimeSpy(dischargingTime),
    );

    manager.dischargingTime = 1800;
    manager.emit('dischargingtimechange');

    expect(dischargingTimeSpy).toHaveBeenCalledTimes(1);
    expect(dischargingTimeSpy).toHaveBeenNthCalledWith(1, 1800);
    dispose();
  });

  it('attaches listeners for all battery events', async () => {
    const manager = createFakeBatteryManager();
    setGetBattery(async () => manager);

    await batteryStatus.retry();

    expect(manager.addEventListener).toHaveBeenCalledWith(
      'chargingchange',
      expect.any(Function),
    );
    expect(manager.addEventListener).toHaveBeenCalledWith(
      'chargingtimechange',
      expect.any(Function),
    );
    expect(manager.addEventListener).toHaveBeenCalledWith(
      'dischargingtimechange',
      expect.any(Function),
    );
    expect(manager.addEventListener).toHaveBeenCalledWith(
      'levelchange',
      expect.any(Function),
    );
  });

  it('detaches listeners on dispose after observation', async () => {
    const manager = createFakeBatteryManager();
    setGetBattery(async () => manager);
    await batteryStatus.retry();

    const dispose = reaction(
      () => batteryStatus.level,
      () => undefined,
    );
    dispose();

    expect(manager.removeEventListener).toHaveBeenCalledWith(
      'chargingchange',
      expect.any(Function),
    );
    expect(manager.removeEventListener).toHaveBeenCalledWith(
      'chargingtimechange',
      expect.any(Function),
    );
    expect(manager.removeEventListener).toHaveBeenCalledWith(
      'dischargingtimechange',
      expect.any(Function),
    );
    expect(manager.removeEventListener).toHaveBeenCalledWith(
      'levelchange',
      expect.any(Function),
    );
  });

  it('deduplicates concurrent retry loading calls', async () => {
    const manager = createFakeBatteryManager({ level: 0.7 });
    const getBattery = vi.fn(async () => manager);
    setGetBattery(getBattery);

    await Promise.all([batteryStatus.retry(), batteryStatus.retry()]);

    expect(getBattery).toHaveBeenCalledTimes(1);
    expect(batteryStatus.level).toBe(0.7);
  });
});
