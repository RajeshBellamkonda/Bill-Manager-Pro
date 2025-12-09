package com.billmanager.pro;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static final int NOTIFICATION_PERMISSION_CODE = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Request notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        NOTIFICATION_PERMISSION_CODE);
            }
        }

        // Create notification channel for Android O+
        createNotificationChannel();

        // Initialize WebView
        webView = findViewById(R.id.webview);
        setupWebView();

        // Load the app
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Enable DOM storage (required for IndexedDB)
        webSettings.setDomStorageEnabled(true);
        
        // Enable database storage
        webSettings.setDatabaseEnabled(true);
        
        // Enable local storage
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Allow file access from file URLs
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        
        // Enable mixed content (if needed)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        
        // Enable caching
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setAppCacheEnabled(true);
        
        // Enable zooming
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        
        // Set user agent
        webSettings.setUserAgentString(webSettings.getUserAgentString() + " BillManagerPro/1.0");
        
        // Set WebViewClient to handle links
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Stay in WebView for all URLs
                view.loadUrl(url);
                return true;
            }
        });
        
        // Set WebChromeClient for advanced features
        webView.setWebChromeClient(new WebChromeClient());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Bill Reminders";
            String description = "Notifications for upcoming bill payments";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel("bill_reminders", name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle back button
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
