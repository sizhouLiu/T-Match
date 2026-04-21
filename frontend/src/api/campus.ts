import api from './client'
import type { CampusRecruitment } from '../types'

export const campusApi = {
  list: async (skip = 0, limit = 200): Promise<CampusRecruitment[]> => {
    const response = await api.get<CampusRecruitment[]>('/campus/', { params: { skip, limit } })
    return response.data
  },

  get: async (id: number): Promise<CampusRecruitment> => {
    const response = await api.get<CampusRecruitment>(`/campus/${id}`)
    return response.data
  },

  runScraper: async (demoId = 'banking', direction = '金融学专业', maxPages = 1) => {
    const response = await api.get('/campus/run-scraper', {
      params: { demo_id: demoId, direction, max_pages: maxPages },
    })
    return response.data
  },
}
