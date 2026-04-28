package com.rayhanacafe.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import androidx.activity.OnBackPressedCallback;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;

public class MainActivity extends Activity {

    private WebView webView;
    private View splashView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 1;

    // ── تخزين موثوق مباشر على القرص — لا يُحذف إلا عند مسح بيانات التطبيق ──
    public class RhStorage {
        private final Context ctx;
        private static final String STORE_FILE = "rh_store.json";
        private static final String KEY_FILE   = "rh_keys.json";

        RhStorage(Context c) { ctx = c; }

        @JavascriptInterface
        public void save(String data) {
            writeFile(STORE_FILE, data);
        }

        @JavascriptInterface
        public String load() {
            return readFile(STORE_FILE);
        }

        @JavascriptInterface
        public void saveKey(String key, String value) {
            // حفظ مفتاح/قيمة منفصلة (بيانات Supabase، كلمة المرور، إلخ)
            try {
                String existing = readFile(KEY_FILE);
                org.json.JSONObject obj = existing != null
                    ? new org.json.JSONObject(existing)
                    : new org.json.JSONObject();
                obj.put(key, value);
                writeFile(KEY_FILE, obj.toString());
            } catch (Exception e) { /* ignore */ }
        }

        @JavascriptInterface
        public String loadKey(String key) {
            try {
                String raw = readFile(KEY_FILE);
                if (raw == null) return null;
                org.json.JSONObject obj = new org.json.JSONObject(raw);
                return obj.has(key) ? obj.getString(key) : null;
            } catch (Exception e) { return null; }
        }

        @JavascriptInterface
        public void removeKey(String key) {
            try {
                String raw = readFile(KEY_FILE);
                if (raw == null) return;
                org.json.JSONObject obj = new org.json.JSONObject(raw);
                obj.remove(key);
                writeFile(KEY_FILE, obj.toString());
            } catch (Exception e) { /* ignore */ }
        }

        private void writeFile(String name, String content) {
            try {
                File f = new File(ctx.getFilesDir(), name);
                FileWriter fw = new FileWriter(f, false);
                fw.write(content);
                fw.flush();
                fw.close();
            } catch (Exception e) { /* ignore */ }
        }

        private String readFile(String name) {
            try {
                File f = new File(ctx.getFilesDir(), name);
                if (!f.exists()) return null;
                BufferedReader br = new BufferedReader(new FileReader(f));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                br.close();
                String result = sb.toString().trim();
                return result.isEmpty() ? null : result;
            } catch (Exception e) { return null; }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupBackHandler();

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            );
        }

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.parseColor("#EDEAD8"));
        setContentView(layout);

        webView = new WebView(this);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        layout.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        splashView = buildSplash();
        layout.addView(splashView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setGeolocationEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // تسجيل الواجهة — متاحة لـ JavaScript كـ window.AndroidStorage
        webView.addJavascriptInterface(new RhStorage(this), "AndroidStorage");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file://") || url.contains("rayhanacaf") ||
                    url.contains("supabase.co")) {
                    return false;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                splashView.animate()
                    .alpha(0f)
                    .setDuration(300)
                    .setListener(new AnimatorListenerAdapter() {
                        @Override
                        public void onAnimationEnd(Animator animation) {
                            splashView.setVisibility(View.GONE);
                        }
                    });
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(
                String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onShowFileChooser(WebView webView,
                ValueCallback<Uri[]> filePathCallback,
                WebChromeClient.FileChooserParams fileChooserParams) {
                MainActivity.this.filePathCallback = filePathCallback;
                startActivityForResult(fileChooserParams.createIntent(), FILE_CHOOSER_REQUEST);
                return true;
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("موافق", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) { result.confirm(); }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        public void onCancel(DialogInterface d) { result.cancel(); }
                    })
                    .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("نعم", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) { result.confirm(); }
                    })
                    .setNegativeButton("لا", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) { result.cancel(); }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        public void onCancel(DialogInterface d) { result.cancel(); }
                    })
                    .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message,
                    String defaultValue, final JsPromptResult result) {
                final EditText input = new EditText(MainActivity.this);
                if (defaultValue != null) input.setText(defaultValue);
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton("موافق", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) {
                            result.confirm(input.getText().toString());
                        }
                    })
                    .setNegativeButton("إلغاء", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) { result.cancel(); }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        public void onCancel(DialogInterface d) { result.cancel(); }
                    })
                    .show();
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/public/index.html");
    }

    // ── حفظ عند الضغط على Home أو التبديل بين التطبيقات ──
    @Override
    protected void onPause() {
        // استدعاء الحفظ قبل super.onPause() لضمان تشغيل JS قبل تجميد الصفحة
        if (webView != null) {
            webView.evaluateJavascript(
                "(function(){ try{ if(typeof saveAll==='function') saveAll(); }catch(e){} })()",
                null
            );
            webView.onPause(); // إيقاف الرسوم فقط — لا يوقف JS
        }
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    // ── تنظيف كامل عند إغلاق التطبيق ──
    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private View buildSplash() {
        FrameLayout splash = new FrameLayout(this);
        splash.setBackgroundColor(Color.parseColor("#EDEAD8"));

        TextView label = new TextView(this);
        label.setText("ريحانة كافيه");
        label.setTextColor(Color.parseColor("#1A4A28"));
        label.setTextSize(32f);
        label.setGravity(Gravity.CENTER);
        label.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        );
        splash.addView(label, lp);
        return splash;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = (resultCode == RESULT_OK && data != null)
                ? WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                : null;
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void setupBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }
}
