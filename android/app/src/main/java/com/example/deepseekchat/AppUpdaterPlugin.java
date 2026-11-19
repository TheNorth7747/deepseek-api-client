package com.example.deepseekchat;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * 应用内更新安装：把下载到缓存目录的 APK 通过 FileProvider 交给系统安装器。
 *
 * 覆盖安装的前提是「同包名 + 同签名 + versionCode 递增」，满足时系统会保留应用数据，
 * WebView 的 IndexedDB / localStorage（对话、设置）不会丢。
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    @PluginMethod
    public void install(PluginCall call) {
        String fileName = call.getString("fileName", "update.apk");
        File apk = new File(getContext().getCacheDir(), fileName);
        if (!apk.exists()) {
            call.reject("apk-missing");
            return;
        }

        try {
            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("install-failed: " + error.getMessage());
        }
    }
}
