import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface PermissionInfo {
  state: PermissionState;
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
}

type IPermissionAtom = IEnhancedAtom<{
  permissionStatus?: PermissionStatus;
}>;
const atoms = new Map<PermissionName, IPermissionAtom>();

const createPermissionInfo = (name: PermissionName): PermissionInfo => {
  return {
    get state(): PermissionState {
      if (!atoms.has(name) && 'permissions' in navigator) {
        const atom = createEnhancedAtom<IPermissionAtom['meta']>(
          process.env.NODE_ENV === 'production' ? '' : `${name}_permission`,
          (atom) => {
            if (!atom.meta.permissionStatus) {
              navigator.permissions
                .query({
                  name,
                })
                .then((status) => {
                  atom.meta.permissionStatus = status;
                  if (atom.meta.permissionStatus.state !== 'prompt') {
                    atom.reportChanged();
                  }
                  atom.meta.permissionStatus.addEventListener(
                    'change',
                    atom.reportChanged,
                  );
                });
            }
          },
          (atom) =>
            atom.meta.permissionStatus?.removeEventListener(
              'change',
              atom.reportChanged,
            ),
        );
        atoms.set(name, atom);
      }

      const atom = atoms.get(name);

      atom?.reportObserved();

      return atom?.meta.permissionStatus?.state ?? 'prompt';
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
