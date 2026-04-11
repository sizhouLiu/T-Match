import api from './client'
import type { Resume } from '../types'

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
  list: async (userId: number): Promise<Resume[]> => {
    const response = await api.get<Resume[]>('/resumes/', { params: { user_id: userId } })
    return response.data
  },

  get: async (id: number): Promise<Resume> => {
    const response = await api.get<Resume>(`/resumes/${id}`)
    return response.data
  },

  create: async (userId: number, data: CreateResumeRequest): Promise<Resume> => {
    const response = await api.post<Resume>('/resumes/', data, { params: { user_id: userId } })
    return response.data
  },

  update: async (id: number, data: UpdateResumeRequest): Promise<Resume> => {
    const response = await api.patch<Resume>(`/resumes/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/resumes/${id}`)
  },
}
