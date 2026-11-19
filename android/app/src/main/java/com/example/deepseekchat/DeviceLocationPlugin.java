package com.example.deepseekchat;

import android.Manifest;
import android.content.Context;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;
import java.util.Locale;

/**
 * 原生定位：取一次粗略坐标并反查省/市，供设置页「自动获取」使用。
 * 只用系统 LocationManager + Geocoder，不引入 Google Play Services 依赖。
 */
@CapacitorPlugin(
        name = "DeviceLocation",
        permissions = {
                @Permission(
                        alias = "location",
                        strings = {
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                                Manifest.permission.ACCESS_FINE_LOCATION
                        })
        })
public class DeviceLocationPlugin extends Plugin {

    private static final String TAG = "DeviceLocation";
    private static final long TIMEOUT_MS = 12000;

    @PluginMethod
    public void getLocation(PluginCall call) {
        if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        resolveLocation(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == com.getcapacitor.PermissionState.GRANTED) {
            resolveLocation(call);
        } else {
            call.reject("permission-denied");
        }
    }

    private void resolveLocation(PluginCall call) {
        Context context = getContext();
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) {
            call.reject("location-unavailable");
            return;
        }

        Location best = null;
        for (String provider : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }) {
            try {
                if (!manager.isProviderEnabled(provider)) {
                    continue;
                }
                Location last = manager.getLastKnownLocation(provider);
                if (last != null && (best == null || last.getTime() > best.getTime())) {
                    best = last;
                }
            } catch (SecurityException | IllegalArgumentException ignored) {
                // 权限或 provider 不可用时继续尝试下一个
            }
        }

        if (best != null) {
            finish(call, best);
            return;
        }

        // 没有缓存坐标：请求一次定位，超时后失败退出
        Handler handler = new Handler(Looper.getMainLooper());
        final boolean[] done = { false };
        Runnable timeout = () -> {
            if (!done[0]) {
                done[0] = true;
                call.reject("location-timeout");
            }
        };
        handler.postDelayed(timeout, TIMEOUT_MS);

        android.location.LocationListener listener = new android.location.LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (done[0]) {
                    return;
                }
                done[0] = true;
                handler.removeCallbacks(timeout);
                try {
                    manager.removeUpdates(this);
                } catch (Exception ignored) {
                    // 已移除
                }
                finish(call, location);
            }

            @Override
            public void onProviderEnabled(String provider) {}

            @Override
            public void onProviderDisabled(String provider) {}

            @Override
            public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}
        };

        try {
            manager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0L, 0f, listener, Looper.getMainLooper());
            manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0L, 0f, listener, Looper.getMainLooper());
        } catch (SecurityException error) {
            done[0] = true;
            handler.removeCallbacks(timeout);
            call.reject("permission-denied");
        } catch (IllegalArgumentException error) {
            done[0] = true;
            handler.removeCallbacks(timeout);
            call.reject("location-unavailable");
        }
    }

    private void finish(PluginCall call, Location location) {
        JSObject result = new JSObject();
        result.put("latitude", location.getLatitude());
        result.put("longitude", location.getLongitude());
        result.put("accuracy", location.getAccuracy());

        Geocoder geocoder = new Geocoder(getContext(), Locale.CHINA);
        try {
            List<Address> addresses = geocoder.getFromLocation(location.getLatitude(), location.getLongitude(), 1);
            if (addresses != null && !addresses.isEmpty()) {
                Address address = addresses.get(0);
                result.put("countryCode", address.getCountryCode() == null ? "" : address.getCountryCode());
                result.put("province", address.getAdminArea() == null ? "" : address.getAdminArea());
                String city = address.getLocality();
                if (city == null || city.isEmpty()) {
                    city = address.getSubAdminArea();
                }
                result.put("city", city == null ? "" : city);
            }
        } catch (Exception error) {
            Log.w(TAG, "geocoder failed", error);
        }
        call.resolve(result);
    }
}
