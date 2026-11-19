# 参与贡献

感谢你有兴趣改进这个项目。仓库是「官方开源前端 + 跨平台壳」的组合，改动请尽量保持这条边界：
**业务逻辑与接口不动，表现层与壳层能力可以改。**

## 开发环境

```bash
pnpm install
pnpm dev        # http://localhost:8090
pnpm type       # 类型检查
pnpm lint       # oxlint
pnpm build      # 产物在 dist/
```

Android 壳（需要 JDK 21 + Android SDK 36）：

```bash
pnpm build
npx cap sync android
cd android && ./gradlew assembleDebug   # 或 assembleRelease
```

细节见 [docs/mobile.md](docs/mobile.md)。

## 提交前自检

1. `pnpm type && pnpm lint && pnpm build` 三件套全绿；动到原生代码时额外跑一次 `gradlew assembleDebug`。
2. 新增文案同时补 `src/i18n/zh.ts` 与 `en.ts`。
3. 动效只改 `transform` / `opacity`，并确认 `prefers-reduced-motion` 下仍可用。
4. 涉及 IndexedDB / 存储结构变更时，说明迁移方式（历史对话不能丢）。
5. 不提交任何密钥、`.env`、`*.keystore` 或抓包凭证。

## 版本与发布

- 版本号只改根目录 `package.json` 的 `version`；`versionCode` 由 Gradle 自动换算（`1.2.0 → 10200`）。
- 发布：打 tag（`vX.Y.Z`）→ 在 Releases 上传 APK → 应用内「检查更新」自动读到这里。
- 覆盖安装要求：同包名 + 同签名 + `versionCode` 递增，否则用户需要卸载重装（会丢本地数据）。

## 提交信息

使用 `type: 简述` 形式，type 取 `feat` / `fix` / `docs` / `refactor` / `chore`，
例如 `feat: 设置页展示 GitHub 仓库入口`。

## 许可

提交的代码按 [MIT](LICENSE) 授权；上游 `deepseek-ai/chat-demo` 的版权声明必须保留。
