import type { ResumeContent } from '../components/ResumeEditor'

export function parseMarkdownToResume(markdown: string): ResumeContent {
  if (!markdown?.trim()) return emptyResume()

  const result = emptyResume()
  const bi = result.basic_info
  const sections = markdown.split(/\n(?=## )/)
  const header = sections[0] ?? ''

  const nameMatch = header.match(/^#\s+(.+)$/m)
  if (nameMatch) bi.name = nameMatch[1].trim()

  const intentMatch = header.match(/^>\s*求职意向[：:]\s*(.+)$/m)
  if (intentMatch) bi.job_intention = intentMatch[1].trim()

  const phoneMatch = header.match(/\*\*电话\*\*[：:]\s*([^\s|]+)/)
  if (phoneMatch) bi.phone = phoneMatch[1].trim()

  const emailMatch = header.match(/\*\*邮箱\*\*[：:]\s*([^\s|]+)/)
  if (emailMatch) bi.email = emailMatch[1].trim()

  const cityMatch = header.match(/\*\*城市\*\*[：:]\s*([^\s|]+)/)
  if (cityMatch) bi.location = cityMatch[1].trim()

  const genderMatch = header.match(/\*\*性别\*\*[：:]\s*([^\s|]+)/)
  if (genderMatch) bi.gender = genderMatch[1].trim()

  const birthMatch = header.match(/\*\*出生年月\*\*[：:]\s*([^\s|]+)/)
  if (birthMatch) bi.birth_date = birthMatch[1].trim()

  for (const section of sections.slice(1)) {
    const headingMatch = section.match(/^##\s+(.+)$/m)
    if (!headingMatch) continue
    const heading = headingMatch[1].trim()
    const body = section.slice(headingMatch.index! + headingMatch[0].length).trim()

    if (heading === '个人简介') {
      bi.self_summary = body
    } else if (heading === '教育经历') {
      result.education = parseEducation(body)
    } else if (heading === '工作经历') {
      result.work_experience = parseWork(body)
    } else if (heading === '项目经历') {
      result.project_experience = parseProject(body)
    } else if (heading === '专业技能') {
      result.skills = parseSkills(body)
    } else if (heading === '荣誉奖项') {
      result.awards = parseAwards(body)
    }
  }

  return result
}

function emptyResume(): ResumeContent {
  return {
    basic_info: { name: '', phone: '', email: '', location: '', birth_date: '', gender: '', job_intention: '', self_summary: '' },
    education: [],
    work_experience: [],
    project_experience: [],
    skills: [],
    awards: [],
  }
}

function parseDates(str: string): [string, string] {
  const m = str.match(/\((.+?)\s*-\s*(.+?)\)$/)
  if (!m) return ['', '']
  return [m[1].trim(), m[2].trim() === '至今' ? '' : m[2].trim()]
}

function splitItems(body: string): string[] {
  return body.split(/\n(?=###\s)/).map(s => s.trim()).filter(Boolean)
}

function parseEducation(body: string) {
  return splitItems(body).map(item => {
    const m = item.match(/^###\s+(.+?)\s+·\s+(.+?)\s+·\s+(.+?)\s+(\(.+?\))/)
    if (!m) return null
    const [start, end] = parseDates(m[4])
    const rest = item.slice(m[0].length).trim()
    const gpaMatch = rest.match(/GPA[：:]\s*([\d./]+)/)
    const gpa = gpaMatch ? gpaMatch[1] : ''
    const desc = rest.replace(/^-\s*GPA[：:].*$/m, '').replace(/^-\s*/gm, '').trim()
    return { school: m[1].trim(), degree: m[2].trim(), major: m[3].trim(), start_date: start, end_date: end, gpa, description: desc }
  }).filter(Boolean) as ResumeContent['education']
}

function parseWork(body: string) {
  return splitItems(body).map(item => {
    const m = item.match(/^###\s+(.+?)\s+·\s+(.+?)\s+(\(.+?\))/)
    if (!m) return null
    const [start, end] = parseDates(m[3])
    const desc = item.slice(m[0].length).trim()
    return { company: m[1].trim(), position: m[2].trim(), start_date: start, end_date: end, description: desc }
  }).filter(Boolean) as ResumeContent['work_experience']
}

function parseProject(body: string) {
  return splitItems(body).map(item => {
    const m = item.match(/^###\s+(.+?)\s+·\s+(.+?)\s+(\(.+?\))/)
    if (!m) return null
    const [start, end] = parseDates(m[3])
    const rest = item.slice(m[0].length).trim()
    const techMatch = rest.match(/\*\*技术栈\*\*[：:]\s*(.+?)(?:\n|$)/)
    const tech = techMatch ? techMatch[1].trim() : ''
    const desc = rest.replace(/^-\s*\*\*技术栈\*\*.*$/m, '').replace(/^-\s*/gm, '').trim()
    return { name: m[1].trim(), role: m[2].trim(), start_date: start, end_date: end, description: desc, tech_stack: tech }
  }).filter(Boolean) as ResumeContent['project_experience']
}

function parseSkills(body: string) {
  return body.split('\n').map(line => {
    const stripped = line.trim().replace(/^-\s*/, '')
    if (!stripped.includes(':') && !stripped.includes('：')) return null
    const parts = stripped.split(/[：:]/)
    if (parts.length < 2) return null
    const name = parts[0].trim()
    const level = Math.max(1, Math.min(5, parseInt(parts[1].trim(), 10) || 3))
    return name ? { name, level } : null
  }).filter(Boolean) as ResumeContent['skills']
}

function parseAwards(body: string) {
  return splitItems(body).map(item => {
    const firstLine = item.split('\n')[0]
    const m = firstLine.match(/^###\s+(.+?)(?:\s+\((.+?)\))?$/)
    if (!m) return null
    const desc = item.split('\n').slice(1).join('\n').trim()
    return { name: m[1].trim(), date: m[2] ?? '', description: desc }
  }).filter(Boolean) as ResumeContent['awards']
}
