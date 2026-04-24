import { parseResume, normalizeResumeData } from '../utils/resume-parser'
import type { ResumeData, ExtMessage, ScannedField, FillResult } from '../types/resume'
import './popup.css'

// ─── DOM helpers ──────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const INPUT_MAP: Record<string, string> = {
  'input-name': 'basic_info.name',
  'input-phone': 'basic_info.phone',
  'input-email': 'basic_info.email',
  'input-gender': 'basic_info.gender',
  'input-location': 'basic_info.location',
  'input-intention': 'basic_info.job_intention',
  'input-school': 'education.0.school',
  'input-degree': 'education.0.degree',
  'input-major': 'education.0.major',
  'input-summary': 'basic_info.self_summary',
  'input-skills': 'skills_text',
}

let currentResume: ResumeData | null = null

// ─── Storage helpers ──────────────────────────────────────────────────────────

function sendMsg(msg: ExtMessage): Promise<{ success?: boolean; data?: ResumeData | null; results?: FillResult; fields?: ScannedField[] }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({})
        return
      }
      resolve(resp ?? {})
    })
  })
}

async function loadResume(): Promise<void> {
  const resp = await sendMsg({ type: 'GET_RESUME' })
  if (resp.data) {
    currentResume = resp.data
    syncFormFromResume(resp.data)
    setStatus(true, '已加载保存的简历')
  }
}

