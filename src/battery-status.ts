import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

/**
 * Battery manager shape used by the library.
 *
 * [MDN BatteryManager](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager)
 */
type BatteryManagerLike = EventTarget & {
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/charging) */
  charging: boolean;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/chargingTime) */
  chargingTime: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/dischargingTime) */
  dischargingTime: number;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/level) */
  level: number;
};

type BatteryNavigator = globalThis.Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>;
};

type BatteryStatusInternal = {
  batteryManager?: BatteryManagerLike;
  loading?: Promise<void>;
  error?: unknown;
};

/**
 * Reactive battery status API for MobX.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status)
 * [MDN Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API)
 */
export interface BatteryStatus {
  /**
   * Battery level from `0` to `1`.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#level)
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/level)
   */
  level: number;
  /**
   * Battery level in percent (`0`..`100`).
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#levelpercent)
   */
  levelPercent: number;
  /**
   * `true` when battery is charging.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#charging)
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/charging)
   */
  charging: boolean;
  /**
   * Seconds until battery is fully charged.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#chargingtime)
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/chargingTime)
   */
  chargingTime: number;
  /**
   * Seconds until battery is fully discharged.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#dischargingtime)
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager/dischargingTime)
   */
  dischargingTime: number;
  /**
   * `true` when `level <= 0.2` and device is not charging.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#islow)
   */
  isLow: boolean;
  /**
   * `true` when `navigator.getBattery` is available.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#issupported)
   * [MDN Navigator.getBattery](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery)
   */
  isSupported: boolean;
  /**
   * Last loading error from `navigator.getBattery()`.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#error)
   */
  error?: unknown;
  /**
   * Re-runs battery manager loading.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status#retry)
   */
  retry(): Promise<void>;
  _atom?: IEnhancedAtom<BatteryStatusInternal>;
}

const initBattery = async (info: BatteryStatus) => {
  const navigatorWithBattery = globalThis.navigator as BatteryNavigator;
  const getBattery = navigatorWithBattery?.getBattery;

  if (!getBattery) {
    return;
  }

  const atom = info._atom!;

  if (atom.meta.loading) {
    return atom.meta.loading;
  }

  atom.meta.loading = getBattery()
    .then((manager) => {
      atom.meta.batteryManager = manager;
      manager.addEventListener('chargingchange', atom.reportChanged);
      manager.addEventListener('chargingtimechange', atom.reportChanged);
      manager.addEventListener('dischargingtimechange', atom.reportChanged);
      manager.addEventListener('levelchange', atom.reportChanged);
      atom.reportChanged();
    })
    .catch((error) => {
      atom.meta.error = error;
      atom.reportChanged();
    })
    .finally(() => {
      atom.meta.loading = undefined;
    });

  return atom.meta.loading;
};

const ensureAtom = (info: BatteryStatus) => {
  if (!info._atom) {
    info._atom = createEnhancedAtom<BatteryStatusInternal>(
      process.env.NODE_ENV === 'production' ? '' : 'batteryStatus',
      (atom) => {
        const manager = atom.meta.batteryManager;
        if (manager) {
          manager.addEventListener('chargingchange', atom.reportChanged);
          manager.addEventListener('chargingtimechange', atom.reportChanged);
          manager.addEventListener('dischargingtimechange', atom.reportChanged);
          manager.addEventListener('levelchange', atom.reportChanged);
        } else {
          // biome-ignore lint/nursery/noFloatingPromises: lazy initialization
          initBattery(info);
        }
      },
      (atom) => {
        atom.meta.batteryManager?.removeEventListener(
          'chargingchange',
          atom.reportChanged,
        );
        atom.meta.batteryManager?.removeEventListener(
          'chargingtimechange',
          atom.reportChanged,
        );
        atom.meta.batteryManager?.removeEventListener(
          'dischargingtimechange',
          atom.reportChanged,
        );
        atom.meta.batteryManager?.removeEventListener(
          'levelchange',
          atom.reportChanged,
        );
      },
      {},
    );
  }

  return info._atom;
};

/**
 * Reactive battery information for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/battery-status)
 * [MDN Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API)
 */
export const batteryStatus: BatteryStatus = {
  get isSupported() {
    if (!globalThis.navigator) {
      return false;
    }

    return 'getBattery' in (globalThis.navigator as BatteryNavigator);
  },
  get level() {
    const atom = ensureAtom(this);
    atom.reportObserved();

    return atom.meta.batteryManager?.level ?? 1;
  },
  get levelPercent() {
    return Math.round(this.level * 100);
  },
  get charging() {
    const atom = ensureAtom(this);
    atom.reportObserved();

    return atom.meta.batteryManager?.charging ?? true;
  },
  get chargingTime() {
    const atom = ensureAtom(this);
    atom.reportObserved();

    return atom.meta.batteryManager?.chargingTime ?? Number.POSITIVE_INFINITY;
  },
  get dischargingTime() {
    const atom = ensureAtom(this);
    atom.reportObserved();

    return (
      atom.meta.batteryManager?.dischargingTime ?? Number.POSITIVE_INFINITY
    );
  },
  get isLow() {
    return !this.charging && this.level <= 0.2;
  },
  get error() {
    const atom = ensureAtom(this);
    atom.reportObserved();
    return atom.meta.error;
  },
  retry() {
    const atom = ensureAtom(this);
    atom.meta.error = undefined;
    return initBattery(this) ?? Promise.resolve();
  },
};
