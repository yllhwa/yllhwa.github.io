# yllhwa's blog

[blog.yllhwa.com](https://blog.yllhwa.com/) 的源码。基于 Astro 与 [astro-erudite](https://github.com/jktrn/astro-erudite) 重构，使用原生 CSS、TypeScript、`astro-icon` 和 pnpm。

## 开发

需要 Node.js 22.12 或更高版本，以及 pnpm 11。

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm check          # Astro / TypeScript 检查
pnpm build          # 检查并构建到 dist/
pnpm preview        # 本地预览构建产物
pnpm format         # 使用 Biome 格式化
pnpm deploy         # 构建并通过 SSH 部署
```

`pnpm deploy` 默认部署到 `root@blog.yllhwa.com:/www/wwwroot/blog.yllhwa.com`。运行机器需要可用的 SSH 密钥与 OpenSSH，也可以通过 `DEPLOY_HOST`、`DEPLOY_ROOT` 覆盖目标。部署前会在服务器创建备份，验证失败时自动恢复。

## 内容

- `src/content/blog/`：文章及其同目录资源
- `src/content/projects/`：开源项目（Stars / Forks 手动维护）
- `src/content/publications/`：科研成果
- `src/pages/about/`、`src/pages/friends/`：关于与友链页面

项目与科研是两个独立的 Astro 内容集合，但统一呈现在 `/project/`。

## 字体与图标

中文优先使用各平台系统字体；西文与数字使用仓库内的 IBM Plex Sans，代码使用 IBM Plex Mono，数学公式使用 STIX Two Math。标准图标由 `astro-icon` 加载本地 Iconify 图标集，自定义 SVG 来自旧站已部署资源。

主题基础代码遵循仓库中的 MIT License；文章与个人素材的权利归原作者所有。
