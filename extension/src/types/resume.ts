export interface BasicInfo {
  name: string
  phone: string
  email: string
  gender: string
  birth_date: string
  location: string
  job_intention: string
  self_summary: string
}

export interface Education {
  school: string
  degree: string
  major: string
  start_date: string
  end_date: string
  gpa: string
  description: string
}

export interface WorkExperience {
  company: string
  position: string
  start_date: string
  end_date: string
  description: string
}

export interface ProjectExperience {
  name: string
  role: string
  start_date: string
  end_date: string
  description: string
  tech_stack: string
}

export interface Skill {
  name: string
  level: number
}

export interface Award {
  name: string
  date: string
  description: string
}

export interface ResumeData {
  basic_info: BasicInfo
  education: Education[]
  work_experience: WorkExperience[]
  project_experience: ProjectExperience[]
  skills: Skill[]
  awards: Award[]
}

/** chrome.runtime message types */
export type MessageType = 'SAVE_RESUME' | 'GET_RESUME' | 'FILL_FORM' | 'SCAN_FORM' | 'DO_FILL' | 'DO_SCAN'

export interface ExtMessage {
  type: MessageType
  data?: ResumeData
}

export interface ScannedField {
  fieldType: string
  label: string
  tagName: string
  inputType: string
}

export interface FillResultItem {
  label: string
  type: string
  status: 'filled' | 'skipped' | 'no_data'
}

export interface FillResult {
  filled: number
  skipped: number
  fields: FillResultItem[]
}

export interface FieldMapping {
  keywords: string[]
  path: string
}
