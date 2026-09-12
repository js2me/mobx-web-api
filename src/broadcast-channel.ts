import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface BroadcastChannelData<TMessage> {
  readonly name: string;
  readonly isSupported: boolean;
  readonly message: TMessage | null;
  readonly error?: unknown;
  postMessage(message: TMessage): boolean;
  close(): void;
  _atom?: IEnhancedAtom;
}

const createUnsupportedError = () =>
  new Error('BroadcastChannel API is not supported');

/**
 * Creates a reactive BroadcastChannel wrapper for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/broadcast-channel.html)
 * [MDN BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
 */
export const createBroadcastChannel = <TMessage>(
  name: string,
): BroadcastChannelData<TMessage> => {
  let channel: BroadcastChannel | undefined;
  let message: TMessage | null = null;
  let error: unknown;

  const getOrCreateChannel = () => {
    if (typeof globalThis.BroadcastChannel !== 'function') {
      return undefined;
    }

    channel ??= new globalThis.BroadcastChannel(name);
    return channel;
  };

  const atom = createEnhancedAtom<{ detach?: VoidFunction }>(
    '',
    (self) => {
      const currentChannel = getOrCreateChannel();

      if (!currentChannel) {
        return;
      }

      const onMessage = (event: MessageEvent<TMessage>) => {
        message = event.data;
        self.reportChanged();
      };
      const onMessageError = (event: Event) => {
        error = event;
        self.reportChanged();
      };

      currentChannel.addEventListener('message', onMessage);
      currentChannel.addEventListener('messageerror', onMessageError);

      self.meta.detach = () => {
        currentChannel.removeEventListener('message', onMessage);
        currentChannel.removeEventListener('messageerror', onMessageError);
      };
    },
    (self) => {
      self.meta.detach?.();
      self.meta.detach = undefined;
    },
    {},
  );

  const data: BroadcastChannelData<TMessage> = {
    name,
    get isSupported() {
      return typeof globalThis.BroadcastChannel === 'function';
    },
    get message() {
      atom.reportObserved();
      return message;
    },
    get error() {
      atom.reportObserved();
      return error;
    },
    postMessage(nextMessage) {
      const currentChannel = getOrCreateChannel();

      if (!currentChannel) {
        error = createUnsupportedError();
        atom.reportChanged();
        return false;
      }

      try {
        currentChannel.postMessage(nextMessage);
        return true;
      } catch (nextError) {
        error = nextError;
        atom.reportChanged();
        return false;
      }
    },
    close() {
      atom.meta.detach?.();
      atom.meta.detach = undefined;
      channel?.close();
      channel = undefined;
    },
  };

  data._atom = atom;
  return data;
};
