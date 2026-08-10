interface Env {
  DB: D1Database
  ASSETS: Fetcher
  ADMIN_EMAILS: string
}

interface RelayRecordRow {
  id: string
  name: string
  website: string
  domain: string
  telegram: string
  telegram_handle: string
  status: string
  status_label: string
  verification_date: string
  summary: string
  claim: string
  observed: string
  sample_size: number | null
  tags: string
  evidence: string
  visibility: string
  created_at: string
  modified_at: string
}

interface RecordInput {
  name: string
  website: string
  telegram: string
  status: 'confirmed' | 'insufficient' | 'cleared' | 'demo'
  verificationDate: string
  summary: string
  claim: string
  observed: string
  sampleSize: number | null
  tags: string[]
  evidence: string[]
  visibility: 'draft' | 'published'
}

const statusLabels: Record<RecordInput['status'], string> = {
  confirmed: '确认掺水',
  insufficient: '证据不足',
  cleared: '已澄清',
  demo: '演示数据',
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: jsonHeaders })
}

function parseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function rowToRecord(row: RelayRecordRow) {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    domain: row.domain,
    telegram: row.telegram,
    telegramHandle: row.telegram_handle,
    status: row.status,
    statusLabel: row.status_label,
    updatedAt: row.verification_date,
    summary: row.summary,
    claim: row.claim,
    observed: row.observed,
    sampleSize: row.sample_size,
    tags: parseArray(row.tags),
    evidence: parseArray(row.evidence),
    visibility: row.visibility,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
  }
}

function requireAdmin(request: Request, env: Env): string | null {
  const assertion = request.headers.get('cf-access-jwt-assertion')
  const email = request.headers.get('cf-access-authenticated-user-email')?.trim().toLowerCase()
  const allowed = env.ADMIN_EMAILS.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
  return assertion && email && allowed.includes(email) ? email : null
}

function validateMutationOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return origin === new URL(request.url).origin
}

function toStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${field} 必须是数组`)
  const items = value.map((item) => String(item).trim()).filter(Boolean)
  if (items.length > 30 || items.some((item) => item.length > 300)) throw new Error(`${field} 内容过长`)
  return items
}

function parseInput(value: unknown): RecordInput {
  if (!value || typeof value !== 'object') throw new Error('请求内容无效')
  const raw = value as Record<string, unknown>
  const required = ['name', 'website', 'telegram', 'status', 'verificationDate', 'summary', 'claim', 'observed', 'visibility']
  for (const field of required) {
    if (typeof raw[field] !== 'string' || !raw[field].trim()) throw new Error(`${field} 为必填项`)
  }

  const status = raw.status as RecordInput['status']
  const visibility = raw.visibility as RecordInput['visibility']
  if (!(status in statusLabels)) throw new Error('核验结论无效')
  if (!['draft', 'published'].includes(visibility)) throw new Error('发布状态无效')

  const website = new URL(String(raw.website).trim())
  const telegram = new URL(String(raw.telegram).trim())
  if (!['http:', 'https:'].includes(website.protocol)) throw new Error('网站地址必须使用 HTTP 或 HTTPS')
  if (telegram.protocol !== 'https:' || !['t.me', 'telegram.me'].includes(telegram.hostname)) {
    throw new Error('Telegram 频道必须是有效的 t.me 地址')
  }

  const verificationDate = String(raw.verificationDate).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verificationDate)) throw new Error('核验日期格式无效')

  const sampleSize = raw.sampleSize === null || raw.sampleSize === '' || raw.sampleSize === undefined
    ? null
    : Number(raw.sampleSize)
  if (sampleSize !== null && (!Number.isInteger(sampleSize) || sampleSize < 0 || sampleSize > 1_000_000)) {
    throw new Error('样本量必须是非负整数')
  }

  const fields = ['name', 'summary', 'claim', 'observed'] as const
  for (const field of fields) {
    if (String(raw[field]).trim().length > 2_000) throw new Error(`${field} 内容过长`)
  }

  const tags = toStringArray(raw.tags ?? [], '标签')
  const evidence = toStringArray(raw.evidence ?? [], '证据')
  if (visibility === 'published' && status !== 'demo' && evidence.length === 0) {
    throw new Error('正式发布的非演示记录至少需要一项证据')
  }

  return {
    name: String(raw.name).trim(),
    website: website.toString(),
    telegram: telegram.toString(),
    status,
    verificationDate,
    summary: String(raw.summary).trim(),
    claim: String(raw.claim).trim(),
    observed: String(raw.observed).trim(),
    sampleSize,
    tags,
    evidence,
    visibility,
  }
}

function deriveFields(input: RecordInput) {
  const website = new URL(input.website)
  const telegram = new URL(input.telegram)
  const telegramName = telegram.pathname.split('/').filter(Boolean)[0] ?? ''
  return {
    domain: website.hostname.replace(/^www\./, ''),
    telegramHandle: telegramName ? `@${telegramName}` : telegram.hostname,
    statusLabel: statusLabels[input.status],
  }
}

function createId(name: string): string {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'record'
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

async function listPublicRecords(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT * FROM relay_records WHERE visibility = 'published' ORDER BY verification_date DESC, modified_at DESC",
  ).all<RelayRecordRow>()
  return json({ records: result.results.map(rowToRecord) })
}

async function listAdminRecords(env: Env, actorEmail: string): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT * FROM relay_records ORDER BY modified_at DESC',
  ).all<RelayRecordRow>()
  return json({ records: result.results.map(rowToRecord), actorEmail })
}

async function createRecord(request: Request, env: Env, actorEmail: string): Promise<Response> {
  const input = parseInput(await request.json())
  const derived = deriveFields(input)
  const id = createId(input.name)
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO relay_records (
      id, name, website, domain, telegram, telegram_handle, status, status_label,
      verification_date, summary, claim, observed, sample_size, tags, evidence, visibility
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      id, input.name, input.website, derived.domain, input.telegram, derived.telegramHandle,
      input.status, derived.statusLabel, input.verificationDate, input.summary, input.claim,
      input.observed, input.sampleSize, JSON.stringify(input.tags), JSON.stringify(input.evidence), input.visibility,
    ),
    env.DB.prepare(
      'INSERT INTO record_events (record_id, action, actor_email, snapshot) VALUES (?, ?, ?, ?)',
    ).bind(id, 'create', actorEmail, JSON.stringify(input)),
  ])
  const row = await env.DB.prepare('SELECT * FROM relay_records WHERE id = ?').bind(id).first<RelayRecordRow>()
  return json({ record: row ? rowToRecord(row) : null }, 201)
}

async function updateRecord(request: Request, env: Env, actorEmail: string, id: string): Promise<Response> {
  const input = parseInput(await request.json())
  const derived = deriveFields(input)
  const current = await env.DB.prepare('SELECT id FROM relay_records WHERE id = ?').bind(id).first()
  if (!current) return json({ error: '记录不存在' }, 404)

  await env.DB.batch([
    env.DB.prepare(`UPDATE relay_records SET
      name = ?, website = ?, domain = ?, telegram = ?, telegram_handle = ?, status = ?, status_label = ?,
      verification_date = ?, summary = ?, claim = ?, observed = ?, sample_size = ?, tags = ?, evidence = ?,
      visibility = ?, modified_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(
      input.name, input.website, derived.domain, input.telegram, derived.telegramHandle, input.status,
      derived.statusLabel, input.verificationDate, input.summary, input.claim, input.observed, input.sampleSize,
      JSON.stringify(input.tags), JSON.stringify(input.evidence), input.visibility, id,
    ),
    env.DB.prepare(
      'INSERT INTO record_events (record_id, action, actor_email, snapshot) VALUES (?, ?, ?, ?)',
    ).bind(id, 'update', actorEmail, JSON.stringify(input)),
  ])
  const row = await env.DB.prepare('SELECT * FROM relay_records WHERE id = ?').bind(id).first<RelayRecordRow>()
  return json({ record: row ? rowToRecord(row) : null })
}

