import client from './client';
import { MatchResponse } from '../types';

export const matchResumeToJobsText = async (resumeText: string, topK: number = 20): Promise<MatchResponse> => {
  const response = await client.post('/match/resume-to-jobs', {
    resume_text: resumeText,
    top_k: topK
  });
  return response.data;
};

export const matchResumeToJobsId = async (resumeId: number, topK: number = 20): Promise<MatchResponse> => {
  const response = await client.post('/match/resume-to-jobs', {
    resume_id: resumeId,
    top_k: topK
  });
  return response.data;
};

export const reindexJobs = async (): Promise<{ message: string }> => {
  const response = await client.post('/match/reindex');
  return response.data;
};
