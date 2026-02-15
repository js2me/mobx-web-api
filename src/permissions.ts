import { makeObservable, observable, runInAction } from 'mobx';
import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

type IPermissionAtom = IEnhancedAtom<{
  permissionStatus?: PermissionStatus;
  retry(): Promise<void>;
  error?: unknown;
}>;

export interface PermissionInfo {
  _atom?: IPermissionAtom;
  state: PermissionState;
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
  error?: unknown;
  retry(): Promise<void>;
}

const requestPermission = async (
  name: PermissionName,
  atom: IPermissionAtom,
) => {
  if (globalThis.navigator && 'permissions' in globalThis.navigator) {
    try {
      const status = await navigator.permissions.query({
        name,
      });

      atom.meta.permissionStatus = status;

      if (atom.meta.permissionStatus.state !== 'prompt') {
        atom.reportChanged();
      }

      atom.meta.permissionStatus.addEventListener('change', atom.reportChanged);
    } catch (e) {
      runInAction(() => {
        atom.meta.error = e;
      });
    }
  }
};

const getOrCreatePermissionAtom = (
  info: PermissionInfo,
  name: PermissionName,
): IPermissionAtom => {
  if (!info._atom) {
    info._atom = createEnhancedAtom<IPermissionAtom['meta']>(
      process.env.NODE_ENV === 'production' ? '' : `${name}_permission`,
      (atom) => {
        if (!atom.meta.permissionStatus) {
          // biome-ignore lint/nursery/noFloatingPromises: lazy permission query
          requestPermission(name, atom);
        }
      },
      (atom) =>
        atom.meta.permissionStatus?.removeEventListener(
          'change',
          atom.reportChanged,
        ),
      makeObservable<IPermissionAtom['meta']>(
        {
          retry: () => requestPermission(name, info._atom!),
        },
        {
          error: observable.ref,
        },
      ),
    );
  }

  return info._atom;
};

const createPermissionInfo = (name: PermissionName): PermissionInfo => {
  return {
    retry() {
      const atom = getOrCreatePermissionAtom(this, name);
      return atom.meta.retry();
    },
    get state(): PermissionState {
      const atom = getOrCreatePermissionAtom(this, name);
      atom.reportObserved();
      return atom.meta.permissionStatus?.state ?? 'prompt';
    },
    get isGranted() {
      return this.state === 'granted';
    },
    get isDenied() {
      return this.state === 'denied';
    },
    get isPrompt() {
      return this.state === 'prompt';
    },
    get error() {
      const atom = getOrCreatePermissionAtom(this, name);
      atom.reportObserved();
      return atom.meta.error;
    },
  };
};

export const permissions = new Proxy(
  {} as Record<PermissionName, PermissionInfo>,
  {
    get(target, property: PermissionName) {
      if (!target[property]) {
        target[property] = createPermissionInfo(property);
      }
      return target[property];
    },
  },
);
