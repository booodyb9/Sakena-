package com.sakina.app;

import android.app.*;
import android.content.*;
import android.media.*;
import android.media.session.*;
import android.os.*;
import org.json.*;
import java.util.Locale;

public class PlaybackService extends Service {
    public static volatile String snapshot = "{}";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private MediaSession session;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private JSONArray queue = new JSONArray();
    private int queueIndex = -1;
    private String url = "", title = "القرآن الكريم", artist = "سكينة", error = "";
    private boolean ready = false, desiredPlay = false, ended = false, repeat = false, autoNext = false, resumeAfterFocus = false;
    private float speed = 1f;
    private long sleepAt = 0;
    private static final String CHANNEL = "sakina-playback";
    private static final int NOTIFICATION = 1;
    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            if (sleepAt > 0 && System.currentTimeMillis() >= sleepAt) { sleepAt = 0; pause(); }
            publish();
            handler.postDelayed(this, 500);
        }
    };
    @Override public void onCreate() {
        super.onCreate();
        NotificationManager notifications = getSystemService(NotificationManager.class);
        notifications.createNotificationChannel(new NotificationChannel(CHANNEL, "تلاوة القرآن", NotificationManager.IMPORTANCE_LOW));
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
            .setOnAudioFocusChangeListener(change -> {
                if (change == AudioManager.AUDIOFOCUS_GAIN && resumeAfterFocus) { resumeAfterFocus = false; play(); }
                else if (change < 0) {
                    boolean resume = change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT && isPlaying();
                    pause(); resumeAfterFocus = resume;
                }
            }).build();
        session = new MediaSession(this, "Sakina");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { play(); }
            @Override public void onPause() { pause(); }
            @Override public void onStop() { pause(); seek(0); }
            @Override public void onSeekTo(long pos) { seek(pos / 1000d); }
            @Override public void onSkipToNext() { step(1); }
            @Override public void onSkipToPrevious() { step(-1); }
        });
        session.setActive(true);
        startForeground(NOTIFICATION, notification());
        handler.post(ticker);
    }
    private boolean isPlaying() {
        try { return ready && player != null && player.isPlaying(); } catch (Exception ignored) { return false; }
    }
    private PendingIntent action(String command, int code) {
        Intent intent = new Intent(this, PlaybackService.class).putExtra("command", "{\"action\":\"" + command + "\"}");
        return PendingIntent.getService(this, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private Notification notification() {
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
            .setSmallIcon(com.sakina.app.R.drawable.ic_stat).setContentTitle(title).setContentText(artist)
            .setContentIntent(open).setOnlyAlertOnce(true).setOngoing(isPlaying()).setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous, "السابق", action("previous", 1)).build())
            .addAction(new Notification.Action.Builder(isPlaying() ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                isPlaying() ? "إيقاف مؤقت" : "تشغيل", action(isPlaying() ? "pause" : "play", 2)).build())
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next, "التالي", action("next", 3)).build())
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2))
            .build();
    }
    private void updateNotification() {
        getSystemService(NotificationManager.class).notify(NOTIFICATION, notification());
    }
    private void load(String nextUrl) {
        // Playback URLs come from the bundled/validated catalog; never accept local files.
        android.net.Uri source = android.net.Uri.parse(nextUrl);
        String host = source.getHost();
        if (!"https".equals(source.getScheme()) || host == null || !(host.equals("mp3quran.net") || host.endsWith(".mp3quran.net")) || source.getUserInfo() != null) { error = "invalid-url"; publish(); return; }
        if (player != null) { player.release(); player = null; }
        url = nextUrl; ready = false; desiredPlay = false; ended = false; error = "";
        player = new MediaPlayer();
        MediaPlayer current = player;
        current.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
        current.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
        current.setOnPreparedListener(mp -> {
            if (mp != player) return;
            ready = true; mp.setLooping(repeat); setSpeed(speed);
            if (desiredPlay) play();
            publish(); updateNotification();
        });
        current.setOnCompletionListener(mp -> {
            if (mp != player) return;
            if (autoNext && queueIndex >= 0 && queueIndex + 1 < queue.length()) { step(1); return; }
            desiredPlay = false; ended = true; publish(); updateNotification();
            stopForeground(false);
        });
        current.setOnErrorListener((mp, what, extra) -> {
            if (mp != player) return true;
            error = "media-error"; ready = false; desiredPlay = false;
            publish(); updateNotification(); stopForeground(false); return true;
        });
        try { current.setDataSource(url); current.prepareAsync(); }
        catch (Exception ex) { error = "load-error"; desiredPlay = false; publish(); stopForeground(false); }
        for (int i = 0; i < queue.length(); i++) if (queue.optJSONObject(i).optString("url").equals(url)) { queueIndex = i; break; }
        updateNotification();
    }
    private void play() {
        desiredPlay = true; resumeAfterFocus = false; ended = false;
        startForeground(NOTIFICATION, notification());
        if (!ready || player == null) { publish(); return; }
        try {
            if (audioManager.requestAudioFocus(focusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                player.start(); setSpeed(speed);
            } else { desiredPlay = false; error = "audio-focus"; }
        } catch (Exception ex) { error = "play-error"; desiredPlay = false; }
        publish(); updateNotification();
    }
    private void pause() {
        desiredPlay = false; resumeAfterFocus = false;
        try { if (isPlaying()) player.pause(); } catch (Exception ignored) {}
        audioManager.abandonAudioFocusRequest(focusRequest);
        publish(); updateNotification(); stopForeground(false);
    }
    private void seek(double seconds) {
        if (ready && player != null) {
            try { player.seekTo(Math.max(0L, Math.min((long)(seconds * 1000), player.getDuration())), MediaPlayer.SEEK_CLOSEST); ended = false; } catch (Exception ignored) {}
        }
        publish();
    }
    private void setSpeed(float value) {
        speed = Math.max(.5f, Math.min(2f, value));
        if (ready && player != null) {
            boolean wasPlaying = isPlaying();
            try { player.setPlaybackParams(new PlaybackParams().setSpeed(speed)); if (!wasPlaying) player.pause(); } catch (Exception ignored) {}
        }
    }
    private void step(int direction) {
        int next = queueIndex + direction;
        if (next < 0 || next >= queue.length()) return;
        queueIndex = next;
        JSONObject item = queue.optJSONObject(next);
        title = item.optString("title", "القرآن الكريم"); artist = item.optString("artist", "سكينة");
        load(item.optString("url")); desiredPlay = true;
        startForeground(NOTIFICATION, notification());
    }
    private void publish() {
        try {
            long position = ready && player != null ? player.getCurrentPosition() : 0;
            long duration = ready && player != null ? player.getDuration() : 0;
            JSONObject state = new JSONObject().put("url", url).put("position", position / 1000d)
                .put("duration", duration / 1000d).put("paused", !isPlaying()).put("ready", ready)
                .put("ended", ended).put("error", error).put("rate", speed).put("loop", repeat).put("autoNext", autoNext).put("sleepAt", sleepAt);
            if (queueIndex >= 0 && queueIndex < queue.length()) state.put("track", queue.optJSONObject(queueIndex));
            snapshot = state.toString();
            session.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, artist).putLong(MediaMetadata.METADATA_KEY_DURATION, duration).build());
            session.setPlaybackState(new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_STOP |
                    PlaybackState.ACTION_SEEK_TO | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS)
                .setState(isPlaying() ? PlaybackState.STATE_PLAYING : ready ? PlaybackState.STATE_PAUSED : PlaybackState.STATE_BUFFERING,
                    position, speed).build());
        } catch (Exception ignored) {}
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION, notification());
        try {
            JSONObject command = new JSONObject(intent == null ? "{}" : intent.getStringExtra("command"));
            switch (command.optString("action")) {
                case "load": load(command.optString("url")); break;
                case "play": play(); break;
                case "pause": pause(); break;
                case "seek": seek(command.optDouble("position", 0)); break;
                case "rate": setSpeed((float)command.optDouble("rate", 1)); break;
                case "loop": repeat = command.optBoolean("loop"); if (ready) player.setLooping(repeat); break;
                case "next": step(1); break;
                case "previous": step(-1); break;
                case "configure":
                    title = command.optString("title", title); artist = command.optString("artist", artist);
                    autoNext = command.optBoolean("autoNext", autoNext);
                    sleepAt = command.optLong("sleepAt", 0);
                    JSONArray value = command.optJSONArray("queue"); if (value != null) queue = value;
                    queueIndex = -1;
                    for (int i = 0; i < queue.length(); i++) if (queue.optJSONObject(i).optString("url").equals(url)) { queueIndex = i; break; }
                    break;
            }
        } catch (Exception ex) { error = "command-error"; }
        publish(); updateNotification();
        if (!desiredPlay && ready) stopForeground(false);
        return START_NOT_STICKY;
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        handler.removeCallbacks(ticker);
        if (player != null) player.release();
        audioManager.abandonAudioFocusRequest(focusRequest);
        session.release(); snapshot = "{}"; super.onDestroy();
    }
}
