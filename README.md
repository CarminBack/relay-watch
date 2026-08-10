# 中转站验真台

公开展示中转站名称、网站、Telegram 频道、核验结论与可复核证据。站点为纯静态前端，部署在 Cloudflare 边缘，不使用自有服务器。

## 本地开发

```bash
npm install
npm run dev
```

## 添加记录

编辑 `src/data.ts` 中的 `relayRecords`。只发布有可重复测试和原始材料支撑的记录；未经核验的线索保留在 GitHub Issues，不直接写入公开列表。

状态说明：

- `confirmed`：证据链完整，确认宣传与实测不符。
- `insufficient`：出现异常，但样本或材料不足以下结论。
- `cleared`：复核后未发现问题，或站方反证成立。
- `demo`：仅用于展示页面结构，不是实际核验结论。

## 验证与发布

```bash
npm run lint
npm run build
npx wrangler deploy
```

线上域名：`https://mewinyou.us.ci`
