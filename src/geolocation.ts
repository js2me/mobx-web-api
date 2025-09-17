import {
  action,
  computed,
  makeObservable,
  observable,
  onBecomeObserved,
  onBecomeUnobserved,
} from 'mobx';
import type { Maybe } from 'yummies/utils/types';
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

type GeolocationProvider = {
  position: GeolocationPosition;
  activate(): boolean;
  deactivate(): void;
};

let activeProvider: GeolocationProvider | undefined;

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

  constructor() {
    makeObservable(this, {
      position: observable.deep,
    });

    onBecomeObserved(this, 'position', () => {
      this.activate();
    });
    onBecomeUnobserved(this, 'position', () => {
      this.deactivate();
    });
  }

  activate() {
    if (globalThis.navigator && 'geolocation' in globalThis.navigator) {
      globalThis.navigator.geolocation.getCurrentPosition(
        action((position) => {
          this.position = position;
        }),
      );

      this.watchId = globalThis.navigator.geolocation.watchPosition(
        action((position) => {
          this.position = position;
        }),
      );

      return true;
    }

    return false;
  }

  deactivate(): void {
    if (this.watchId != null) {
      globalThis.navigator.geolocation.clearWatch(this.watchId);
    }
  }
}

export interface GeolocationInfo {
  permission: PermissionInfo;
  activeProvider: GeolocationProvider;
  position: GeolocationPosition;
}

export const geolocation = makeObservable<GeolocationInfo>(
  {
    get permission() {
      return permissions.geolocation;
    },
    get activeProvider() {
      if (!activeProvider) {
        activeProvider = new BaseGeolocationProvider();
      }

      return activeProvider;
    },
    get position(): GeolocationPosition {
      return this.activeProvider.position;
    },
  },
  {
    position: computed.struct,
  },
);
