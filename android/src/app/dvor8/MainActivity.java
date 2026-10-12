package app.dvor8;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * The game is a web page, and this is the window it is shown in. Nothing here plays: it serves the page's
 * own files out of the package, hands a photograph in from the camera or the gallery, and hands a line or
 * a picture out to the phone's share sheet.
 *
 * The files are served from an https address that exists only inside this window. A page opened from a
 * file:// address may not load modules or WebAssembly, and the detector is both.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final int PICK = 1;

    private WebView web;
    private ValueCallback<Uri[]> waiting;   // the page, waiting for its photograph
    private Uri shot;                       // where the camera was told to put one

    private static final Map<String, String> TYPES = new HashMap<>();
    static {
        TYPES.put("html", "text/html");
        TYPES.put("css", "text/css");
        TYPES.put("js", "text/javascript");
        TYPES.put("mjs", "text/javascript");
        TYPES.put("json", "application/json");
        TYPES.put("wasm", "application/wasm");
        TYPES.put("tflite", "application/octet-stream");
        TYPES.put("png", "image/png");
        TYPES.put("jpg", "image/jpeg");
    }

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        web.setBackgroundColor(0xff12052e);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                    // the album, the record, the day's headlines
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);                   // a picked photograph arrives as a content:// address
        s.setTextZoom(100);                              // the page is laid out in its own pixels
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "DvorApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!HOST.equals(url.getHost())) return null;   // the news: let it go to the network
                String path = url.getPath() == null || url.getPath().equals("/") ? "index.html" : url.getPath().substring(1);
                String ext = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : "";
                String type = TYPES.get(ext);
                if (type == null) type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                if (type == null) type = "application/octet-stream";
                try {
                    InputStream in = getAssets().open("www/" + path);
                    WebResourceResponse reply = new WebResourceResponse(type, type.startsWith("text/") || type.endsWith("json") ? "utf-8" : null, in);
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-store");   // an updated app must never show an old page
                    reply.setResponseHeaders(headers);
                    return reply;
                } catch (IOException missing) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new java.io.ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (HOST.equals(request.getUrl().getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); } catch (Exception none) { /* no browser */ }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (waiting != null) waiting.onReceiveValue(null);
                waiting = callback;
                shot = null;
                Intent ask = null;
                // СНЯТЬ ДВОР: the phone's own camera, writing straight into the gallery. That needs no
                // permission from Android 10 on; before that, the gallery is offered instead.
                if (params.isCaptureEnabled() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        ContentValues v = new ContentValues();
                        v.put(MediaStore.Images.Media.DISPLAY_NAME, "dvor-8-" + System.currentTimeMillis() + ".jpg");
                        v.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                        v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/DVOR-8");
                        shot = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                        ask = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, shot)
                                .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } catch (Exception none) { shot = null; ask = null; }
                }
                if (ask == null) ask = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*");
                try {
                    startActivityForResult(ask, PICK);
                } catch (Exception noApp) {
                    forget();
                    try {
                        startActivityForResult(new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*"), PICK);
                    } catch (Exception nothing) { waiting.onReceiveValue(null); waiting = null; }
                }
                return true;
            }
        });
        setContentView(web);
        if (saved == null) web.loadUrl(HOME); else web.restoreState(saved);
    }

    // An empty entry was made in the gallery for a photograph that was never taken: take it out again.
    private void forget() {
        if (shot != null) { try { getContentResolver().delete(shot, null, null); } catch (Exception none) { /* gone already */ } }
        shot = null;
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        if (request != PICK || waiting == null) { super.onActivityResult(request, result, data); return; }
        Uri from = null;
        if (result == RESULT_OK) {
            if (data != null && data.getData() != null) { from = data.getData(); forget(); }
            else if (shot != null) from = shot;
        } else forget();
        Uri local = from == null ? null : copyIn(from);
        waiting.onReceiveValue(local == null ? null : new Uri[] { local });
        waiting = null;
        shot = null;
    }

    // The photograph is copied into the app's own folder and the page is given the copy. Handed the
    // gallery's content:// address directly, the page received a file it could not read: in the emulator
    // (Android 14, WebView 113) the picture failed to load and the game said «снимок не читается».
    private Uri copyIn(Uri from) {
        File to = new File(getCacheDir(), "yard.jpg");
        try (InputStream in = getContentResolver().openInputStream(from); OutputStream out = new FileOutputStream(to)) {
            if (in == null) return null;
            byte[] buf = new byte[1 << 16];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            return Uri.fromFile(to);
        } catch (Exception failed) { return null; }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    /** What the page may ask of the phone: show a line, or a picture, to someone. Nothing else. */
    private class Bridge {
        @JavascriptInterface
        public boolean shareText(String text) {
            return send(new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text));
        }

        // The card is kept in the gallery (Pictures/DVOR-8) and offered to the share sheet from there.
        @JavascriptInterface
        public boolean sharePicture(String pngBase64, String name, String text) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
            try {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Images.Media.DISPLAY_NAME, name);
                v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/DVOR-8");
                Uri at = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                if (at == null) return false;
                try (OutputStream out = getContentResolver().openOutputStream(at)) { out.write(Base64.decode(pngBase64, Base64.DEFAULT)); }
                return send(new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, at)
                        .putExtra(Intent.EXTRA_TEXT, text).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
            } catch (Exception failed) { return false; }
        }

        private boolean send(final Intent what) {
            try {
                runOnUiThread(new Runnable() { @Override public void run() { startActivity(Intent.createChooser(what, null)); } });
                return true;
            } catch (Exception none) { return false; }
        }
    }
}