async function deleteRecord(env: Env, actorEmail: string, id: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM relay_records WHERE id = ?').bind(id).first<RelayRecordRow>()
  if (!row) return json({ error: '记录不存在' }, 404)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM relay_records WHERE id = ?').bind(id),
    env.DB.prepare(
      'INSERT INTO record_events (record_id, action, actor_email, snapshot) VALUES (?, ?, ?, ?)',
    ).bind(id, 'delete', actorEmail, JSON.stringify(rowToRecord(row))),
  ])
  return json({ deleted: true })
}

async function handleAdminApi(request: Request, env: Env, url: URL): Promise<Response> {
  const actorEmail = requireAdmin(request, env)
  if (!actorEmail) return json({ error: '需要通过 Cloudflare Access 登录' }, 401)
  if (request.method !== 'GET' && !validateMutationOrigin(request)) return json({ error: '请求来源无效' }, 403)

  if (url.pathname === '/admin/api/records') {
    if (request.method === 'GET') return listAdminRecords(env, actorEmail)
    if (request.method === 'POST') return createRecord(request, env, actorEmail)
  }

  const match = url.pathname.match(/^\/admin\/api\/records\/([^/]+)$/)
  if (match) {
    const id = decodeURIComponent(match[1])
    if (request.method === 'PUT') return updateRecord(request, env, actorEmail, id)
    if (request.method === 'DELETE') return deleteRecord(env, actorEmail, id)
  }

  return json({ error: '接口不存在' }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    try {
      if (url.pathname === '/api/records' && request.method === 'GET') return await listPublicRecords(env)
      if (url.pathname.startsWith('/admin/api/')) return await handleAdminApi(request, env, url)
      return env.ASSETS.fetch(request)
    } catch (error) {
      console.error('relay-watch request failed', error instanceof Error ? error.message : 'unknown error')
      return json({ error: error instanceof Error ? error.message : '服务器暂时不可用' }, 400)
    }
  },
} satisfies ExportedHandler<Env>
