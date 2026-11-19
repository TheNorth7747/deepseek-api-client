package com.example.deepseekchat;

import android.Manifest;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

/**
 * 壳层能力：
 * 1. 让 WebView 里的 getUserMedia（录音）真正可用 —— 默认 Capacitor 不处理权限请求，
 *    网页侧拿不到麦克风会直接失败，表现为「语音不可用」。
 * 2. 注册原生定位插件，供设置页自动获取当前位置所在省市。
 */
public class MainActivity extends BridgeActivity {

    private static final int REQUEST_MEDIA = 1001;
    private PermissionRequest pendingMediaRequest;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DeviceLocationPlugin.class);
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);

        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                boolean wantsAudio = false;
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        wantsAudio = true;
                    }
                }
                if (!wantsAudio) {
                    request.deny();
                    return;
                }
                if (hasRecordPermission()) {
                    request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                    return;
                }
                pendingMediaRequest = request;
                requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, REQUEST_MEDIA);
            }
        });
    }

    private boolean hasRecordPermission() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_MEDIA || pendingMediaRequest == null) {
            return;
        }
        List<String> granted = new ArrayList<>();
        if (grantResults.length > 0 && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            granted.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
            pendingMediaRequest.grant(granted.toArray(new String[0]));
        } else {
            pendingMediaRequest.deny();
        }
        pendingMediaRequest = null;
    }
}
