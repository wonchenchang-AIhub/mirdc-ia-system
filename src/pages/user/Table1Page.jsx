// Table1Page.jsx - 附表一：風險評估（完整版將在下一階段開發）
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

const RISK_LABELS = {
  score_a_external: '外稽缺失',
  score_a_internal: '內稽缺失',
  score_b: '管理風險',
  score_c: '組織風險',
  score_d: '環境風險',
  score_e: '財務風險',
  score_f: '隱藏風險',
}

const EMPTY_ROW = {
  control_point: '',
  is_compliance_review: false,
  score_a_external: '',
  score_a_internal: '',
  score_b: '',
  score_c: '',
  score_d: '',
  score_e: '',
  score_f: '',
  notes: '',
}

function calcTotal(row) {
  const a = Math.max(Number(row.score_a_external) || 0, Number(row.score_a_internal) || 0)
  const b = Number(row.score_b) || 0
  const c = Number(row.score_c) || 0
  const d = Number(row.score_d) || 0
  const e = Number(row.score_e) || 0
  const f = Number(row.score_f) || 0
  return a + b + c + d + e + f
}

export default function Table1Page() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [rows, setRows] = useState([{ ...EMPTY_ROW, is_compliance_review: true }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(sub)
      const { data: t1 } = await supabase.from('table1_risk_assessment')
        .select('*').eq('submission_id', id).order('sort_order')
      if (t1 && t1.length > 0) setRows(t1)
    }
    load()
  }, [id])

  function updateRow(index, field, value) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(prev => [...prev, { ...EMPTY_ROW }])
  }

  function removeRow(index) {
    if (rows.length === 1) return
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave(goNext = false) {
    setError('')
    setSaving(true)

    // 計算前1/3門檻
    const sorted = [...rows].sort((a, b) => calcTotal(b) - calcTotal(a))
    const threshold = Math.ceil(sorted.length / 3)
    const topThirdIds = new Set(sorted.slice(0, threshold).map((_, i) => i))

    // 刪除舊資料並重新寫入
    await supabase.from('table1_risk_assessment').delete().eq('submission_id', id)

    const toInsert = rows.map((row, i) => ({
      submission_id: id,
      sort_order: i,
      control_point: row.control_point,
      is_compliance_review: row.is_compliance_review || false,
      score_a_external: Number(row.score_a_external) || null,
      score_a_internal: Number(row.score_a_internal) || null,
      score_b: Number(row.score_b) || null,
      score_c: Number(row.score_c) || null,
      score_d: Number(row.score_d) || null,
      score_e: Number(row.score_e) || null,
      score_f: Number(row.score_f) || null,
      notes: row.notes || '',
      included_in_table2: topThirdIds.has(i),
    }))

    const { error: dbErr } = await supabase.from('table1_risk_assessment').insert(toInsert)
    if (dbErr) { setError('儲存失敗，請稍後再試'); setSaving(false); return }

    setSaving(false)
    if (goNext) navigate(`/submission/${id}/table2-scope`)
  }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h2>附表一：內控自評之風險評估</h2>
        <p>{submission.evaluation_unit}｜{submission.evaluated_task}</p>
      </div>

      <div className="step-indicator">
        <div className="step-item done"><span className="step-number">✓</span>基本資訊</div>
        <div className="step-divider" />
        <div className="step-item active"><span className="step-number">2</span>附表一：風險評估</div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">3</span>附表二：內控自評</div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">4</span>送出覆核</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        <strong>填寫說明：</strong>各風險因素評分範圍 1-9 分（隱藏風險僅可填 1、5、9）。
        系統將自動計算綜合評分，並標示前 1/3 高風險控制重點。
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>控制重點清單</span>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>共 {rows.length} 項</span>
        </div>
        <div className="card-body" style={{ padding: '0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '1100px' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>#</th>
                  <th style={{ minWidth: '200px' }}>控制重點</th>
                  <th>外稽(A)</th>
                  <th>內稽(A)</th>
                  <th>管理(B)</th>
                  <th>組織(C)</th>
                  <th>環境(D)</th>
                  <th>財務(E)</th>
                  <th>隱藏(F)</th>
                  <th style={{ width: '70px' }}>綜合評分</th>
                  <th style={{ minWidth: '180px' }}>注意事項／風險說明</th>
                  <th>前1/3</th>
                  <th style={{ width: '48px' }}>刪除</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const total = calcTotal(row)
                  return (
                    <tr key={i}>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                      <td>
                        <input className="form-control" style={{ minWidth: '180px' }}
                          value={row.control_point}
                          onChange={e => updateRow(i, 'control_point', e.target.value)}
                          placeholder="填寫控制重點名稱" />
                        {i === 0 && (
                          <p className="form-hint">第一列請填「規章適法性之檢視」</p>
                        )}
                      </td>
                      {['score_a_external','score_a_internal','score_b','score_c','score_d','score_e'].map(field => (
                        <td key={field}>
                          <input className="form-control" type="number" min="1" max="9"
                            style={{ width: '58px', textAlign: 'center' }}
                            value={row[field]}
                            onChange={e => updateRow(i, field, e.target.value)} />
                        </td>
                      ))}
                      <td>
                        <select className="form-control" style={{ width: '64px' }}
                          value={row.score_f}
                          onChange={e => updateRow(i, 'score_f', e.target.value)}>
                          <option value="">-</option>
                          <option value="1">1</option>
                          <option value="5">5</option>
                          <option value="9">9</option>
                        </select>
                      </td>
                      <td>
                        <div className="score-total" style={{ fontSize: '18px' }}>
                          {total || '-'}
                        </div>
                      </td>
                      <td>
                        <textarea className="form-control" rows="2"
                          style={{ minWidth: '160px', fontSize: '13px' }}
                          value={row.notes}
                          onChange={e => updateRow(i, 'notes', e.target.value)}
                          placeholder="填寫注意事項或相關風險說明" />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {(() => {
                          const sorted = [...rows].map((r, idx) => ({ total: calcTotal(r), idx }))
                            .sort((a, b) => b.total - a.total)
                          const threshold = Math.ceil(rows.length / 3)
                          const isTop = sorted.slice(0, threshold).some(s => s.idx === i)
                          return isTop
                            ? <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>★</span>
                            : <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                        })()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn btn-sm btn-danger"
                          onClick={() => removeRow(i)}
                          disabled={rows.length === 1}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <button className="btn btn-secondary" onClick={addRow} style={{ marginBottom: '24px' }}>
        ＋ 新增控制重點
      </button>

      <div className="action-bar">
        <button className="btn btn-secondary btn-lg" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? '儲存中...' : '儲存草稿'}
        </button>
        <button className="btn btn-primary btn-lg" onClick={() => handleSave(true)} disabled={saving}>
          {saving ? '儲存中...' : '下一步：選擇附表二範圍 →'}
        </button>
      </div>
    </Layout>
  )
}
