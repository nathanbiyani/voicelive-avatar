import { useMemo, useState } from 'react'
import { BUCKET_LABELS, EVALUATION_CRITERIA } from '../data/criteria'
import type { EvaluationBucket, WorkbookResult } from '../data/criteria'

interface Props {
  telemetryEnabled: boolean
  recorded: Record<string, WorkbookResult>
  onRecord: (criterionId: string, result: WorkbookResult) => void
}

type BucketFilter = 'all' | EvaluationBucket

export function EvaluationOverview({ telemetryEnabled, recorded, onRecord }: Props) {
  const [bucket, setBucket] = useState<BucketFilter>('all')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const categories = useMemo(() => [...new Set(EVALUATION_CRITERIA.map((item) => item.category))], [])
  const visible = EVALUATION_CRITERIA.filter((item) => (
    (bucket === 'all' || item.bucket === bucket)
    && (category === 'all' || item.category === category)
    && item.title.toLowerCase().includes(query.trim().toLowerCase())
  ))
  const counts = (['live-demo', 'expanded-pilot', 'evidence-only'] as const).map((id) => ({
    id,
    count: EVALUATION_CRITERIA.filter((item) => item.bucket === id).length,
  }))

  return <section className="overview" aria-labelledby="overview-title">
    <div className="section-heading">
      <div><span className="eyebrow">Workbook evaluation</span><h2 id="overview-title">All 47 evaluation criteria</h2></div>
      <p>Every populated row from <strong>Avatar_Evaluation Criteria</strong> is mapped to what this application can prove.</p>
    </div>
    <div className="bucket-summary" aria-label="Evaluation bucket summary">
      {counts.map(({ id, count }) => <button type="button" key={id} className={bucket === id ? 'active' : ''} onClick={() => setBucket(bucket === id ? 'all' : id)}>
        <strong>{count}</strong><span>{BUCKET_LABELS[id]}</span>
      </button>)}
    </div>
    <div className="criteria-filters">
      <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a workbook criterion" /></label>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Bucket<select value={bucket} onChange={(event) => setBucket(event.target.value as BucketFilter)}><option value="all">All buckets</option>{Object.entries(BUCKET_LABELS).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
      <span className="visible-count">{visible.length} rows shown</span>
    </div>
    <div className="criteria-table-wrap">
      <table className="criteria-table">
        <thead><tr><th>Workbook</th><th>Criterion</th><th>Demo fit</th><th>How to evaluate</th><th>Result</th></tr></thead>
        <tbody>{visible.map((criterion) => <tr key={criterion.id} data-bucket={criterion.bucket}>
          <td><strong>Row {criterion.sourceRow}</strong><span>{criterion.category}</span><small>Priority {criterion.priority}</small></td>
          <td>{criterion.title}</td>
          <td><span className={`bucket-badge ${criterion.bucket}`}>{BUCKET_LABELS[criterion.bucket]}</span></td>
          <td>{criterion.testMethod}</td>
          <td><div className="evaluation-actions" aria-label={`${criterion.title} evaluation result`}>
            <button type="button" className={recorded[criterion.id] === 'pass' ? 'selected pass' : ''} onClick={() => onRecord(criterion.id, 'pass')}>Pass</button>
            <button type="button" className={recorded[criterion.id] === 'review' ? 'selected review' : ''} onClick={() => onRecord(criterion.id, 'review')}>Needs review</button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="evaluation-storage"><strong>Results are saved in this browser.</strong> {telemetryEnabled ? 'Approved aggregate criteria are also exported as privacy-safe telemetry.' : 'Application Insights export is unavailable, so no result leaves this browser.'}</p>
  </section>
}
