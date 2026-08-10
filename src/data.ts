export type RecordStatus = 'confirmed' | 'insufficient' | 'cleared' | 'demo'

export interface RelayRecord {
  id: string
  name: string
  website: string
  domain: string
  telegram: string
  telegramHandle: string
  status: RecordStatus
  statusLabel: string
  updatedAt: string
  summary: string
  claim: string
  observed: string
  sampleSize: number | null
  tags: string[]
  evidence: string[]
  visibility?: 'draft' | 'published'
  createdAt?: string
  modifiedAt?: string
}

// Publish only records backed by reproducible evidence. Never use this list for unverified accusations.
export const relayRecords: RelayRecord[] = [
  {
    id: 'demo-record',
    name: '演示记录（非真实曝光）',
    website: 'https://example.com',
    domain: 'example.com',
    telegram: 'https://t.me/example',
    telegramHandle: '@example',
    status: 'demo',
    statusLabel: '演示数据',
    updatedAt: '2026-08-10',
    summary: '这条记录只用于说明网站的字段、筛选和证据结构，不代表对任何真实主体的判断。',
    claim: '示例：宣传为原生模型输出',
    observed: '未进行真实测试',
    sampleSize: null,
    tags: ['示例', '等待真实数据'],
    evidence: ['站点公开承诺', '相同提示词复测结果', '原始响应与时间戳'],
  },
]
