import type {
  ExtMessage,
  FieldMapping,
  FillResult,
  FillResultItem,
  ResumeData,
  ScannedField,
} from '../types/resume'

// ─── 字段关键词映射 ───────────────────────────────────────────────────────────

const FIELD_MAPPING: Record<string, FieldMapping> = {
  name: {
    keywords: ['姓名', '名字', 'name', 'fullname', 'full_name', 'full-name', 'realname', 'real_name', '真实姓名'],
    path: 'basic_info.name',
  },
  phone: {
    keywords: ['手机', '电话', '联系方式', 'phone', 'mobile', 'tel', 'telephone', 'cellphone', '手机号'],
    path: 'basic_info.phone',
  },
  email: {
    keywords: ['邮箱', '邮件', 'email', 'e-mail', 'mail'],
    path: 'basic_info.email',
  },
  gender: {
    keywords: ['性别', 'gender', 'sex'],
    path: 'basic_info.gender',
  },
  birth_date: {
    keywords: ['出生', '生日', 'birth', 'birthday', 'dob', 'date_of_birth'],
    path: 'basic_info.birth_date',
  },
  location: {
    keywords: ['地址', '住址', '城市', '所在地', 'address', 'location', 'city', '现居'],
    path: 'basic_info.location',
  },
  job_intention: {
    keywords: ['求职意向', '应聘岗位', '期望职位', '意向岗位', 'position', 'job_title', 'job-title', '岗位'],
    path: 'basic_info.job_intention',
  },
  self_summary: {
    keywords: ['自我介绍', '个人简介', '自我评价', '个人总结', 'summary', 'about', 'introduction', 'bio'],
    path: 'basic_info.self_summary',
  },
  school: {
    keywords: ['学校', '院校', '毕业院校', 'school', 'university', 'college', 'institution'],
    path: 'education.0.school',
  },
  degree: {
    keywords: ['学历', '学位', 'degree', 'education_level', '最高学历'],
    path: 'education.0.degree',
  },
  major: {
    keywords: ['专业', 'major', 'field_of_study', '所学专业'],
    path: 'education.0.major',
  },
  gpa: {
    keywords: ['gpa', '绩点', '成绩', 'grade_point'],
    path: 'education.0.gpa',
  },
  company: {
    keywords: ['公司', '单位', '企业', 'company', 'employer', 'organization', '工作单位'],
    path: 'work_experience.0.company',
  },
  work_position: {
    keywords: ['职位', '职务', '岗位名称', 'title', 'job_title', 'role', '担任职务'],
    path: 'work_experience.0.position',
  },
  work_description: {
    keywords: ['工作描述', '工作内容', '职责', 'description', 'responsibility', 'duties', '工作职责'],
    path: 'work_experience.0.description',
  },
  skills: {
    keywords: ['技能', '特长', '技术栈', 'skills', 'expertise', 'competencies', '专业技能'],
    path: 'skills_text',
  },
}

const GENDER_MAP: Record<string, string[]> = {
  '男': ['男', '男性', 'male', 'm', '1'],
  '女': ['女', '女性', 'female', 'f', '2'],
}

// ─── 内部类型 ─────────────────────────────────────────────────────────────────

interface DetectedField {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  fieldType: string
  dataPath: string
  label: string
  tagName: string
  inputType: string
}

// ─── 表单扫描 ─────────────────────────────────────────────────────────────────

function scanFormFields(): DetectedField[] {
  const fields: DetectedField[] = []
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input, select, textarea',
  )

  inputs.forEach((el) => {
    const type = (el as HTMLInputElement).type?.toLowerCase()
    if (['hidden', 'submit', 'button', 'file', 'reset', 'image'].includes(type)) return
    if (el.offsetParent === null && type !== 'radio' && type !== 'checkbox') return

    const info = identifyField(el)
    if (info) {
      fields.push({ element: el, ...info })
    }
  })

  return fields
}

function identifyField(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): Omit<DetectedField, 'element'> | null {
  const hints: string[] = []

  if (el.name) hints.push(el.name.toLowerCase())
  if (el.id) hints.push(el.id.toLowerCase())
  if ('placeholder' in el && el.placeholder) hints.push(el.placeholder.toLowerCase())
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) hints.push(ariaLabel.toLowerCase())

  const label = findLabel(el)
  if (label) hints.push(label.toLowerCase())

  const parentText = getParentText(el)
  if (parentText) hints.push(parentText.toLowerCase())

  for (const [fieldType, config] of Object.entries(FIELD_MAPPING)) {
    for (const keyword of config.keywords) {
      if (hints.some((h) => h.includes(keyword.toLowerCase()))) {
        return {
          fieldType,
          dataPath: config.path,
          label: label || ('placeholder' in el ? el.placeholder : '') || el.name || fieldType,
          tagName: el.tagName.toLowerCase(),
          inputType: (el as HTMLInputElement).type || 'text',
        }
      }
    }
  }

  return null
}

