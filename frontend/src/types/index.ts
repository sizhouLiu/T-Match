export interface User {
  id: number
  email: string
  username: string | null
  is_active: boolean
  created_at: string
}

export interface Job {
  id: number
  position_id: string | null
  title: string
  company: string
  location: string | null
  description: string | null
  requirements: string | null
  salary_range: string | null
  job_type: string | null
  source_url: string | null
  update_date: string | null
  company_type: string | null
  industry: string | null
  credit_score: string | null
  match_score: string | null
  education: string | null
  grade: string | null
  major: string | null
  detail_url: string | null
  created_at: string
}

export interface JobApplication {
  id: number
  user_id: number
  job_id: number
  status: 'pending' | 'applied' | 'interview' | 'offer' | 'rejected'
  notes: string | null
  applied_at: string
}

export interface Resume {
  id: number
  user_id: number
  title: string
  content: Record<string, unknown>
  original_text: string | null
  optimized_text: string | null
  is_primary: number
  created_at: string
}

export interface MatchResult {
  job: Job;
  score: number;
}

export interface MatchResponse {
  results: MatchResult[];
  query_time_ms: number;
}
