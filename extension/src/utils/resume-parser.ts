import type { ResumeData } from '../types/resume'

/**
 * 解析简历文件（支持 JSON、纯文本）
 */
export async function parseResume(file: File): Promise<ResumeData> {
  const fileName = file.name.toLowerCase()

  if (file.type === 'application/json' || fileName.endsWith('.json')) {
    return parseJSONResume(file)
  }

  if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
    return parseTextResume(file)
  }

  throw new Error('不支持的文件格式，请上传 JSON 或 TXT 文件')
}

async function parseJSONResume(file: File): Promise<ResumeData> {
  const text = await file.text()
  const data = JSON.parse(text)
  return normalizeResumeData(data)
}

async function parseTextResume(file: File): Promise<ResumeData> {
  const text = await file.text()

  const basic: Record<string, string> = {}

  const nameMatch = text.match(/(?:姓名|Name)[：:]\s*([^\n]+)/) || text.match(/^([^\n]{2,4})\n/)
  if (nameMatch) basic.name = nameMatch[1].trim()

  const phoneMatch = text.match(/1[3-9]\d{9}/)
  if (phoneMatch) basic.phone = phoneMatch[0]

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  if (emailMatch) basic.email = emailMatch[0]

  const genderMatch = text.match(/(?:性别|Gender)[：:]\s*(男|女|Male|Female)/)
  if (genderMatch) basic.gender = genderMatch[1]

  const birthMatch = text.match(/(?:出生日期|生日|Birth)[：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/)
  if (birthMatch) basic.birth_date = birthMatch[1]

  const locationMatch = text.match(/(?:地址|住址|Location|现居)[：:]\s*([^\n]+)/)
  if (locationMatch) basic.location = locationMatch[1].trim()

  const intentionMatch = text.match(/(?:求职意向|应聘岗位|Job Intention)[：:]\s*([^\n]+)/)
  if (intentionMatch) basic.job_intention = intentionMatch[1].trim()

  return normalizeResumeData({ basic_info: basic })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeResumeData(data: any): ResumeData {
  return {
    basic_info: {
      name: data.basic_info?.name || data.name || '',
      phone: data.basic_info?.phone || data.phone || '',
      email: data.basic_info?.email || data.email || '',
      gender: data.basic_info?.gender || data.gender || '',
      birth_date: data.basic_info?.birth_date || data.birth_date || '',
      location: data.basic_info?.location || data.location || '',
      job_intention: data.basic_info?.job_intention || data.job_intention || '',
      self_summary: data.basic_info?.self_summary || data.self_summary || '',
    },
    education: Array.isArray(data.education) ? data.education : [],
    work_experience: Array.isArray(data.work_experience) ? data.work_experience : [],
    project_experience: Array.isArray(data.project_experience) ? data.project_experience : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    awards: Array.isArray(data.awards) ? data.awards : [],
  }
}
