import { reaction } from 'mobx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBroadcastChannel } from './broadcast-channel.js';

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  readonly listeners = new Map<string, Set<(event: Event) => void>>();
  readonly postMessage = vi.fn();
  readonly close = vi.fn();

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(event: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeEventListener(event: string, listener: (event: Event) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  emit<TMessage>(event: string, data: TMessage) {
    const message = new MessageEvent<TMessage>(event, { data });
    this.listeners.get(event)?.forEach((listener) => {
      listener(message);
    });
  }
}

describe('createBroadcastChannel', () => {
  afterEach(() => {
    FakeBroadcastChannel.instances = [];
    vi.unstubAllGlobals();
  });

  it('reacts to messages and posts through the native channel', () => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

    const channel = createBroadcastChannel<{ type: 'logout' }>('app');
    const messages: Array<{ type: 'logout' }> = [];
    const dispose = reaction(
      () => channel.message,
      (message) => {
        if (message) messages.push(message);
      },
    );
    const nativeChannel = FakeBroadcastChannel.instances[0]!;

    nativeChannel.emit('message', { type: 'logout' });
    channel.postMessage({ type: 'logout' });

    expect(channel.isSupported).toBe(true);
    expect(channel.message).toEqual({ type: 'logout' });
    expect(messages).toEqual([{ type: 'logout' }]);
    expect(nativeChannel.postMessage).toHaveBeenCalledWith({ type: 'logout' });

    dispose();
    channel.close();
    expect(nativeChannel.close).toHaveBeenCalledTimes(1);
  });

  it('reports unsupported environments', () => {
    vi.stubGlobal('BroadcastChannel', undefined);

    const channel = createBroadcastChannel('app');

    expect(channel.isSupported).toBe(false);
    expect(channel.postMessage('message')).toBe(false);
    expect(channel.error).toBeInstanceOf(Error);
  });
});
