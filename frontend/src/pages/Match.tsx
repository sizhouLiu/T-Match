import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Table, Button, Card, Select, Input, Tag, Space, Typography, message, Progress } from 'antd'
import { SearchOutlined, SyncOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { matchResumeToJobsText, matchResumeToJobsId, reindexJobs } from '../api/match'
import { resumesApi } from '../api'
import type { MatchResult, Resume } from '../types'

const { TextArea } = Input
const { Text, Title } = Typography

const Match = () => {
  const [mode, setMode] = useState<'text' | 'resume'>('resume')
  const [resumeText, setResumeText] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)
  const [topK, setTopK] = useState(20)

  // Fetch user's resumes for the dropdown
  const { data: resumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumesApi.list(),
  })

  // Match mutation
  const matchMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'text') {
        if (!resumeText.trim()) throw new Error('Please enter resume text')
        return matchResumeToJobsText(resumeText, topK)
      } else {
        if (!selectedResumeId) throw new Error('Please select a resume')
        return matchResumeToJobsId(selectedResumeId, topK)
      }
    },
    onError: (error: Error) => {
      message.error(error.message || 'Match failed')
    },
  })

  // Reindex mutation
  const reindexMutation = useMutation({
    mutationFn: reindexJobs,
    onSuccess: () => message.success('Reindex task submitted'),
    onError: () => message.error('Reindex failed'),
  })

  const columns: ColumnsType<MatchResult> = [
    {
      title: 'Match Score',
      dataIndex: 'score',
      key: 'score',
      width: 120,
      render: (score: number) => {
        const percent = Math.round(score * 100)
        const color = percent >= 80 ? '#52c41a' : percent >= 60 ? '#1890ff' : '#faad14'
        return <Progress percent={percent} size="small" strokeColor={color} />
      },
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Position',
      dataIndex: ['job', 'title'],
      key: 'title',
      width: 200,
    },
    {
      title: 'Company',
      dataIndex: ['job', 'company'],
      key: 'company',
      width: 150,
    },
    {
      title: 'Location',
      dataIndex: ['job', 'location'],
      key: 'location',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: 'Education',
      dataIndex: ['job', 'education'],
      key: 'education',
      width: 80,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: 'Company Type',
      dataIndex: ['job', 'company_type'],
      key: 'company_type',
      width: 100,
      render: (text: string) => {
        if (!text) return '-'
        const colorMap: Record<string, string> = {
          'Central SOE': 'gold', 'SOE': 'orange', 'Listed': 'green',
          'Large': 'blue', 'Medium': 'cyan',
        }
        return <Tag color={colorMap[text] || 'default'}>{text}</Tag>
      },
    },
    {
      title: 'Industry',
      dataIndex: ['job', 'industry'],
      key: 'industry',
      width: 120,
      render: (text: string) => text || '-',
    },
  ]

  return (
    <div style={{ padding: '16px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>Resume-to-Job Match</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Mode selector */}
          <Space>
            <Text>Input mode:</Text>
            <Select
              value={mode}
              onChange={setMode}
              options={[
                { value: 'resume', label: 'Select saved resume' },
                { value: 'text', label: 'Paste resume text' },
              ]}
              style={{ width: 200 }}
            />
            <Text>Top K:</Text>
            <Select
              value={topK}
              onChange={setTopK}
              options={[10, 20, 50].map(n => ({ value: n, label: n }))}
              style={{ width: 80 }}
            />
          </Space>

          {/* Input area */}
          {mode === 'resume' ? (
            <Select
              placeholder="Select a resume"
              value={selectedResumeId}
              onChange={setSelectedResumeId}
              style={{ width: 300 }}
              options={(resumes || []).map((r: Resume) => ({ value: r.id, label: r.title }))}
            />
          ) : (
            <TextArea
              rows={6}
              placeholder="Paste your resume text here..."
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
            />
          )}

          {/* Actions */}
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={matchMutation.isPending}
              onClick={() => matchMutation.mutate()}
            >
              Find Matching Jobs
            </Button>
            <Button
              icon={<SyncOutlined />}
              loading={reindexMutation.isPending}
              onClick={() => reindexMutation.mutate()}
            >
              Reindex Jobs
            </Button>
          </Space>

          {/* Query time */}
          {matchMutation.data && (
            <Text type="secondary">
              Found {matchMutation.data.results.length} results in {matchMutation.data.query_time_ms.toFixed(0)}ms
            </Text>
          )}
        </Space>
      </Card>

      {/* Results table */}
      {matchMutation.data && (
        <Table
          columns={columns}
          dataSource={matchMutation.data.results}
          rowKey={(record) => record.job.id}
          size="small"
          pagination={{ pageSize: 20, showTotal: (total) => `${total} results` }}
          scroll={{ x: 900 }}
        />
      )}
    </div>
  )
}

export default Match
