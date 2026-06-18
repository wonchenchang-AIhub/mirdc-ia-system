import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

const AUDIT_CYCLES = [
  '主要業務管理', '採購管理', '會計作業管理', '人事作業管理',
  '資產管理(含智慧財產)', '投資與融資管理', '數位化及資訊安全管理',
  '環境安全衛生管理', '個人資料保護管理', '其他',
]

const STEP_CONFIRM = 'confirm'
const STEP_BASIC   = 'basic'
const STEP_COPYING = 'copying'

export default function CopyEditPage() {
  const { id } = useParams()   // 來源案件 id（舊的）
  const navigate = useNavigate()

  const [step, setStep]             = useState(STEP_CONFIRM)
  const [source, setSource]         = useState(null)   // 來源案件
  const [t1Count, setT1Count]       = useState(0)
  const [form, setForm]             = useState({ period_start: '', period_end: '', audit_cycle: '' })
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSource(sub)
      if (sub?.audit_cycle) setForm(f => ({ ...f, audit_cycle: sub.audit_cycle }))

      const { count } = await supabase.from('table1_risk_assessment')
        .select('id', { count: 'exact', head: true }).eq('submission_id', id)
      setT1Count(count || 0)
    }
    load()
  }, [id])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleCopy() {
    setError('')
    if (!form.audit_cycle) { setError('請選擇稽核循環類別'); return }
    if (!form.period_start || !form.period_end) { setError('請填寫評估期間'); return }
    if (new Date(form.period_start) >= new Date(form.period_end)) {
      setError('評估期間起日必須早於迄日'); return
    }

    setSaving(true)
    setStep(STEP_COPYING)

    const today = new Date().toISOString().split('T')[0]

    // 建立新案件
    const { data: newSub, error: subErr } = await supabase.from('submissions').insert({
      user_id: source.user_id,
      evaluation_unit: source.evaluation_unit,
      audit_cycle: form.audit_cycle,
      evaluated_task: source.evaluated_task,
      period_start: form.period_start,
      period_end: form.period_end,
      evaluation_date: today,
      table2_scope: source.table2_scope,
      status: 'draft',
    }).select().single()

    if (subErr || !newSub) {
      setError('複製失敗，請稍後再試')
      setSaving(false)
      setStep(STEP_BASIC)
      return
    }

    // 複製附表一
    const { data: t1 } = await supabase.from('table1_risk_assessment')
      .select('*').eq('submission_id', id).order('sort_order')

    if (t1 && t1.length > 0) {
      const { data: insertedT1 } = await supabase.from('table1_risk_assessment').insert(
        t1.map(r => ({
          submission_id: newSub.id,
          sort_order: r.sort_order,
          control_point: r.control_point,
          is_compliance_review: r.is_compliance_review,
          score_a_external: r.score_a_external,
          score_a_internal: r.score_a_internal,
          score_b: r.score_b,
          score_c: r.score_c,
          score_d: r.score_d,
          score_e: r.score_e,
          score_f: r.score_f,
          notes: r.notes,
          included_in_table2: r.included_in_table2,
        }))
      ).select()

      // 複製附表二（評估結果重置）
      const { data: t2 } = await supabase.from('table2_self_assessment')
        .select('*').eq('submission_id', id).order('sort_order')

      if (t2 && t2.length > 0 && insertedT1) {
        const t1IdMap = {}
        t1.forEach((r, i) => { t1IdMap[r.id] = insertedT1[i]?.id })

        await supabase.from('table2_self_assessment').insert(
          t2.map(r => ({
            submission_id: newSub.id,
            table1_id: t1IdMap[r.table1_id] || null,
            sort_order: r.sort_order,
            control_point: r.control_point,
            risk_score: r.risk_score,
            result: 'pending',           // 重置為未填寫
            improvement_measures: null,  // 清除去年的改善措施
            population_count: r.population_count,
          }))
        )
      }
    }

    setSaving(false)
    // 跳到新案件的附表一，帶入來源案件 id 作為提示參數
    navigate(`/submission/${newSub.id}/table1?copied=1`)
  }

  const today = new Date().toISOString().split('T')[0]

  if (!source) return <Layout><div className="loading-screen">載入中...</div></Layout>

  // ── 步驟一：確認複製內容 ──────────────────────────────
  if (step === STEP_CONFIRM) {
    return (
      <Layout>
        <div className="page-header">
          <h2>複製去年案件</h2>
          <p>確認要複製的來源案件內容</p>
        </div>

        <div className="card" style={{ maxWidth: '640px' }}>
          <div className="card-header">來源案件摘要</div>
          <div className="card-body">
            <table className="data-table" style={{ marginBottom: '24px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, width: '140px' }}>評估單位</td>
                  <td>{source.evaluation_unit}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>稽核循環類別</td>
                  <td>{source.audit_cycle || <span style={{ color: 'var(--color-text-muted)' }}>未設定</span>}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>受評作業</td>
                  <td>{source.evaluated_task}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>上次評估期間</td>
                  <td>{source.period_start} 至 {source.period_end}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>上次評估日期</td>
                  <td>{source.evaluation_date}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>附表一控制重點</td>
                  <td>{t1Count} 項</td>
                </tr>
              </tbody>
            </table>

            <div className="alert alert-info" style={{ marginBottom: '24px' }}>
              <strong>複製內容說明：</strong>
              <ul style={{ margin: '8px 0 0 16px', fontSize: '13px', lineHeight: '1.8' }}>
                <li>附表一：全部控制重點及分數（可在下一步修改）</li>
                <li>附表二：控制重點名稱帶入，評估結果<strong>重置為未填寫</strong></li>
                <li>附表三：不複製（缺失改善需重新填寫）</li>
                <li>佐證資料：不複製（需上傳本年度文件）</li>
              </ul>
            </div>

            <div className="action-bar">
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/dashboard')}>
                ← 取消
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(STEP_BASIC)}>
                確認，填寫新年度資訊 →
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // ── 步驟二：填寫新年度基本資訊 ───────────────────────
  if (step === STEP_BASIC) {
    return (
      <Layout>
        <div className="page-header">
          <h2>複製去年案件｜填寫新年度資訊</h2>
          <p>複製自：{source.evaluation_unit}｜{source.evaluated_task}</p>
        </div>

        <div className="card" style={{ maxWidth: '640px' }}>
          <div className="card-header">填寫本次評估基本資訊</div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: '24px' }}>
              評估日期已自動帶入今日：<strong>{today}</strong>。
              請填寫本次的稽核循環類別與評估期間。
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>稽核循環類別<span className="required">*</span></label>
              <select name="audit_cycle" className="form-control"
                value={form.audit_cycle} onChange={handleChange} required>
                <option value="">請選擇稽核循環類別...</option>
                {AUDIT_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>評估期間（起）<span className="required">*</span></label>
                <input name="period_start" type="date" className="form-control"
                  value={form.period_start} onChange={handleChange} required />
                <p className="form-hint">通常為上次自評日期後次月</p>
              </div>
              <div className="form-group">
                <label>評估期間（迄）<span className="required">*</span></label>
                <input name="period_end" type="date" className="form-control"
                  value={form.period_end} onChange={handleChange} required />
                <p className="form-hint">評估日期當月底前</p>
              </div>
            </div>

            <div className="action-bar">
              <button className="btn btn-secondary btn-lg" onClick={() => setStep(STEP_CONFIRM)}>
                ← 返回確認
              </button>
              <button className="btn btn-success btn-lg" onClick={handleCopy} disabled={saving}>
                {saving ? '複製中...' : '確認複製，進入附表一 →'}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // ── 複製中 ────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>⏳</div>
        <h2 style={{ marginBottom: '8px' }}>正在複製案件...</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          複製附表一、附表二控制重點，請稍候
        </p>
      </div>
    </Layout>
  )
}
