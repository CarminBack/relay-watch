import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import type { RecordStatus, RelayRecord } from './data'
import './admin.css'

type Visibility = 'draft' | 'published'

interface AdminRecord extends RelayRecord {
  visibility: Visibility
  createdAt: string
  modifiedAt: string
}

interface RecordForm {
  name: string
  website: string
  telegram: string
  status: RecordStatus
  verificationDate: string
  summary: string
  claim: string
  observed: string
  sampleSize: string
  tags: string
  evidence: string
  visibility: Visibility
}

const statusOptions: { value: RecordStatus; label: string }[] = [
  { value: 'confirmed', label: '确认掺水' },
  { value: 'insufficient', label: '证据不足' },
  { value: 'cleared', label: '已澄清' },
  { value: 'demo', label: '演示数据' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): RecordForm {
  return {
    name: '',
    website: '',
    telegram: '',
    status: 'insufficient',
    verificationDate: today(),
    summary: '',
    claim: '',
    observed: '',
    sampleSize: '',
    tags: '',
    evidence: '',
    visibility: 'draft',
  }
}

function recordToForm(record: AdminRecord): RecordForm {
  return {
    name: record.name,
    website: record.website,
    telegram: record.telegram,
    status: record.status,
    verificationDate: record.updatedAt,
    summary: record.summary,
    claim: record.claim,
    observed: record.observed,
    sampleSize: record.sampleSize === null ? '' : String(record.sampleSize),
    tags: record.tags.join(', '),
    evidence: record.evidence.join('\n'),
    visibility: record.visibility,
  }
}

function formPayload(form: RecordForm) {
  return {
    ...form,
    sampleSize: form.sampleSize === '' ? null : Number(form.sampleSize),
    tags: form.tags.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean),
    evidence: form.evidence.split('\n').map((item) => item.trim()).filter(Boolean),
  }
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '请求失败，请稍后重试')
  return payload
}

