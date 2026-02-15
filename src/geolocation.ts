import {
  action,
  computed,
  makeObservable,
  observable,
  onBecomeObserved,
  onBecomeUnobserved,
} from 'mobx';
import type { Maybe } from 'yummies/types';
import { type PermissionInfo, permissions } from './permissions.js';

export type GeolocationPosition = {
  /**
   * Shorten version of web api GeolocationCoordinates
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationPosition/coords)
   */
  readonly coords: Omit<GeolocationCoordinates, 'toJSON'>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationPosition/timestamp) */
  readonly timestamp: EpochTimeStamp;
};
export type GeolocationError = globalThis.GeolocationPositionError;

export type GeolocationProvider = {
  error?: unknown;
  position: GeolocationPosition;
  activate(): boolean;
  deactivate(): void;
};

export class BaseGeolocationProvider implements GeolocationProvider {
  private watchId: Maybe<number>;

  position: GeolocationPosition = {
    coords: {
      accuracy: 0,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude: 0,
      longitude: 0,
      speed: null,
    },
    timestamp: 0,
  };

  constructor(private positionOptions?: PositionOptions) {
    makeObservable(this, {
      position: observable.deep,
      error: computed.struct,
    });

    onBecomeObserved(this, 'position', () => {
      this.activate();
    });
    onBecomeUnobserved(this, 'position', () => {
      this.deactivate();
    });
  }

  get error() {
    return permissions.geolocation.error;
  }

  activate() {
    if (globalThis.navigator && 'geolocation' in globalThis.navigator) {
      globalThis.navigator.geolocation.getCurrentPosition(
        action((position) => {
          this.position = position;
        }),
        undefined,
        this.positionOptions,
      );

      this.watchId = globalThis.navigator.geolocation.watchPosition(
        action((position) => {
          this.position = position;
        }),
        undefined,
        this.positionOptions,
      );

      return true;
    }

    return false;
  }

  deactivate(): void {
    if (
      this.watchId != null &&
      globalThis.navigator &&
      'geolocation' in globalThis.navigator
    ) {
      globalThis.navigator.geolocation.clearWatch(this.watchId);
    }
  }
}

/**
 * Reactive geolocation info API.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/geolocation.html)
 * [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
 */
export interface GeolocationInfo {
  permission: PermissionInfo;
  provider?: GeolocationProvider;
  position: GeolocationPosition;
}

/**
 * Reactive geolocation API for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/geolocation.html)
 * [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
 */
export const geolocation = makeObservable<GeolocationInfo>(
  {
    get permission() {
      return permissions.geolocation;
    },
    get position(): GeolocationPosition {
      if (!this.provider) {
        this.provider = new BaseGeolocationProvider();
      }

      return this.provider.position;
    },
  },
  {
    position: computed.struct,
  },
);
