import api from './client'
import type { Job, JobApplication } from '../types'

export interface CreateJobRequest {
  title: string
  company: string
  location?: string
  description?: string
  requirements?: string
  salary_range?: string
  job_type?: string
  source_url?: string
}

export interface CreateApplicationRequest {
  job_id: number
  notes?: string
}

export interface UpdateApplicationRequest {
  status?: string
  notes?: string
}

export const jobsApi = {
  list: async (skip = 0, limit = 20): Promise<Job[]> => {
    const response = await api.get<Job[]>('/jobs/', { params: { skip, limit } })
    return response.data
  },

  get: async (id: number): Promise<Job> => {
    const response = await api.get<Job>(`/jobs/${id}`)
    return response.data
  },

  create: async (data: CreateJobRequest): Promise<Job> => {
    const response = await api.post<Job>('/jobs/', data)
    return response.data
  },

  apply: async (userId: number, data: CreateApplicationRequest): Promise<JobApplication> => {
    const response = await api.post<JobApplication>('/jobs/apply', data, { params: { user_id: userId } })
    return response.data
  },

  getApplications: async (userId: number): Promise<JobApplication[]> => {
    const response = await api.get<JobApplication[]>(`/jobs/applications/${userId}`)
    return response.data
  },

  updateApplication: async (applicationId: number, data: UpdateApplicationRequest): Promise<JobApplication> => {
    const response = await api.patch<JobApplication>(`/jobs/applications/${applicationId}`, data)
    return response.data
  },
}
