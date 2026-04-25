import api from './client'
import type { Resume } from '../types'

export interface ResumeContent {
  basic_info: {
    name: string
    phone: string
    email: string
    location: string
    birth_date: string
    gender: string
    job_intention: string
    self_summary: string
  }
  education: Array<{
    school: string
    degree: string
    major: string
    start_date: string
    end_date: string
    gpa: string
    description: string
  }>
  work_experience: Array<{
    company: string
    position: string
    start_date: string
    end_date: string
    description: string
  }>
  project_experience: Array<{
    name: string
    role: string
    start_date: string
    end_date: string
    description: string
    tech_stack: string
  }>
  skills: Array<{
    name: string
    level: number
  }>
  awards: Array<{
    name: string
    date: string
    description: string
  }>
}

export interface CreateResumeRequest {
  title: string
  content: Record<string, unknown>
  original_text?: string
}

export interface UpdateResumeRequest {
  title?: string
  content?: Record<string, unknown>
  optimized_text?: string
  is_primary?: number
}

export const resumesApi = {
  list: async (): Promise<Resume[]> => {
    const response = await api.get<Resume[]>('/resumes/')
    return response.data
  },

  get: async (id: number): Promise<Resume> => {
    const response = await api.get<Resume>(`/resumes/${id}`)
    return response.data
  },

  create: async (data: CreateResumeRequest): Promise<Resume> => {
    const response = await api.post<Resume>('/resumes/', data)
    return response.data
  },

  update: async (id: number, data: UpdateResumeRequest): Promise<Resume> => {
    const response = await api.patch<Resume>(`/resumes/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/resumes/${id}`)
  },

  aiOptimize: async (id: number): Promise<{ optimized_text: string }> => {
    const response = await api.post<{ optimized_text: string }>(`/resumes/${id}/optimize`)
    return response.data
  },

  parseFile: async (file: File): Promise<ResumeContent> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<ResumeContent>('/resumes/parse-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}
