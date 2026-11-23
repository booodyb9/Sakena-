import { useEffect } from 'react';
import type { RefObject } from 'react';

type NativeBridge = { command: (json: string) => void; state: () => string };
type NativeState = {
  url: string; position: number; duration: number; paused: boolean; ready: boolean;
  ended: boolean; error: string; rate: number; loop: boolean;
  track?: { reciterId: number; moshafId: number; surah: number; url: string };
};
declare global { interface Window { SakinaNative?: NativeBridge; } }
export const isNativeAudio = () => typeof window.SakinaNative?.command === 'function';
export function nativeCommand(value: Record<string, unknown>) {
  window.SakinaNative?.command(JSON.stringify(value));
}
export function useNativeAudio(ref: RefObject<HTMLAudioElement | null>) {
  useEffect(() => {
    const audio = ref.current;
    if (!audio || !isNativeAudio()) return;
    let state: NativeState = { url: '', position: 0, duration: 0, paused: true, ready: false, ended: false, error: '', rate: 1, loop: false };
    let pendingUrl = '';
    let disposed = false;
    const originals = new Map<string, PropertyDescriptor | undefined>();
    const emit = (name: string) => audio.dispatchEvent(new Event(name));
    const property = (name: string, descriptor: PropertyDescriptor) => {
      originals.set(name, Object.getOwnPropertyDescriptor(audio, name));
      Object.defineProperty(audio, name, { configurable: true, ...descriptor });
    };
    property('src', {
      get: () => state.url,
      set: (url: string) => { pendingUrl = url; state = { ...state, url, ready: false, position: 0, duration: 0, error: '', paused: true, ended: false }; },
    });
    property('currentSrc', { get: () => state.url });
    property('duration', { get: () => state.duration });
    property('paused', { get: () => state.paused });
    property('ended', { get: () => state.ended });
    property('readyState', { get: () => state.ready ? 4 : 0 });
    property('error', { get: () => state.error ? { code: 2, message: state.error } : null });
    property('currentTime', {
      get: () => state.position,
      set: (position: number) => { state.position = position; nativeCommand({ action: 'seek', position }); emit('seeked'); emit('timeupdate'); },
    });
    property('playbackRate', {
      get: () => state.rate,
      set: (rate: number) => { state.rate = rate; nativeCommand({ action: 'rate', rate }); emit('ratechange'); },
    });
    property('loop', {
      get: () => state.loop,
      set: (loop: boolean) => { state.loop = loop; nativeCommand({ action: 'loop', loop }); },
    });
    property('load', { value: () => { nativeCommand({ action: 'load', url: state.url }); emit('emptied'); emit('waiting'); } });
    property('play', { value: () => { nativeCommand({ action: 'play' }); return Promise.resolve(); } });
    property('pause', { value: () => { if (state.url) nativeCommand({ action: 'pause' }); state.paused = true; emit('pause'); } });
    function poll() {
      if (disposed) return;
      try {
        const next: NativeState = JSON.parse(window.SakinaNative!.state());
        if (!next.url || pendingUrl && next.url !== pendingUrl) return;
        if (next.url === pendingUrl) pendingUrl = '';
        const old = state;
        state = next;
        if (next.ready && (!old.ready || old.url !== next.url)) {
          emit('loadedmetadata'); emit('durationchange'); emit('canplay');
        }
        if (!next.paused && (old.paused || old.url !== next.url)) { emit('play'); emit('playing'); }
        if (next.paused && !old.paused) emit('pause');
        if (next.ended && !old.ended) emit('ended');
        if (next.error && next.error !== old.error) emit('error');
        emit('timeupdate');
        window.dispatchEvent(new CustomEvent('sakina-native-state', { detail: next }));
      } catch { /* A service may be starting or stopped. */ }
    }
    const timer = window.setInterval(poll, 500);
    window.addEventListener('focus', poll);
    document.addEventListener('visibilitychange', poll);
    poll();
    return () => {
      disposed = true; window.clearInterval(timer);
      window.removeEventListener('focus', poll);
      document.removeEventListener('visibilitychange', poll);
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(audio, key, descriptor);
        else Reflect.deleteProperty(audio, key);
      }
    };
  }, [ref]);
}
