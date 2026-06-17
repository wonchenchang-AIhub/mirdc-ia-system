import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function ReviewResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(sub)
      if (sub?.status === 'pending_manager' || sub?.status === 'approved') {
        setSubmitted(true)
      }
      const { data: reviews } = await supabase.from('ai_review_records')
        .select('*').eq('submission_id', id).order('reviewed_at', { ascending: false }).limit(1)
      if (reviews && reviews.length > 0) {
        setResult({ passed: reviews[0].passed, issues: reviews[0].issues || [] })
      }
    }
    load()
  }, [id])

  async function runAIReview() {
    setReviewing(true)
    setResult(null)

    const [{ data: sub }, { data: t1 }, { data: t2 }, { data: t3 }, { data: attachments }] = await Promise.all([
      supabase.from('submissions').select('*').eq('id', id).single(),
      supabase.from('table1_risk_assessment').select('*').eq('submission_id', id).order('sort_order'),
      supabase.from('table2_self_assessment').select('*').eq('submission_id', id).order('sort_order'),
      supabase.from('table3_deficiency').select('*').eq('submission_id', id),
      supabase.from('attachments').select('*').eq('submission_id', id),
    ])

    const today = new Date().toISOString().split('T')[0]

    const prompt = `你是一位內部控制稽核專家，負責初步覆核內控自評資料。
請依據以下7類常見缺失樣態，逐一檢查並回傳JSON格式的覆核結果。

【評估資料】
基本資訊：${JSON.stringify(sub)}
附表一（風險評估）：${JSON.stringify(t1)}
附表二（內控自評）：${JSON.stringify(t2)}
附表三（缺失改善）：${JSON.stringify(t3)}
附件清單：${JSON.stringify(attachments)}
今日日期：${today}

【7類缺失樣態檢查】
1. 評估期間是否有誤（period_start應為上次自評日期後次月，period_end應在evaluation_date當月底前）
2. 評估日期是否在當年度最近1個月內
3. 各控制重點的佐證資料是否有上傳（result非not_applicable者均需佐證）
4. 附表一檢查：(a)第一列是否為「規章適法性之檢視」(b)各子分數是否在1-9合理範圍(c)綜合評分是否正確(d)notes與控制重點是否一致
5. 附表二檢查：(a)控制重點數量是否符合要求(b)result為partial/not_fulfilled/other者是否有improvement_measures(c)是否有對應的附表三紀錄
6. 附表三是否完整（有partial/not_fulfilled的附表二項目是否都有附表三紀錄）
7. 跨表一致性：附表二的綜合評分是否與附表一一致、控制重點名稱是否一致

請只回傳如下JSON格式，不要有任何其他文字、說明或markdown符號：
{"passed":true或false,"issues":[{"type":"缺失類型","severity":"error或warning","field":"對應欄位","message":"繁體中文問題說明","suggestion":"繁體中文具體修正建議"}]}`

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ prompt }),
        }
      )

      const data = await response.json()
      const text = data.text || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      const { data: existingReviews } = await supabase.from('ai_review_records')
        .select('id').eq('submission_id', id)
      const round = (existingReviews?.length || 0) + 1

      await supabase.from('ai_review_records').insert({
        submission_id: id,
        review_round: round,
        passed: parsed.passed,
        issues: parsed.issues,
        raw_response: text,
      })

      await supabase.from('submissions').update({
        status: parsed.passed ? 'pending_manager' : 'pending_revision',
        ai_reviewed_at: new Date().toISOString(),
      }).eq('id', id)

      setResult(parsed)
    } catch (err) {
      setResult({
        passed: false,
        issues: [{
          type: 'system_error',
          severity: 'error',
          field: '',
          message: 'AI覆核系統暫時無法使用，請稍後再試',
          suggestion: '請聯繫系統管理者'
        }]
      })
    }

    setReviewing(false)
  }

  async function handleFinalSubmit() {
    setSubmitting(true)
    await supabase.from('submissions').update({
      status: 'pending_manager',
      submitted_at: new Date().toISOString(),
      manager_notified_at: new Date().toISOString(),
    }).eq('id', id)
    setSubmitting(false)
    setSubmitted(true)
  }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  if (submitted) {
    return (
      <Layout>
        <div style={{ maxWidth: '560px', margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>送出成功</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            已通知稽核室管理者進行人工覆核。覆核完成後將以 Email 通知您。
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            返回我的案件
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>送出前覆核</h2>
        <p>{submission.evaluation_unit}｜{submission.evaluated_task}</p>
      </div>

      <div className="step-indicator">
        <div className="step-item done"><span className="step-number">✓</span>基本資訊</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表一</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表二</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表三</div>
        <div className="step-divider" />
        <div className="step-item active"><span className="step-number">5</span>送出覆核</div>
      </div>

      <div className="card" style={{ maxWidth: '720px' }}>
        <div className="card-header">AI 初步覆核</div>
        <div className="card-body">
          {!result && !reviewing && (
            <>
              <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
                送出前，系統將依據7類常見缺失樣態對您的自評資料進行初步檢查。
                通過後才能提交給管理者進行人工覆核。
              </p>
              <button className="btn btn-primary btn-lg" onClick={runAIReview}>
                開始 AI 初步覆核
              </button>
            </>
          )}

          {reviewing && (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
              <p>AI 正在覆核您的資料，請稍候約 10-20 秒...</p>
            </div>
          )}

          {result && (
            <>
              <div className={`alert ${result.passed ? 'alert-success' : 'alert-error'}`}>
                {result.passed
                  ? '✅ 初步覆核通過！資料符合基本要求，請點擊下方按鈕送出給管理者進行人工覆核。'
                  : `❌ 發現 ${result.issues?.filter(i => i.severity === 'error').length || 0} 項需修正的問題，請依下列說明修正後重新覆核。`
                }
              </div>

              {result.issues?.length > 0 && !result.passed && (
                <div style={{ marginTop: '16px' }}>
                  {result.issues.map((issue, i) => (
                    <div key={i} className={`review-issue ${issue.severity}`}>
                      <div className="review-issue-title">{issue.message}</div>
                      <div className="review-issue-suggestion">💡 {issue.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}

              {result.issues?.length > 0 && result.passed && result.issues.some(i => i.severity === 'warning') && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    以下為參考建議（不影響送出）：
                  </p>
                  {result.issues.filter(i => i.severity === 'warning').map((issue, i) => (
                    <div key={i} className="review-issue warning">
                      <div className="review-issue-title">{issue.message}</div>
                      <div className="review-issue-suggestion">💡 {issue.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="action-bar">
                <button className="btn btn-secondary" onClick={runAIReview} disabled={reviewing}>
                  重新覆核
                </button>
                {result.passed ? (
                  <button className="btn btn-success btn-lg" onClick={handleFinalSubmit} disabled={submitting}>
                    {submitting ? '送出中...' : '確認送出，通知管理者覆核 →'}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => navigate(`/submission/${id}/table1`)}>
                    返回修正
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
