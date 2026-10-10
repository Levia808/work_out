# FitTrack

FitTrack 是一个移动优先的深色健康追踪 PWA，使用 Vite + React + TypeScript 构建，后端预留 Supabase Auth/Postgres/RLS 接入。

## 本地运行

```bash
cp .env.example .env.local
npm install
npm run dev
```

未配置 Supabase 时，应用会以演示数据运行，适合先验证布局和交互。

## AI 配置

进入「设置 → AI 服务密钥」，只选择并填写一个服务的 API Key（千问或 DeepSeek），保存后应用只会调用当前选中的服务；切换服务并保存会清理另一服务的本地 Key。训练页的「AI 导入计划」支持拍照/选择计划图片，识别为结构化 JSON 后直接生成训练计划、动作目标与 todo 检查项。识别不到的内容不会由应用自行补全。

API Key 仅保存在当前浏览器的 localStorage，并由浏览器直接请求对应 AI 服务；发布前请结合你的安全要求决定是否采用服务端代理。

## 验证

```bash
npm run lint
npm run test
npm run build
```

## GitHub Pages

- 默认构建子路径为 `/work_out/`，可用 `VITE_BASE_PATH` 覆盖。
- Actions 需要配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` secrets。
- Pages 的 Site URL / Redirect URLs 需要加入 `https://Levia808.github.io/work_out/`。
- 构建流程会复制 `dist/index.html` 为 `dist/404.html`，支持 SPA 刷新回退。
