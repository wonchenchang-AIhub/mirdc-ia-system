// ============================================================
// Table3Page.jsx - 附表三：缺失改善或興革建議辦理單
// ============================================================
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function Table3Page() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [deficiencyRows, setDeficiencyRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(sub)

      // 取得需要填附表三的附表二項目
      const { data: t2 } = await supabase.from('table2_self_assessment')
        .select('*').eq('submission_id', id)
        .in('result', ['partial', 'not_fulfilled', 'other'])

      // 取得已存在的附表三
      const { data: t3 } = await supabase.from('table3_deficiency')
        .select('*').eq('submission_id', id)

      setDeficiencyRows((t2 || []).map(t2row => {
        const existing = t3?.find(r => r.table2_id === t2row.id)
        return {
          table2_id: t2row.id,
          control_point: t2row.control_point,
          result: t2row.result,
          category: existing?.category || 'deficiency',
          description_a: existing?.description_a || '',
          cause_b: existing?.cause_b || '',
          improvement_c: existing?.improvement_c || '',
          target_date_c: existing?.target_date_c || '',
          suggestion_d: existing?.suggestion_d || '',
          target_date_d: existing?.target_date_d || '',
        }
      }))
    }
    load()
  }, [id])

  function updateRow(index, field, value) {
    setDeficiencyRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  async function handleSave(goNext = false) {
    setError('')
    setSaving(true)

    await supabase.from('table3_deficiency').delete().eq('submission_id', id)

    const toInsert = deficiencyRows.map(r => ({
      submission_id: id,
      table2_id: r.table2_id,
      category: r.category,
      description_a: r.description_a || null,
      cause_b: r.cause_b || null,
      improvement_c: r.improvement_c || null,
      target_date_c: r.target_date_c || null,
      suggestion_d: r.suggestion_d || null,
      target_date_d: r.target_date_d || null,
    }))

    const { error: dbErr } = await supabase.from('table3_deficiency').insert(toInsert)
    if (dbErr) { setError('儲存失敗'); setSaving(false); return }

    setSaving(false)
    if (goNext) navigate(`/submission/${id}/review-result`)
  }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h2>附表三：缺失改善或興革建議辦理單</h2>
        <p>{submission.evaluation_unit}｜{submission.evaluated_task}{submission.audit_cycle && <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#e8f0fe', borderRadius: '12px', fontSize: '12px', color: 'var(--color-primary-light)' }}>{submission.audit_cycle}</span>}</p>
      </div>

      <div className="step-indicator">
        <div className="step-item done"><span className="step-number">✓</span>基本資訊</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表一</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表二</div>
        <div className="step-divider" />
        <div className="step-item active"><span className="step-number">4</span>附表三</div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">5</span>送出覆核</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {deficiencyRows.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <h3>無需填寫附表三</h3>
              <p>所有控制重點均已落實，不需要填寫缺失改善辦理單。</p>
            </div>
          </div>
        </div>
      ) : (
        deficiencyRows.map((row, i) => (
          <div className="card" key={i} style={{ marginBottom: '16px' }}>
            <div className="card-header" style={{ background: '#fff8f0' }}>
              控制重點 {i + 1}：{row.control_point}
              <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--color-warning)' }}>
                （{row.result === 'partial' ? '部分落實' : row.result === 'not_fulfilled' ? '未落實' : '其他'}）
              </span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>類型</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="radio" checked={row.category === 'deficiency'}
                      onChange={() => updateRow(i, 'category', 'deficiency')} />
                    缺失改善
                  </label>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="radio" checked={row.category === 'suggestion'}
                      onChange={() => updateRow(i, 'category', 'suggestion')} />
                    興革建議
                  </label>
                </div>
              </div>

              {row.category === 'deficiency' && (
                <>
                  <div className="form-group">
                    <label>A. 缺失說明</label>
                    <textarea className="form-control" rows="3"
                      value={row.description_a}
                      onChange={e => updateRow(i, 'description_a', e.target.value)}
                      placeholder="說明缺失的具體情形" />
                  </div>
                  <div className="form-group">
                    <label>B. 原因分析</label>
                    <textarea className="form-control" rows="3"
                      value={row.cause_b}
                      onChange={e => updateRow(i, 'cause_b', e.target.value)}
                      placeholder="分析缺失發生的原因" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px' }}>
                    <div className="form-group">
                      <label>C. 缺失改善及預防措施</label>
                      <textarea className="form-control" rows="3"
                        value={row.improvement_c}
                        onChange={e => updateRow(i, 'improvement_c', e.target.value)}
                        placeholder="填寫具體改善措施與預防方法" />
                    </div>
                    <div className="form-group">
                      <label>預訂完成日期</label>
                      <input type="date" className="form-control"
                        value={row.target_date_c}
                        onChange={e => updateRow(i, 'target_date_c', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {row.category === 'suggestion' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px' }}>
                  <div className="form-group">
                    <label>D. 興革建議與辦理說明</label>
                    <textarea className="form-control" rows="4"
                      value={row.suggestion_d}
                      onChange={e => updateRow(i, 'suggestion_d', e.target.value)}
                      placeholder="填寫興革建議內容及辦理情形" />
                  </div>
                  <div className="form-group">
                    <label>預訂完成日期</label>
                    <input type="date" className="form-control"
                      value={row.target_date_d}
                      onChange={e => updateRow(i, 'target_date_d', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      <div className="action-bar">
        <button className="btn btn-secondary btn-lg"
          onClick={() => navigate(`/submission/${id}/table2`)}>
          ← 返回附表二
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary btn-lg" onClick={() => handleSave(false)} disabled={saving}>
            儲存草稿
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? '儲存中...' : '下一步：送出覆核 →'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
