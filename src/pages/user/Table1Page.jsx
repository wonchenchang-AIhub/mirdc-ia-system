import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'

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
  score_f_suggestion: null, // { score, reason, matched_point, year }
  score_f_dismissed: false,
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

// 計算兩個字串的相似度（簡單關鍵字重疊）
function similarity(a, b) {
  if (!a || !b) return 0
  const wordsA = a.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 1)
  const wordsB = b.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 1)
  if (wordsA.length === 0 || wordsB.length === 0) return 0
  const setA = new Set(wordsA)
  const matches = wordsB.filter(w => setA.has(w)).length
  return matches / Math.max(wordsA.length, wordsB.length)
}

export default function Table1Page() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [rows, setRows] = useState([{ ...EMPTY_ROW, is_compliance_review: true }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [historicalData, setHistoricalData] = useState([]) // 過去3年的查核紀錄

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(sub)

      const { data: t1 } = await supabase.from('table1_risk_assessment')
        .select('*').eq('submission_id', id).order('sort_order')
      if (t1 && t1.length > 0) setRows(t1.map(r => ({ ...r, score_f_suggestion: null, score_f_dismissed: false })))

      // 取得此用戶過去3年的附表二查核紀錄
      const threeYearsAgo = new Date()
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

      const { data: pastSubs } = await supabase
        .from('submissions')
        .select('id, evaluation_date')
        .eq('user_id', user.id)
        .neq('id', id)
        .gte('evaluation_date', threeYearsAgo.toISOString().split('T')[0])
        .in('status', ['approved', 'archived', 'pending_manager', 'manager_reviewing'])
        .order('evaluation_date', { ascending: false })

      if (pastSubs && pastSubs.length > 0) {
        const subIds = pastSubs.map(s => s.id)
        const { data: pastT2 } = await supabase
          .from('table2_self_assessment')
          .select('id, submission_id, control_point')
          .in('submission_id', subIds)
          .neq('result', 'not_applicable')

        if (pastT2) {
          const enriched = pastT2.map(t2 => ({
            ...t2,
            evaluation_date: pastSubs.find(s => s.id === t2.submission_id)?.evaluation_date
          }))
          setHistoricalData(enriched)
        }
      }
    }
    load()
  }, [id, user])

  // 當控制重點名稱變更時，偵測歷史紀錄並給出建議
  const detectHistoricalMatch = useCallback((controlPoint, rowIndex) => {
    if (!controlPoint || controlPoint.length < 3 || historicalData.length === 0) return null

    const today = new Date()
    const oneYearAgo = new Date(); oneYearAgo.setFullYear(today.getFullYear() - 1)
    const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(today.getFullYear() - 2)

    let bestMatch = null
    let bestScore = 0

    for (const record of historicalData) {
      const sim = similarity(controlPoint, record.control_point)
      if (sim > 0.4 && sim > bestScore) {
        bestScore = sim
        bestMatch = record
      }
    }

    if (!bestMatch) return null

    const evalDate = new Date(bestMatch.evaluation_date)
    let score, reason

    if (evalDate >= oneYearAgo) {
      score = 1
      reason = `去年（${bestMatch.evaluation_date}）已查核`
    } else if (evalDate >= twoYearsAgo) {
      score = 5
      reason = `2年內（${bestMatch.evaluation_date}）已查核`
    } else {
      score = 9
      reason = `3年以上未查（最近一次：${bestMatch.evaluation_date}）`
    }

    return {
      score,
      reason,
      matched_point: bestMatch.control_point,
      similarity: Math.round(bestScore * 100),
    }
  }, [historicalData])

  function updateRow(index, field, value) {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r
      const updated = { ...r, [field]: value }

      // 當控制重點名稱改變時，觸發歷史比對
      if (field === 'control_point') {
        const suggestion = detectHistoricalMatch(value, index)
        updated.score_f_suggestion = suggestion
        updated.score_f_dismissed = false
      }
      return updated
    }))
  }

  function applySuggestion(index) {
    setRows(prev => prev.map((r, i) => {
      if (i !== index || !r.score_f_suggestion) return r
      return { ...r, score_f: String(r.score_f_suggestion.score), score_f_dismissed: true }
    }))
  }

  function dismissSuggestion(index) {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r
      return { ...r, score_f_dismissed: true }
    }))
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

    const sorted = [...rows].sort((a, b) => calcTotal(b) - calcTotal(a))
    const threshold = Math.ceil(sorted.length / 3)
    const topThirdScores = new Set(sorted.slice(0, threshold).map(r => calcTotal(r)))

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
      included_in_table2: (() => {
        const total = calcTotal(row)
        const sortedWithIdx = [...rows].map((r, idx) => ({ total: calcTotal(r), idx }))
          .sort((a, b) => b.total - a.total)
        const threshold2 = Math.ceil(rows.length / 3)
        return sortedWithIdx.slice(0, threshold2).some(s => s.idx === i)
      })(),
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
        {historicalData.length > 0 && (
          <span style={{ color: 'var(--color-success)', marginLeft: '8px' }}>
            ✓ 已載入 {historicalData.length} 筆歷史查核紀錄，可自動建議隱藏風險分數。
          </span>
        )}
      </div>

      {rows.map((row, i) => {
        const total = calcTotal(row)
        const showSuggestion = row.score_f_suggestion && !row.score_f_dismissed && row.control_point?.length > 2

        // 計算是否為前1/3
        const sortedWithIdx = [...rows].map((r, idx) => ({ total: calcTotal(r), idx }))
          .sort((a, b) => b.total - a.total)
        const threshold = Math.ceil(rows.length / 3)
        const isTop = sortedWithIdx.slice(0, threshold).some(s => s.idx === i)

        return (
          <div className="card" key={i} style={{ marginBottom: '16px' }}>
            <div className="card-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: isTop ? '#fff8f0' : '#f8fafc'
            }}>
              <span>
                控制重點 {i + 1}
                {isTop && <span style={{ marginLeft: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>★ 前1/3高風險</span>}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  綜合評分：<strong style={{ fontSize: '16px', color: total > 0 ? 'var(--color-primary)' : 'inherit' }}>{total || '-'}</strong>
                </span>
                {rows.length > 1 && (
                  <button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>✕ 刪除</button>
                )}
              </div>
            </div>
            <div className="card-body">
              {/* 控制重點名稱 */}
              <div className="form-group">
                <label>控制重點名稱<span className="required">*</span></label>
                <input className="form-control"
                  value={row.control_point}
                  onChange={e => updateRow(i, 'control_point', e.target.value)}
                  placeholder={i === 0 ? '第一列請填「規章適法性之檢視」' : '填寫控制重點名稱'} />
                {i === 0 && (
                  <p className="form-hint">第一列固定為「規章適法性之檢視」</p>
                )}
              </div>

              {/* 風險分數 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { field: 'score_a_external', label: '外稽缺失(A)', hint: '1-9' },
                  { field: 'score_a_internal', label: '內稽缺失(A)', hint: '1-9' },
                  { field: 'score_b', label: '管理風險(B)', hint: '1-9' },
                  { field: 'score_c', label: '組織風險(C)', hint: '1-9' },
                  { field: 'score_d', label: '環境風險(D)', hint: '1-9' },
                  { field: 'score_e', label: '財務風險(E)', hint: '1-9' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                      {label}
                    </label>
                    <input className="form-control" type="number" min="1" max="9"
                      style={{ textAlign: 'center', padding: '6px 4px' }}
                      value={row[field]}
                      onChange={e => updateRow(i, field, e.target.value)} />
                  </div>
                ))}

                {/* 隱藏風險 */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                    隱藏風險(F)
                  </label>
                  <select className="form-control" style={{ padding: '6px 4px' }}
                    value={row.score_f}
                    onChange={e => updateRow(i, 'score_f', e.target.value)}>
                    <option value="">-</option>
                    <option value="1">1（去年已查）</option>
                    <option value="5">5（2年未查）</option>
                    <option value="9">9（3年未查）</option>
                  </select>
                </div>
              </div>

              {/* 隱藏風險建議提示 */}
              {showSuggestion && (
                <div style={{
                  background: '#e8f4fd', border: '1px solid #b8daff',
                  borderRadius: '6px', padding: '12px 16px', marginBottom: '16px',
                  fontSize: '13px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-info)' }}>
                    💡 系統偵測到可能相關的歷史查核紀錄
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    相似控制重點：「{row.score_f_suggestion.matched_point}」
                    （相似度 {row.score_f_suggestion.similarity}%）
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    建議隱藏風險評分：<strong style={{ fontSize: '15px' }}>{row.score_f_suggestion.score} 分</strong>
                    （{row.score_f_suggestion.reason}）
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => applySuggestion(i)}>
                      ✓ 採用建議分數（{row.score_f_suggestion.score}分）
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => dismissSuggestion(i)}>
                      略過，自行填寫
                    </button>
                  </div>
                </div>
              )}

              {/* 注意事項 */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>注意事項／相關風險說明</label>
                <textarea className="form-control" rows="2"
                  value={row.notes}
                  onChange={e => updateRow(i, 'notes', e.target.value)}
                  placeholder="填寫注意事項或相關風險說明" />
              </div>
            </div>
          </div>
        )
      })}

      <button className="btn btn-secondary" onClick={addRow} style={{ marginBottom: '24px' }}>
        ＋ 新增控制重點
      </button>

      <div className="action-bar">
        <button className="btn btn-secondary btn-lg"
          onClick={() => navigate(`/submission/${id}/table1`.replace('/table1', '').replace(`/${id}`, '/new'))}>
          ← 返回基本資訊
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary btn-lg" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? '儲存中...' : '儲存草稿'}
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? '儲存中...' : '下一步：選擇附表二範圍 →'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
