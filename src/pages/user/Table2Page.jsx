import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

const RESULT_OPTIONS = [
  { value: 'fulfilled',      label: '落實' },
  { value: 'partial',        label: '部分落實' },
  { value: 'not_fulfilled',  label: '未落實' },
  { value: 'not_applicable', label: '不適用' },
  { value: 'other',          label: '其他' },
]

export default function Table2Page() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [rows, setRows] = useState([])
  const [attachments, setAttachments] = useState({}) // { table2_id or tempIdx: File[] }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef({})

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(sub)

      // 取得對應的附表一控制重點
      const { data: t1 } = await supabase.from('table1_risk_assessment')
        .select('*').eq('submission_id', id)
        .eq(sub.table2_scope === 'top_third' ? 'included_in_table2' : 'id', sub.table2_scope === 'top_third' ? true : undefined)
        .order('sort_order')

      // 取得已存在的附表二
      const { data: t2 } = await supabase.from('table2_self_assessment')
        .select('*').eq('submission_id', id).order('sort_order')

      if (t2 && t2.length > 0) {
        setRows(t2)
      } else {
        // 從附表一帶入
        setRows((t1 || []).map((r, i) => ({
          tempIdx: i,
          table1_id: r.id,
          submission_id: id,
          sort_order: i,
          control_point: r.control_point,
          risk_score: r.comprehensive_score,
          result: 'pending',
          improvement_measures: '',
          population_count: '',
        })))
      }
    }
    load()
  }, [id])

  function updateRow(index, field, value) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function handleFileSelect(index, files) {
    const key = rows[index].id || `temp_${index}`
    setAttachments(prev => ({ ...prev, [key]: [...(prev[key] || []), ...Array.from(files)] }))
  }

  function removeFile(index, fileIdx) {
    const key = rows[index].id || `temp_${index}`
    setAttachments(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== fileIdx)
    }))
  }

  function needsImprovement(result) {
    return ['partial', 'not_fulfilled', 'other'].includes(result)
  }

  async function handleSave(goNext = false) {
    setError('')

    // 驗證：需要改善措施的項目必須填寫
    const missing = rows.filter(r => needsImprovement(r.result) && !r.improvement_measures?.trim())
    if (missing.length > 0) {
      setError(`以下控制重點勾選「部分落實／未落實／其他」，請填寫改善措施：\n${missing.map(r => r.control_point).join('、')}`)
      return
    }

    setSaving(true)

    // 刪除舊資料
    await supabase.from('table2_self_assessment').delete().eq('submission_id', id)

    // 插入新資料
    const { data: inserted, error: dbErr } = await supabase
      .from('table2_self_assessment')
      .insert(rows.map((r, i) => ({
        submission_id: id,
        table1_id: r.table1_id,
        sort_order: i,
        control_point: r.control_point,
        risk_score: r.risk_score,
        result: r.result,
        improvement_measures: r.improvement_measures || null,
        population_count: Number(r.population_count) || null,
      })))
      .select()

    if (dbErr) { setError('儲存失敗，請稍後再試'); setSaving(false); return }

    // 上傳附件
    for (let i = 0; i < rows.length; i++) {
      const key = rows[i].id || `temp_${i}`
      const files = attachments[key] || []
      const t2id = inserted[i]?.id
      if (!t2id || files.length === 0) continue

      for (const file of files) {
        const filePath = `${supabase.auth.getUser().id}/${id}/${t2id}/${file.name}`
        await supabase.storage.from('ia-attachments').upload(filePath, file, { upsert: true })
        await supabase.from('attachments').insert({
          submission_id: id,
          table2_id: t2id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        })
      }
    }

    setSaving(false)
    if (goNext) {
      const hasDeficiency = rows.some(r => needsImprovement(r.result))
      if (hasDeficiency) navigate(`/submission/${id}/table3`)
      else navigate(`/submission/${id}/review-result`)
    }
  }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h2>附表二：內控自評表</h2>
        <p>{submission.evaluation_unit}｜{submission.evaluated_task}</p>
      </div>

      <div className="step-indicator">
        <div className="step-item done"><span className="step-number">✓</span>基本資訊</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表一：風險評估</div>
        <div className="step-divider" />
        <div className="step-item active"><span className="step-number">3</span>附表二：內控自評</div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">4</span>送出覆核</div>
      </div>

      {error && <div className="alert alert-error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}

      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        <strong>填寫說明：</strong>控制重點已從附表一帶入。請逐項填寫評估結果、上傳佐證資料，
        勾選「部分落實」或「未落實」者必須填寫改善措施。
      </div>

      {rows.map((row, i) => (
        <div className="card" key={i} style={{ marginBottom: '16px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}>
            <span>控制重點 {i + 1}：{row.control_point}</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              綜合評分：<strong>{row.risk_score || '-'}</strong>
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px' }}>
              <div className="form-group">
                <label>評估結果<span className="required">*</span></label>
                <select className="form-control" value={row.result}
                  onChange={e => updateRow(i, 'result', e.target.value)}>
                  <option value="pending">請選擇...</option>
                  {RESULT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>母體發生頻率（評估期間總筆數）</label>
                <input type="number" className="form-control" style={{ maxWidth: '180px' }}
                  value={row.population_count}
                  onChange={e => updateRow(i, 'population_count', e.target.value)}
                  placeholder="填寫總件數" />
                <p className="form-hint">用於確認抽查樣本數是否足夠</p>
              </div>
            </div>

            {needsImprovement(row.result) && (
              <div className="form-group">
                <label style={{ color: 'var(--color-danger)' }}>
                  改善措施／興革建議<span className="required">*</span>
                </label>
                <textarea className="form-control" rows="3"
                  value={row.improvement_measures}
                  onChange={e => updateRow(i, 'improvement_measures', e.target.value)}
                  placeholder="請填寫具體改善措施或興革建議，並在附表三詳細說明" />
                <p className="form-hint" style={{ color: 'var(--color-warning)' }}>
                  ⚠ 下一步將進入附表三，請詳填缺失改善或興革建議辦理單
                </p>
              </div>
            )}

            <div className="form-group">
              <label>佐證資料</label>
              <div className="upload-area" onClick={() => document.getElementById(`file-${i}`).click()}>
                <p>點擊上傳佐證資料（掃描檔、Office 文件、PDF）</p>
                <p style={{ fontSize: '11px', marginTop: '4px' }}>支援格式：PDF、Word、Excel、PowerPoint、JPG、PNG</p>
                <input id={`file-${i}`} type="file" style={{ display: 'none' }} multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={e => handleFileSelect(i, e.target.files)} />
              </div>
              {(attachments[row.id || `temp_${i}`] || []).map((f, fi) => (
                <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                  <span>📎 {f.name}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    ({(f.size / 1024).toFixed(0)} KB)
                  </span>
                  <button className="btn btn-sm btn-danger" onClick={() => removeFile(i, fi)}>移除</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="action-bar">
        <button className="btn btn-secondary btn-lg"
          onClick={() => navigate(`/submission/${id}/table2-scope`)}>
          ← 返回範圍選擇
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary btn-lg" onClick={() => handleSave(false)} disabled={saving}>
            儲存草稿
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? '儲存中...' : '下一步 →'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
