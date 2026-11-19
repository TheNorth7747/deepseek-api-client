# 从网页版到 APK：构建、样式对照与剩余差距

> 本文只写**做成的事**、**怎么复现**、**和官方 App 还差什么**。

## 一、官方有没有移动端源码

没有。截至 2026-11：

- 官方开源仓库只有前端 demo：[deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo)（MIT），本仓库由它派生。
- Android / iOS App **闭源**，社区提过请求未获回应：[Issue #692](https://github.com/deepseek-ai/DeepSeek-V3/issues/692)。
- 2026-11-13「开放 App 功能」开放的是**能力 API + 前端 demo**，不含 App 源码。

所以路线只能是：复用这份前端，套 Capacitor 壳。

## 二、APK 构建（本机已验证可出包）

```bash
# 依赖（只装一次）
pnpm add -D @capacitor/cli
pnpm add @capacitor/core @capacitor/android

# 出包
pnpm build                 # 产出 dist/
npx cap sync android       # dist → android/app/src/main/assets/public
cd android
./gradlew assembleDebug    # 或 assembleRelease（自签）
```

产物：
- `android/app/build/outputs/apk/debug/app-debug.apk`（debug 签名，可直接 air 传给他人安装）
- `android/app/build/outputs/apk/release/app-release.apk`（自签，`debuggable=false`）

工程参数：`applicationId com.example.deepseekchat`、`minSdk 24`（Android 7.0）、`targetSdk 36`、`versionName 1.0`。

### 环境要求（Windows 实测）

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| JDK | 21（Temurin） | AGP 8.x + Capacitor 8 需要 17+；系统自带的 JDK 8 不行 |
| Android SDK | platform 36 + build-tools 36.0.0 | Capacitor 8 的 `compileSdkVersion = 36` |
| Gradle | 8.14.3（wrapper 自动下载） | 首次构建约 4 分钟，之后约 20 秒 |

`android/local.properties` 必须是本机 SDK 路径（已在 `.gitignore` 忽略整目录）。

### 发布签名

`android/app/build.gradle` 里已加 `signingConfigs.release`，读取
`android/app/deepseek-release.keystore`（alias `deepseek`，口令默认 `deepseek2026`，
可用环境变量 `DSH_KS_PASS` 覆盖）。

**证书一旦丢失就无法对已装应用做升级**，请自行备份；`*.keystore` 已在 `.gitignore`。

## 三、CORS：已实测通过，不需要 CapacitorHttp

Capacitor 的 WebView origin 是 `https://localhost`。实测请求：

```
POST https://api.deepseek.com/anthropic/v1/messages
Origin: https://localhost
→ 401 (预期的鉴权失败) + Access-Control-Allow-Origin: https://localhost
  + Access-Control-Allow-Credentials: true + Vary: origin
```

说明服务端**回显 origin**，所以 `fetch` + SSE 在壳里能照常工作，`src/services/api/sse.ts`
不需要改写成插件事件流。若将来服务端收紧为白名单，需要改用 `CapacitorHttp`。

## 四、真机（MuMu 模拟器 / Android 15）实测记录

测试环境：MuMu 模拟器 6.8.14（Android 15，x86_64，900×1600 @240dpi，WebView origin `https://localhost`）。

**已验证通过**

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 安装与冷启动 | release 4.92 MB 安装成功，无崩溃，无白屏（首帧偶发空屏，重拍即可） | 截图 `mumu-33-release-final.png` |
| WebView 渲染 | 空态标识、问候语、能力胶囊、输入框、底部说明全部正常 | 同上 |
| 触摸交互 | 能力胶囊可切换（背景 `rgb(239,243,255)` → `rgb(231,236,255)`，即 0.08→0.18 透明度） | 像素采样 |
| 键盘 | 点输入框弹出输入法，`mInputShown=true` | dumpsys |
| 抽屉 | 圆形按钮可打开，含搜索框 | `mumu-25-drawer-fixed.png` |
| 抽屉 → 设置 | 修复后可点击（见下） | `mumu-26-settings-opened.png` |
| 设置 → 模型 | 显示 `DeepSeek-V4.1-Flash-1017 · 上下文 1M · 输出上限 384K`，可下拉切换 | 同上 |
| 网络 / CORS | 应用内 `fetch('https://api.deepseek.com/models')` 返回 **401 且 CORS 通过**（被拦会抛 TypeError） | CDP Runtime.evaluate |
| 安全区兜底 | Android WebView 里 `env(safe-area-inset-top)` = **0px**，`--app-safe-top` = **24px** 生效，顶栏未被状态栏压住 | CDP 实测 |

**发现并修复的 Bug（会阻断使用）**

抽屉底部「设置」点不动。CDP 命中测试栈为 `DIV.list → BUTTON.settings`，量得：
- `.listWrap` y=150..979，而 `.list` 从 198 溢到 **1027**（多出 48px，正是新加搜索框的高度）；
- `.list { height: 100% }` + `.listWrap { position: relative }` → 整个列表层叠在静态定位的 `.bottom` 之上，把设置行的点击吞掉。

修法：把搜索框移出 `.listWrap`（成为其兄弟节点），并给 `.bottom` 加 `position: relative; z-index: 1` 兜住以后再出现溢出。

**`capture` 实测结论（重要）**

点「拍照」并不会唤起相机：日志显示打开的是 `com.android.providers.media.photopicker.PhotoPickerGetActivity`——**Capacitor 的 WebView 文件选择器不识别 `<input capture>`**。
处理：原生 Android 下先隐藏「拍照」卡片（只剩「相册 / 文件」），接入方式见下节。

**测试工具链备注**

- `adb shell input tap x y` 在本机被吞（0ms 点击不生效），改用 `input swipe x y x y 120`（带按压时长的点击）即可。
- 冷启动后立即 `screencap` 可能拿到空白帧，隔 2–3 秒重拍。
- debug APK 打开 WebView 调试：`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`，再用 CDP 的 `Runtime.evaluate`；release APK 无此通道。

## 五、下一步：让「拍照」真的调起相机

```bash
pnpm add @capacitor/camera
```

```jsonc
// capacitor.config.json
"plugins": { "Camera": { "androidxExifInterfaceVersion": "1.3.7" } }
```

`android/app/src/main/AndroidManifest.xml` 添加：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

然后 ChatInput 的「拍照」按钮改为：

```ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const photo = await Camera.getPhoto({
  resultType: CameraResultType.Uri,
  source: CameraSource.Camera,
  quality: 90,
})
const blob = await (await fetch(photo.webPath!)).blob()
acceptFiles([new File([blob], `photo-${Date.now()}.${photo.format}`, { type: blob.type })])
```

接完后把 `isNativeAndroid()` 的隐藏判断去掉即可。

## 六、按官方截图做的样式对齐


参考：iOS 官方 App 2.7.1 的 10 张截图（空态 / 附件面板 / 会话 / 思考中 / 抽屉 / 设置 / 选择对话 / 外观菜单 / 深色会话）。

| 位置 | 官方做法 | 本项目改动 |
| --- | --- | --- |
| 顶栏 | 左悬浮圆形按钮 + 右胶囊（两枚图标） | 已改为圆形按钮 + 胶囊（暂只放「新建对话」一枚） |
| 空态 | 蓝色鲸形标识 + 「你好，让我们开始聊天吧」 | 新增自绘 `BrandMark`（鲸形 + 四角星点缀）+ 文案改为同一句 |
| 输入框 | 占位「发消息或按住说话」；能力胶囊常态淡蓝底蓝字 | 占位文案按移动端切换；胶囊改为淡蓝底 + 品牌蓝字，选中加深 |
| 附件 | 点 ⊕ 弹出「拍照 / 相册 / 文件」三卡片 | 已实现三卡片面板，走 `<input capture>` 与文件选择 |
| 底部说明 | 「回答由 AI 生成，仅供参考」 | 文案已改 |
| 抽屉 | 顶部搜索框 + 分组列表 | 已加搜索框（按标题过滤）；分组沿用原逻辑 |
| 设置 | 全屏弹层，状态栏下方起，顶部大圆角 | 高度改为 `100% - 顶部安全区 - 12px`，圆角 28px |
| 安全区 | 刘海与 home 条避让 | 原生壳里 `env()` 常为 0，改为 `--app-safe-top/bottom` 变量 + `env()` 兜底 |

自绘标识见 `src/components/session/BrandMark.tsx`；Android 启动图标与启动图由
`tools/make_android_icons.py` 生成（把官方图标换成自绘鲸形 + 星点，避免直接搬运）。

## 七、还没对齐的部分（按「能不能只改前端」分类）

**只改前端就能做**

- [ ] 设置页改成分组卡片（账户 / 应用 / 语音 / 关于）+ 行内图标与右侧值，去掉顶部两 tab
- [ ] 抽屉去掉「应用名 + 开启新对话」，底部改成「头像 + 昵称 + 更多」
- [ ] 会话列表项的长按菜单（置顶 / 删除），对应截图里的「选择对话」批量模式
- [ ] 消息长按菜单（复制 / 引用 / 删除）+ 底部操作条的图标排布（赞/踩/朗读/分享）
- [ ] 深色模式输入框与胶囊的对比度微调
- [ ] 顶栏右侧胶囊第二枚图标（官方是「声音/勿扰」，本项目无推送，暂缺语义）

**必须写原生**

- 推送通知、应用内更新、系统分享入站（分享文字直接进新会话）、相册保存、生物识别锁

## 八、分发注意

1. **包名/应用名是占位**：`com.example.deepseekchat`、label `DeepSeek`。上架或正式分发前请改包名（发布后不可改）与名称。
2. **debug APK 可直接 air 传安装**，但会提示「未知来源」；release 自签同理。
3. **换壳 = 换 origin**：WebView 里 localStorage（API Key、模型）与 IndexedDB（会话）是全新的，
   网页端的数据要「导出 ZIP → APK 内导入」。
4. 目前**没有 Service Worker**，冷启动必须联网取 index.html。
