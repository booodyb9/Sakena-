import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

type SessionTrack = { key: string; title: string; artist: string; album: string } | null;
type Controls = {
  play: () => void;
  pause: () => void;
  stop: () => void;
  previous: (() => void) | null;
  next: (() => void) | null;
};
export default function useBackgroundAudio(
  audioRef: RefObject<HTMLAudioElement | null>,
  track: SessionTrack,
  controls: Controls
) {
  const callbacks = useRef(controls);
  callbacks.current = controls;
  const key = track?.key;
  const title = track?.title;
  const artist = track?.artist;
  const album = track?.album;
  const hasPrevious = !!controls.previous;
  const hasNext = !!controls.next;

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const audio = audioRef.current;
    if (!audio) return;
    const actions: MediaSessionAction[] = [
      'play', 'pause', 'stop', 'previoustrack', 'nexttrack',
      'seekbackward', 'seekforward', 'seekto',
    ];
    const handle = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { session.setActionHandler(action, handler); } catch { /* Unsupported actions remain native. */ }
    };
    const updatePosition = () => {
      if (!session.setPositionState) return;
      try {
        if (!key || !Number.isFinite(audio.duration) || audio.duration <= 0) {
          session.setPositionState(); return;
        }
        session.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate > 0 ? audio.playbackRate : 1,
          position: Math.max(0, Math.min(audio.currentTime, audio.duration)),
        });
      } catch { /* Position state is optional across browsers. */ }
    };
    const synchronize = () => {
      try { session.playbackState = !key ? 'none' : audio.paused || audio.ended ? 'paused' : 'playing'; } catch { /* Optional. */ }
      updatePosition();
    };
    const seek = (target: number) => {
      if (!Number.isFinite(target) || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = Math.max(0, Math.min(target, audio.duration));
      updatePosition();
    };
    try {
      session.metadata = key && typeof MediaMetadata !== 'undefined'
        ? new MediaMetadata({
          title, artist, album,
          artwork: [{ src: new URL('./icon.svg', window.location.href).href, sizes: '512x512', type: 'image/svg+xml' }],
        }) : null;
    } catch { /* Metadata is optional; the media element keeps playing. */ }
    actions.forEach(action => handle(action, null));
    if (key) {
      handle('play', () => callbacks.current.play());
      handle('pause', () => callbacks.current.pause());
      handle('stop', () => callbacks.current.stop());
      handle('previoustrack', hasPrevious ? () => callbacks.current.previous?.() : null);
      handle('nexttrack', hasNext ? () => callbacks.current.next?.() : null);
      handle('seekbackward', details => seek(audio.currentTime - (details.seekOffset ?? 10)));
      handle('seekforward', details => seek(audio.currentTime + (details.seekOffset ?? 10)));
      handle('seekto', details => { if (details.seekTime !== undefined) seek(details.seekTime); });
    }
    const events = ['play', 'playing', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'ratechange', 'timeupdate', 'seeked', 'emptied'];
    events.forEach(event => audio.addEventListener(event, synchronize));
    // Visibility changes only synchronize controls. They never pause or auto-resume audio.
    document.addEventListener('visibilitychange', synchronize);
    window.addEventListener('pageshow', synchronize);
    synchronize();
    return () => {
      events.forEach(event => audio.removeEventListener(event, synchronize));
      document.removeEventListener('visibilitychange', synchronize);
      window.removeEventListener('pageshow', synchronize);
      actions.forEach(action => handle(action, null));
      try { session.metadata = null; session.playbackState = 'none'; session.setPositionState?.(); } catch { /* Optional. */ }
    };
  }, [audioRef, key, title, artist, album, hasPrevious, hasNext]);
}
