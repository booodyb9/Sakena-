package com.sakina.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String ORIGIN = "appassets.androidplatform.net";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(248, 242, 229));
        setContentView(webView);
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            }
            return insets;
        });
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebChromeClient(new WebChromeClient());
        WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            // AAPT expands .gz assets and removes their suffix in the APK.
            // Keep the same web URLs; compressedJson also accepts plain JSON.
            .addPathHandler("/assets/", path -> assets.handle(
                path.startsWith("data/") && path.endsWith(".json.gz")
                    ? path.substring(0, path.length() - 3) : path)).build();
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && ORIGIN.equals(url.getHost())) return false;
                if ("https".equals(url.getScheme()) || "http".equals(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        webView.addJavascriptInterface(new AudioBridge(), "SakinaNative");
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
        webView.loadUrl("https://" + ORIGIN + "/assets/index.html");
    }
    private class AudioBridge {
        @JavascriptInterface public String state() { return PlaybackService.snapshot; }
        @JavascriptInterface public void command(String json) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, PlaybackService.class).putExtra("command", json);
                    startForegroundService(intent);
                } catch (Exception ignored) {}
            });
        }
    }
    @Override public void onBackPressed() {
        webView.evaluateJavascript("window.dispatchEvent(new Event('sakina-back'))", null);
    }
    @Override protected void onDestroy() {
        webView.removeJavascriptInterface("SakinaNative");
        webView.destroy();
        super.onDestroy();
    }
}
