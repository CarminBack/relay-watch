CREATE TABLE IF NOT EXISTS relay_records (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  domain TEXT NOT NULL,
  telegram TEXT NOT NULL,
  telegram_handle TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'insufficient', 'cleared', 'demo')),
  status_label TEXT NOT NULL,
  verification_date TEXT NOT NULL,
  summary TEXT NOT NULL,
  claim TEXT NOT NULL,
  observed TEXT NOT NULL,
  sample_size INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  evidence TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'published')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relay_records_visibility_date
  ON relay_records (visibility, verification_date DESC);

CREATE TABLE IF NOT EXISTS record_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  snapshot TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO relay_records (
  id, name, website, domain, telegram, telegram_handle, status, status_label,
  verification_date, summary, claim, observed, sample_size, tags, evidence, visibility
) VALUES (
  'demo-record',
  '演示记录（非真实曝光）',
  'https://example.com',
  'example.com',
  'https://t.me/example',
  '@example',
  'demo',
  '演示数据',
  '2026-08-10',
  '这条记录只用于说明网站的字段、筛选和证据结构，不代表对任何真实主体的判断。',
  '示例：宣传为原生模型输出',
  '未进行真实测试',
  NULL,
  '["示例","等待真实数据"]',
  '["站点公开承诺","相同提示词复测结果","原始响应与时间戳"]',
  'published'
);
