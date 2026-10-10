# FitTrack

FitTrack 是一个移动优先的深色健康追踪 PWA，使用 Vite + React + TypeScript 构建，后端预留 Supabase Auth/Postgres/RLS 接入。

## 本地运行

```bash
cp .env.example .env.local
npm install
npm run dev
```

未配置 Supabase 时，应用会以演示数据运行，适合先验证布局和交互。

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