function AdminApp() {
  const [records, setRecords] = useState<AdminRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<RecordForm>(emptyForm)
  const [query, setQuery] = useState('')
  const [actorEmail, setActorEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selected = records.find((record) => record.id === selectedId) ?? null
  const publishedCount = records.filter((record) => record.visibility === 'published').length
  const filteredRecords = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return records
    return records.filter((record) => [record.name, record.domain, record.telegramHandle].join(' ').toLowerCase().includes(needle))
  }, [query, records])

  useEffect(() => {
    apiRequest<{ records: AdminRecord[]; actorEmail: string }>('/admin/api/records')
      .then((payload) => {
        setRecords(payload.records)
        setActorEmail(payload.actorEmail)
        if (payload.records[0]) {
          setSelectedId(payload.records[0].id)
          setForm(recordToForm(payload.records[0]))
        }
      })
      .catch((error: Error) => setFeedback({ type: 'error', message: error.message }))
      .finally(() => setLoading(false))
  }, [])

  function selectRecord(record: AdminRecord) {
    setSelectedId(record.id)
    setForm(recordToForm(record))
    setFeedback(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startNewRecord() {
    setSelectedId(null)
    setForm(emptyForm())
    setFeedback(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateField<K extends keyof RecordForm>(field: K, value: RecordForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const path = selected ? `/admin/api/records/${encodeURIComponent(selected.id)}` : '/admin/api/records'
      const payload = await apiRequest<{ record: AdminRecord }>(path, {
        method: selected ? 'PUT' : 'POST',
        body: JSON.stringify(formPayload(form)),
      })
      setRecords((current) => selected
        ? current.map((record) => record.id === payload.record.id ? payload.record : record)
        : [payload.record, ...current])
      setSelectedId(payload.record.id)
      setForm(recordToForm(payload.record))
      setFeedback({ type: 'success', message: form.visibility === 'published' ? '记录已保存并公开' : '草稿已保存' })
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord() {
    if (!selected || !window.confirm(`确定删除“${selected.name}”吗？此操作无法撤销。`)) return
    setSaving(true)
    setFeedback(null)
    try {
      await apiRequest(`/admin/api/records/${encodeURIComponent(selected.id)}`, { method: 'DELETE' })
      const remaining = records.filter((record) => record.id !== selected.id)
      setRecords(remaining)
      if (remaining[0]) {
        setSelectedId(remaining[0].id)
        setForm(recordToForm(remaining[0]))
      } else {
        startNewRecord()
      }
      setFeedback({ type: 'success', message: '记录已删除' })
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : '删除失败' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-brand" href="/">
          <span><ShieldCheck size={20} aria-hidden="true" /></span>
          中转站验真台
          <small>管理后台</small>
        </a>
        <a className="admin-back" href="/"><ArrowLeft size={17} aria-hidden="true" /> 返回公开站</a>
      </header>

      <main className="admin-main">
        <section className="admin-summary" aria-labelledby="admin-title">
          <div>
            <span className="admin-kicker">Cloudflare D1 / Access</span>
            <h1 id="admin-title">核验记录管理</h1>
            <p>{actorEmail ? `已登录：${actorEmail}` : '正在确认管理员身份'}</p>
          </div>
          <div className="admin-metrics" aria-label="记录统计">
            <div><Database size={18} aria-hidden="true" /><span>全部</span><strong>{records.length}</strong></div>
            <div><Eye size={18} aria-hidden="true" /><span>已发布</span><strong>{publishedCount}</strong></div>
            <div><EyeOff size={18} aria-hidden="true" /><span>草稿</span><strong>{records.length - publishedCount}</strong></div>
          </div>
        </section>

        {feedback && (
          <div className={`admin-feedback admin-feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
            {feedback.type === 'success' && <CheckCircle2 size={18} aria-hidden="true" />}
            {feedback.message}
          </div>
        )}

        <div className="admin-workspace">
          <aside className="admin-list" aria-label="核验记录列表">
            <div className="admin-list__actions">
              <label>
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">搜索记录</span>
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索记录" />
              </label>
              <button type="button" onClick={startNewRecord}><Plus size={18} aria-hidden="true" /> 新建</button>
            </div>

            <div className="admin-list__items">
              {loading && <div className="admin-loading"><Loader2 size={20} aria-hidden="true" /> 正在读取 D1</div>}
              {!loading && filteredRecords.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  className={selectedId === record.id ? 'is-selected' : ''}
                  onClick={() => selectRecord(record)}
                >
                  <span className={`admin-visibility admin-visibility--${record.visibility}`}>
                    {record.visibility === 'published' ? '已发布' : '草稿'}
                  </span>
                  <strong>{record.name}</strong>
                  <small>{record.domain} · {record.statusLabel}</small>
                </button>
              ))}
              {!loading && filteredRecords.length === 0 && <p className="admin-list__empty">没有匹配记录</p>}
            </div>
          </aside>

          <section className="admin-editor" aria-labelledby="editor-title">
            <div className="admin-editor__heading">
              <div>
                <span>{selected ? '编辑记录' : '新建记录'}</span>
                <h2 id="editor-title">{selected ? selected.name : '未命名记录'}</h2>
              </div>
              <div className="admin-segment" aria-label="发布状态">
                <button type="button" className={form.visibility === 'draft' ? 'is-active' : ''} onClick={() => updateField('visibility', 'draft')} aria-pressed={form.visibility === 'draft'}>
                  <EyeOff size={16} aria-hidden="true" /> 草稿
                </button>
                <button type="button" className={form.visibility === 'published' ? 'is-active' : ''} onClick={() => updateField('visibility', 'published')} aria-pressed={form.visibility === 'published'}>
                  <Eye size={16} aria-hidden="true" /> 发布
                </button>
              </div>
            </div>

            <form onSubmit={saveRecord} className="admin-form">
              <div className="admin-form__grid">
                <label className="admin-field admin-field--wide">
                  <span>站点名称 *</span>
                  <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="例如：某某中转站" />
                </label>
                <label className="admin-field">
                  <span>网站地址 *</span>
                  <input required type="url" value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://example.com" />
                </label>
                <label className="admin-field">
                  <span>Telegram 频道 *</span>
                  <input required type="url" value={form.telegram} onChange={(event) => updateField('telegram', event.target.value)} placeholder="https://t.me/example" />
                </label>
                <label className="admin-field">
                  <span>核验结论 *</span>
                  <select value={form.status} onChange={(event) => updateField('status', event.target.value as RecordStatus)}>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="admin-field">
                  <span>核验日期 *</span>
                  <input required type="date" value={form.verificationDate} onChange={(event) => updateField('verificationDate', event.target.value)} />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>结论摘要 *</span>
                  <textarea required rows={3} value={form.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="用一句话说明结论与依据" />
                </label>
                <label className="admin-field">
                  <span>公开承诺 *</span>
                  <textarea required rows={4} value={form.claim} onChange={(event) => updateField('claim', event.target.value)} placeholder="站点公开宣传了什么" />
                </label>
                <label className="admin-field">
                  <span>实测结果 *</span>
                  <textarea required rows={4} value={form.observed} onChange={(event) => updateField('observed', event.target.value)} placeholder="实际测试观察到什么" />
                </label>
                <label className="admin-field">
                  <span>样本量</span>
                  <input type="number" min="0" inputMode="numeric" value={form.sampleSize} onChange={(event) => updateField('sampleSize', event.target.value)} placeholder="例如：20" />
                </label>
                <label className="admin-field">
                  <span>标签</span>
                  <input value={form.tags} onChange={(event) => updateField('tags', event.target.value)} placeholder="模型降级, 输出异常" />
                  <small>使用逗号分隔</small>
                </label>
                <label className="admin-field admin-field--wide">
                  <span>证据清单</span>
                  <textarea rows={6} value={form.evidence} onChange={(event) => updateField('evidence', event.target.value)} placeholder={'每行一项，例如：\n站点公开宣传截图\n20 次测试原始响应\n复现步骤与时间戳'} />
                  <small>正式发布前应确保每项材料可以由第三方复核</small>
                </label>
              </div>

              <div className="admin-form__actions">
                {selected && (
                  <button type="button" className="admin-delete" onClick={deleteRecord} disabled={saving}>
                    <Trash2 size={17} aria-hidden="true" /> 删除记录
                  </button>
                )}
                <button type="submit" className="admin-save" disabled={saving}>
                  {saving ? <Loader2 size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
                  {saving ? '正在保存' : '保存记录'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

export default AdminApp
