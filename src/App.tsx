import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  Github,
  Info,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { relayRecords, type RecordStatus, type RelayRecord } from './data'

type Filter = 'all' | RecordStatus

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部记录' },
  { value: 'confirmed', label: '确认掺水' },
  { value: 'insufficient', label: '证据不足' },
  { value: 'cleared', label: '已澄清' },
  { value: 'demo', label: '演示数据' },
]

const statusIcon = {
  confirmed: CircleAlert,
  insufficient: Info,
  cleared: CheckCircle2,
  demo: FileCheck2,
}

function RecordCard({ record }: { record: RelayRecord }) {
  const [expanded, setExpanded] = useState(false)
  const StatusIcon = statusIcon[record.status]

  return (
    <article className={`record record--${record.status}`}>
      <div className="record__main">
        <div className="record__identity">
          <div className="site-mark" aria-hidden="true">{record.name.slice(0, 1)}</div>
          <div>
            <div className="record__name-row">
              <h3>{record.name}</h3>
              <span className={`status status--${record.status}`}>
                <StatusIcon size={14} aria-hidden="true" />
                {record.statusLabel}
              </span>
            </div>
            <p>{record.summary}</p>
          </div>
        </div>

        <div className="record__links" aria-label={`${record.name} 的公开入口`}>
          <a href={record.website} target="_blank" rel="noreferrer">
            <span className="link-label">网站</span>
            <span>{record.domain}</span>
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          <a href={record.telegram} target="_blank" rel="noreferrer">
            <span className="link-label">TG</span>
            <span>{record.telegramHandle}</span>
            <Send size={15} aria-hidden="true" />
          </a>
        </div>

        <div className="record__measure">
          <div>
            <span>公开承诺</span>
            <strong>{record.claim}</strong>
          </div>
          <div>
            <span>实测结果</span>
            <strong>{record.observed}</strong>
          </div>
          <div>
            <span>样本量</span>
            <strong>{record.sampleSize ?? '—'}</strong>
          </div>
        </div>
      </div>

      <div className="record__footer">
        <div className="tag-list" aria-label="记录标签">
          {record.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="record__actions">
          <span className="updated">更新于 {record.updatedAt}</span>
          <button
            type="button"
            className="detail-button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            证据清单
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="evidence" role="region" aria-label="证据清单">
          <div className="evidence__heading">
            <FileCheck2 size={18} aria-hidden="true" />
            可复核材料
          </div>
          <ol>
            {record.evidence.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
      )}
    </article>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const publicRecords = relayRecords.filter((record) => record.status !== 'demo')
  const confirmedCount = publicRecords.filter((record) => record.status === 'confirmed').length
  const clearedCount = publicRecords.filter((record) => record.status === 'cleared').length

  const visibleRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return relayRecords.filter((record) => {
      const matchesFilter = filter === 'all' || record.status === filter
      const haystack = [record.name, record.domain, record.telegramHandle, ...record.tags].join(' ').toLowerCase()
      return matchesFilter && (!normalized || haystack.includes(normalized))
    })
  }, [filter, query])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#records">跳到核验记录</a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="中转站验真台首页">
          <span className="brand__mark"><ShieldCheck size={21} aria-hidden="true" /></span>
          <span>中转站验真台</span>
        </a>
        <a className="submit-link" href="https://github.com/CarminBack/relay-watch/issues/new?template=report.yml" target="_blank" rel="noreferrer">
          <Github size={18} aria-hidden="true" />
          提交线索
        </a>
      </header>

      <main id="top">
        <section className="intro" aria-labelledby="page-title">
          <div className="intro__copy">
            <span className="eyebrow"><span></span> 独立公开核验记录</span>
            <h1 id="page-title">不看宣传，<br />只看证据。</h1>
            <p>记录中转站的网站、名称与 Telegram 频道，用可重复的测试和原始材料核对“足量、原生、同模型”等宣传。</p>
            <a className="text-link" href="#method">
              查看收录标准 <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>

          <div className="intro__stats" aria-label="公开核验统计">
            <div className="stat stat--primary">
              <span>公开记录</span>
              <strong>{publicRecords.length}</strong>
              <small>不含演示数据</small>
            </div>
            <div className="stat">
              <span>确认掺水</span>
              <strong>{confirmedCount}</strong>
              <small>有完整证据链</small>
            </div>
            <div className="stat">
              <span>已澄清</span>
              <strong>{clearedCount}</strong>
              <small>接受复核与更正</small>
            </div>
          </div>
        </section>

        <section className="directory" id="records" aria-labelledby="directory-title">
          <div className="section-heading">
            <div>
              <span className="section-number">01</span>
              <h2 id="directory-title">核验记录</h2>
            </div>
            <p>每一条结论都应能被第三方重复验证。</p>
          </div>

          <div className="toolbar">
            <label className="search-field">
              <Search size={19} aria-hidden="true" />
              <span className="sr-only">搜索站点名称、域名或 TG 频道</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索名称、域名或 TG 频道"
                type="search"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </label>

            <div className="filters" aria-label="按核验结论筛选">
              <SlidersHorizontal size={18} aria-hidden="true" />
              {filters.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={filter === item.value ? 'is-active' : ''}
                  onClick={() => setFilter(item.value)}
                  aria-pressed={filter === item.value}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="result-meta" aria-live="polite">
            <span>当前显示 <strong>{visibleRecords.length}</strong> 条</span>
            <span>最后更新：2026-08-10</span>
          </div>

          <div className="record-list">
            {visibleRecords.map((record) => <RecordCard key={record.id} record={record} />)}
          </div>

          {visibleRecords.length === 0 && (
            <div className="empty-state">
              <Search size={26} aria-hidden="true" />
              <h3>没有匹配的记录</h3>
              <p>换一个名称、域名或 TG 频道试试，也可以提交新的核验线索。</p>
              <button type="button" onClick={() => { setQuery(''); setFilter('all') }}>清除筛选</button>
            </div>
          )}
        </section>

        <section className="method" id="method" aria-labelledby="method-title">
          <div className="section-heading section-heading--dark">
            <div>
              <span className="section-number">02</span>
              <h2 id="method-title">收录标准</h2>
            </div>
            <p>结论可被质疑，也必须能被更正。</p>
          </div>

          <div className="method-grid">
            <article>
              <span>01</span>
              <h3>先固定口径</h3>
              <p>保留站点宣传、模型名称、套餐说明与测试时间，避免事后改变比较基准。</p>
            </article>
            <article>
              <span>02</span>
              <h3>再重复实测</h3>
              <p>使用可复现提示词和足够样本，不凭单次异常下结论，原始响应完整留档。</p>
            </article>
            <article>
              <span>03</span>
              <h3>最后公开复核</h3>
              <p>站方可以提交反证；证据变化时更新记录，明确标注更正日期与原因。</p>
            </article>
          </div>

          <div className="method-note">
            <ShieldCheck size={22} aria-hidden="true" />
            <p><strong>最低发布门槛：</strong>可定位的公开承诺、至少两轮独立复测、带时间戳的原始材料，以及不包含用户隐私的复现说明。</p>
          </div>
        </section>
      </main>

      <footer>
        <div>
          <span className="footer-brand"><ShieldCheck size={18} aria-hidden="true" /> 中转站验真台</span>
          <p>事实优先，接受复核，及时更正。</p>
        </div>
        <div className="footer-links">
          <a href="https://github.com/CarminBack/relay-watch" target="_blank" rel="noreferrer">公开仓库 <ExternalLink size={14} aria-hidden="true" /></a>
          <a href="https://github.com/CarminBack/relay-watch/issues/new?template=correction.yml" target="_blank" rel="noreferrer">申请更正 <ExternalLink size={14} aria-hidden="true" /></a>
        </div>
      </footer>
    </div>
  )
}

export default App