function findLabel(el: Element): string {
  if (el.id) {
    const lbl = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)
    if (lbl) return lbl.textContent?.trim() ?? ''
  }

  const parentLabel = el.closest('label')
  if (parentLabel) {
    return (parentLabel.textContent ?? '').replace((el as HTMLInputElement).value ?? '', '').trim()
  }

  const prev = el.previousElementSibling
  if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN')) {
    return prev.textContent?.trim() ?? ''
  }

  return ''
}

function getParentText(el: Element): string {
  let parent = el.parentElement
  for (let i = 0; i < 3 && parent; i++) {
    const text = parent.textContent?.trim() ?? ''
    if (text.length > 0 && text.length < 50) return text
    parent = parent.parentElement
  }
  return ''
}

// ─── 值提取 ───────────────────────────────────────────────────────────────────

function getValueByPath(data: ResumeData, path: string): string {
  if (path === 'skills_text') {
    return data.skills.map((s) => (typeof s === 'string' ? s : s.name)).join(', ')
  }

  const parts = path.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = data
  for (const part of parts) {
    if (value == null) return ''
    value = isNaN(Number(part)) ? value[part] : value[Number(part)]
  }
  return value != null ? String(value) : ''
}

// ─── 填写逻辑 ─────────────────────────────────────────────────────────────────

function fillField(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
  fieldType: string,
): boolean {
  if (!value) return false

  if (el instanceof HTMLSelectElement) return fillSelect(el, value, fieldType)
  if ((el as HTMLInputElement).type === 'radio') return fillRadio(el as HTMLInputElement, value, fieldType)

  // React / Vue 兼容：使用 native setter 触发 onChange
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (nativeSetter) {
    nativeSetter.call(el, value)
  } else {
    el.value = value
  }

  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))

  return true
}

function fillSelect(el: HTMLSelectElement, value: string, fieldType: string): boolean {
  const options = Array.from(el.options)

  if (fieldType === 'gender') {
    for (const [, aliases] of Object.entries(GENDER_MAP)) {
      if (aliases.some((a) => value.includes(a) || a.includes(value))) {
        const opt = options.find((o) => aliases.some((a) => o.text.includes(a) || o.value.includes(a)))
        if (opt) {
          el.value = opt.value
          el.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
    }
  }

  const opt = options.find((o) => o.text.includes(value) || o.value.includes(value) || value.includes(o.text))
  if (opt) {
    el.value = opt.value
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  return false
}

function fillRadio(el: HTMLInputElement, value: string, fieldType: string): boolean {
  if (!el.name) return false
  const radios = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${el.name}"]`)

  if (fieldType === 'gender') {
    for (const radio of radios) {
      const lbl = findLabel(radio) || radio.value
      for (const [, aliases] of Object.entries(GENDER_MAP)) {
        if (aliases.some((a) => value.includes(a))) {
          if (aliases.some((a) => lbl.includes(a) || radio.value.includes(a))) {
            radio.checked = true
            radio.dispatchEvent(new Event('change', { bubbles: true }))
            return true
          }
        }
      }
    }
  }

  return false
}

function autoFill(resumeData: ResumeData): FillResult {
  const fields = scanFormFields()
  const result: FillResult = { filled: 0, skipped: 0, fields: [] }

  for (const field of fields) {
    const value = getValueByPath(resumeData, field.dataPath)
    const item: FillResultItem = { label: field.label, type: field.fieldType, status: 'no_data' }

    if (value) {
      const ok = fillField(field.element, value, field.fieldType)
      if (ok) {
        item.status = 'filled'
        result.filled++
        // 短暂高亮
        field.element.style.outline = '2px solid #52c41a'
        setTimeout(() => { field.element.style.outline = '' }, 3000)
      } else {
        item.status = 'skipped'
        result.skipped++
      }
    } else {
      result.skipped++
    }

    result.fields.push(item)
  }

  return result
}

// ─── 消息监听 ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtMessage, _sender, sendResponse: (resp: unknown) => void) => {
    if (message.type === 'DO_SCAN') {
      const fields = scanFormFields()
      sendResponse({
        success: true,
        fields: fields.map<ScannedField>((f) => ({
          fieldType: f.fieldType,
          label: f.label,
          tagName: f.tagName,
          inputType: f.inputType,
        })),
      })
      return true
    }

    if (message.type === 'DO_FILL' && message.data) {
      const results = autoFill(message.data)
      sendResponse({ success: true, results })
      return true
    }
  },
)
