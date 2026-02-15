import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

type EffectiveConnection = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

type NetworkConnectionLike = {
  effectiveType?: EffectiveConnection;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (event: 'change', listener: () => void) => void;
  removeEventListener?: (event: 'change', listener: () => void) => void;
};

type NetworkNavigator = globalThis.Navigator & {
  connection?: NetworkConnectionLike;
  mozConnection?: NetworkConnectionLike;
  webkitConnection?: NetworkConnectionLike;
};

const getConnection = (): NetworkConnectionLike | undefined => {
  if (!globalThis.navigator) {
    return undefined;
  }

  const navigatorWithConnection = globalThis.navigator as NetworkNavigator;

  return (
    navigatorWithConnection.connection ??
    navigatorWithConnection.mozConnection ??
    navigatorWithConnection.webkitConnection
  );
};

/**
 * Reactive network connection information.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/connection-info.html)
 * [MDN NetworkInformation](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)
 */
export interface ConnectionInfo {
  /**
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType)
   */
  effectiveType: EffectiveConnection;
  /**
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/downlink)
   */
  downlink: number;
  /**
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/rtt)
   */
  rtt: number;
  /**
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData)
   */
  saveData: boolean;
  /**
   * `true` when connection is data-saving or effectively slow.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/connection-info.html#isslow)
   */
  isSlow: boolean;
  _atom?: IEnhancedAtom;
}

const getObservedConnection = (
  info: ConnectionInfo,
): NetworkConnectionLike | undefined => {
  const connection = getConnection();

  if (!connection) {
    return undefined;
  }

  if (!info._atom) {
    info._atom = createEnhancedAtom(
      process.env.NODE_ENV === 'production' ? '' : 'connectionInfo',
      (atom) => {
        connection.addEventListener?.('change', atom.reportChanged);
      },
      (atom) => {
        connection.removeEventListener?.('change', atom.reportChanged);
      },
    );
  }

  info._atom.reportObserved();

  return connection;
};

/**
 * Reactive `NetworkInformation` wrapper for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/connection-info.html)
 * [MDN NetworkInformation](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)
 */
export const connectionInfo: ConnectionInfo = {
  get effectiveType() {
    return getObservedConnection(this)?.effectiveType ?? 'unknown';
  },
  get downlink() {
    return getObservedConnection(this)?.downlink ?? 0;
  },
  get rtt() {
    return getObservedConnection(this)?.rtt ?? 0;
  },
  get saveData() {
    return getObservedConnection(this)?.saveData ?? false;
  },
  get isSlow() {
    return (
      this.saveData ||
      this.effectiveType === 'slow-2g' ||
      this.effectiveType === '2g'
    );
  },
};