async function saveResume(data: ResumeData): Promise<void> {
  currentResume = data
  await sendMsg({ type: 'SAVE_RESUME', data })
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function setStatus(loaded: boolean, text: string): void {
  const card = $<HTMLDivElement>('resume-status')
  const span = card.querySelector('.status-text') as HTMLSpanElement
  card.classList.toggle('loaded', loaded)
  span.textContent = text
}

function syncFormFromResume(data: ResumeData): void {
  for (const [id, path] of Object.entries(INPUT_MAP)) {
    const el = $<HTMLInputElement | HTMLTextAreaElement>(id)
    if (!el) continue

    if (path === 'skills_text') {
      el.value = data.skills.map((s) => (typeof s === 'string' ? s : s.name)).join(', ')
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = data
    for (const p of path.split('.')) {
      if (val == null) break
      val = isNaN(Number(p)) ? val[p] : val[Number(p)]
    }
    el.value = val ?? ''
  }
}

function collectFormData(): ResumeData {
  const base = currentResume ?? {
    basic_info: { name: '', phone: '', email: '', gender: '', birth_date: '', location: '', job_intention: '', self_summary: '' },
    education: [{ school: '', degree: '', major: '', start_date: '', end_date: '', gpa: '', description: '' }],
    work_experience: [],
    project_experience: [],
    skills: [],
    awards: [],
  }

  for (const [id, path] of Object.entries(INPUT_MAP)) {
    const el = $<HTMLInputElement | HTMLTextAreaElement>(id)
    if (!el) continue
    const val = el.value.trim()

    if (path === 'skills_text') {
      base.skills = val ? val.split(',').map((s) => ({ name: s.trim(), level: 3 })) : []
      continue
    }

    const parts = path.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let target: any = base
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (!isNaN(Number(p))) {
        const idx = Number(p)
        if (!target[idx]) target[idx] = {}
        target = target[idx]
      } else {
        if (!target[p]) target[p] = {}
        target = target[p]
      }
    }
    target[parts[parts.length - 1]] = val
  }

  return base
}

function toast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const el = document.createElement('div')
  el.className = `tmatch-toast ${type}`
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transition = 'opacity .3s'
    setTimeout(() => el.remove(), 300)
  }, 2500)
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadResume()

  // Tab switching
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'))
      tab.classList.add('active')
      $<HTMLDivElement>(`panel-${tab.dataset.tab}`).classList.add('active')
    })
  })

  // File upload
  $<HTMLInputElement>('file-input').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const isVlTypes = ['pdf', 'docx', 'doc'].includes(ext)

    try {
      let data: ResumeData
      if (isVlTypes) {
        setStatus(false, 'AI 解析中，请稍候...')
        toast('正在上传并进行 AI 解析...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))
        const resp = await sendMsg({ type: 'PARSE_FILE_VL', data: { fileName: file.name, fileData: base64, fileType: file.type } })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((resp as any).error) throw new Error((resp as any).error)
        data = normalizeResumeData(resp.data)
      } else {
        data = await parseResume(file)
      }
      syncFormFromResume(data)
      await saveResume(data)
      setStatus(true, `已加载：${file.name}`)
      toast('简历解析成功', 'success')
    } catch (err) {
      setStatus(false, '解析失败')
      toast((err as Error).message || '解析失败', 'error')
    } finally {
      (e.target as HTMLInputElement).value = ''
    }
  })

  // Save manual input
  $<HTMLButtonElement>('btn-save').addEventListener('click', async () => {
    const data = collectFormData()
    await saveResume(data)
    setStatus(true, '已保存手动填写的简历')
    toast('保存成功', 'success')
  })

  // Scan form
  const btnScan = $<HTMLButtonElement>('btn-scan')
  const btnFill = $<HTMLButtonElement>('btn-fill')

  btnScan.addEventListener('click', async () => {
    btnScan.disabled = true
    btnScan.textContent = '🔍 扫描中...'

    const resp = await sendMsg({ type: 'SCAN_FORM' })

    btnScan.disabled = false
    btnScan.textContent = '🔍 重新扫描表单'

    const fields = resp.fields ?? []
    const scanResult = $<HTMLDivElement>('scan-result')
    const fieldList = $<HTMLDivElement>('field-list')

    if (fields.length > 0) {
      scanResult.style.display = 'block'
      fieldList.innerHTML = fields
        .map(
          (f: ScannedField) =>
            `<div class="field-item">
              <span class="field-label" title="${f.label}">${f.label.substring(0, 15)}${f.label.length > 15 ? '...' : ''}</span>
              <span class="field-type">${f.fieldType}</span>
            </div>`,
        )
        .join('')
      btnFill.style.display = 'flex'
    } else {
      scanResult.style.display = 'block'
      fieldList.innerHTML = '<div style="color:#71717a;font-size:12px;text-align:center;padding:10px">未识别到支持的表单字段</div>'
      btnFill.style.display = 'none'
    }
  })

  // Fill form
  btnFill.addEventListener('click', async () => {
    if (!currentResume) {
      toast('请先上传或填写简历数据', 'error')
      document.querySelector<HTMLButtonElement>('[data-tab="resume"]')?.click()
      return
    }

    btnFill.disabled = true
    btnFill.textContent = '⚡ 填写中...'

    const resp = await sendMsg({ type: 'FILL_FORM', data: currentResume })

    btnFill.disabled = false
    btnFill.textContent = '⚡ 再次填写'

    const results = resp.results
    if (results) {
      renderFillResult(results)
      toast(`成功填写 ${results.filled} 个字段`, 'success')
    } else {
      toast('填写失败，请刷新页面重试', 'error')
    }
  })
})

function renderFillResult(results: FillResult): void {
  const fillResult = $<HTMLDivElement>('fill-result')
  const fillDetail = $<HTMLDivElement>('fill-detail')
  $<HTMLDivElement>('scan-result').style.display = 'none'
  fillResult.style.display = 'block'

  const badge = (status: string) => {
    const map: Record<string, [string, string]> = {
      filled: ['filled', '已填写'],
      skipped: ['skipped', '未匹配'],
      no_data: ['no_data', '无数据'],
    }
    const [cls, text] = map[status] ?? ['no_data', status]
    return `<span class="status-badge ${cls}">${text}</span>`
  }

  fillDetail.innerHTML = `
    <div class="fill-summary">
      <div class="stat"><div class="stat-num green">${results.filled}</div><div class="stat-label">成功填写</div></div>
      <div class="stat"><div class="stat-num yellow">${results.skipped}</div><div class="stat-label">跳过</div></div>
    </div>
    ${results.fields
      .map(
        (f) =>
          `<div class="fill-item">
            <span title="${f.label}">${f.label.substring(0, 12)}${f.label.length > 12 ? '...' : ''}</span>
            ${badge(f.status)}
          </div>`,
      )
      .join('')}
  `
}
