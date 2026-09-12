import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

export interface BroadcastChannelData<TMessage> {
  readonly name: string;
  readonly isSupported: boolean;
  readonly message: TMessage | null;
  readonly error?: Event;
  postMessage(message: TMessage): void;
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
  let error: Event | undefined;
  let messageListener: ((event: MessageEvent<TMessage>) => void) | undefined;
  let errorListener: ((event: Event) => void) | undefined;

  const ensureChannel = () => {
    if (typeof globalThis.BroadcastChannel !== 'function') {
      throw createUnsupportedError();
    }

    channel ??= new globalThis.BroadcastChannel(name);
    return channel;
  };

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
    postMessage(message) {
      ensureChannel().postMessage(message);
    },
    close() {
      if (!channel) {
        return;
      }

      if (messageListener) {
        channel.removeEventListener('message', messageListener);
      }
      if (errorListener) {
        channel.removeEventListener('messageerror', errorListener);
      }
      channel.close();
      channel = undefined;
    },
  };

  const atom = createEnhancedAtom(
    '',
    () => {
      const currentChannel = ensureChannel();
      messageListener = (event) => {
        message = event.data;
        atom.reportChanged();
      };
      errorListener = (event) => {
        error = event;
        atom.reportChanged();
      };
      currentChannel.addEventListener('message', messageListener);
      currentChannel.addEventListener('messageerror', errorListener);
    },
    () => {
      if (channel && messageListener) {
        channel.removeEventListener('message', messageListener);
      }
      if (channel && errorListener) {
        channel.removeEventListener('messageerror', errorListener);
      }
      messageListener = undefined;
      errorListener = undefined;
    },
  );

  data._atom = atom;
  return data;
};
