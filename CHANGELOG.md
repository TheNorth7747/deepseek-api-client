# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)；版本号以仓库根 `package.json` 为唯一来源，
Android 的 `versionCode` 由它换算（`major*10000 + minor*100 + patch`）。

## [1.2.0] - 2026-11-19

### 新增

- **应用内检查更新**：设置 → 版本 → 检查更新，读取本仓库 `releases/latest` 的 tag 与当前版本比较；
  有新版本时弹层展示更新说明。
- **应用内下载与安装**：`@capacitor/filesystem` 下载 APK 到缓存目录，新增原生插件 `AppUpdater`
  通过 `FileProvider` + `Intent.ACTION_VIEW` 拉起系统安装器（`REQUEST_INSTALL_PACKAGES`）。
- **设置页 GitHub 仓库入口**：版本行下方展示仓库地址，点击用系统浏览器打开（`AppUpdater.openExternal`）。
- `CHANGELOG.md` 与 `CONTRIBUTING.md`。

### 变更

- 版本号改为**单一来源**：`android/app/build.gradle` 读取 `package.json` 并换算 `versionCode`，
  前端通过构建期常量 `__APP_VERSION__` 展示，消除「界面版本与 APK 版本不一致」导致误判更新的问题。

### 修复

- 升级后本地数据是否保留的疑虑：确认同包名 + 同签名 + `versionCode` 递增属覆盖安装，
  对话（IndexedDB）与设置（localStorage）均保留；文档补充会丢数据的四种情形。

## [1.1.0] - 2026-11-19

### 新增

- **动效体系**：统一 motion token（`src/app/motion.css`）；附件面板展开/收起、会话切换、设置弹层、
  设置分区切换（滑动底板 + 内容淡入）四处补上过渡；全局按压反馈（80ms → `scale(.97)`）与主按钮辉光。
- **语音可用**：根因是 Capacitor WebView 不实现 `onPermissionRequest`，`getUserMedia` 必然失败；
  在 `MainActivity` 放行 `RESOURCE_AUDIO_CAPTURE` 并申请 `RECORD_AUDIO`。
  交互改为「按住说话 + 上滑取消（蓝→红）+ 光效」。
- **原生定位**：自定义插件 `DeviceLocation`（`LocationManager` + `Geocoder`）；
  Geocoder 不可用时用 363 个地级市中心坐标离线兜底；设置页打开即自动填好省市。

### 变更

- Android 清单补齐 `RECORD_AUDIO`、`MODIFY_AUDIO_SETTINGS`、`ACCESS_COARSE/FINE_LOCATION`。

## [1.0.0] - 2026-11-18

### 新增

- 首个可用版本：基于官方开源前端 `chat-demo` + Capacitor Android 壳。
- 模型可选（`deepseek-flash` / `deepseek-v4-pro`）与逐条 token/费用展示。
- 移动端界面：顶栏「静音 / 新对话」胶囊、抽屉堆叠过渡、附件面板、安全区适配。
- 导出改为「写缓存 + 系统分享」（WebView 不支持 `<a download>`）。
- 官方鲸鱼 + `API+` 角标的应用图标与启动图。
