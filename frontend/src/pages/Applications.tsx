import { useQuery } from '@tanstack/react-query'
import { Table, Card, Typography, Tag } from 'antd'
import { jobsApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import type { JobApplication } from '../types'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '待处理' },
  applied: { color: 'blue', text: '已投递' },
  interview: { color: 'orange', text: '面试中' },
  offer: { color: 'green', text: '已录用' },
  rejected: { color: 'red', text: '已拒绝' },
}

const Applications = () => {
  const user = useAuthStore((state) => state.user)

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', user?.id],
    queryFn: () => jobsApi.getApplications(user!.id),
    enabled: !!user?.id,
  })

  const columns: ColumnsType<JobApplication> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '职位ID',
      dataIndex: 'job_id',
      key: 'job_id',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { color, text } = statusMap[status] || { color: 'default', text: status }
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      render: (text: string) => text || '-',
    },
    {
      title: '投递时间',
      dataIndex: 'applied_at',
      key: 'applied_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2} style={{ color: '#fff', marginBottom: '24px' }}>投递记录</Title>
      
      <Card style={{ background: '#1a1a1a', border: '1px solid #303030' }}>
        <Table 
          columns={columns} 
          dataSource={applications} 
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          style={{ background: 'transparent' }}
        />
      </Card>
    </div>
  )
}

export default Applications
