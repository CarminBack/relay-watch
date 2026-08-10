# 中转站验真台

公开展示中转站名称、网站、Telegram 频道、核验结论与可复核证据。站点和数据 API 都部署在 Cloudflare 边缘，不使用自有服务器。

## 本地开发

```bash
npm install
npm run dev
```

## 管理后台

管理员入口：`https://mewinyou.us.ci/admin`。后台由 Cloudflare Access 保护，记录存储在 Cloudflare D1；保存后公开页会直接读取最新数据，无需重新部署。新账号完成 Zone 转移和 Access 启用后，登录白名单邮箱即可使用。

后台支持草稿、发布、编辑和删除。正式发布非演示记录时至少填写一项可复核证据。

## 添加记录（代码方式）

`src/data.ts` 只保留本地开发的降级演示数据。线上记录通过后台写入 D1；只发布有可重复测试和原始材料支撑的记录，未经核验的线索保留在 GitHub Issues，不直接写入公开列表。

状态说明：

- `confirmed`：证据链完整，确认宣传与实测不符。
- `insufficient`：出现异常，但样本或材料不足以下结论。
- `cleared`：复核后未发现问题，或站方反证成立。
- `demo`：仅用于展示页面结构，不是实际核验结论。

## 验证与发布

```bash
npm run lint
npm run build
npx wrangler d1 migrations apply relay-watch --remote
npx wrangler deploy
```

线上域名：`https://mewinyou.us.ci`
