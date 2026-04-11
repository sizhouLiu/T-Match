import { useQuery } from '@tanstack/react-query'
import { Table, Card, Typography, Tag, Button, Input, Select, Row, Col } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { jobsApi } from '../api'
import type { Job } from '../types'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

const Jobs = () => {
  
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.list(),
  })

  const columns: ColumnsType<Job> = [
    {
      title: '职位名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      render: (text: string) => text || '-',
    },
    {
      title: '薪资',
      dataIndex: 'salary_range',
      key: 'salary_range',
      render: (text: string) => text || '-',
    },
    {
      title: '类型',
      dataIndex: 'job_type',
      key: 'job_type',
      render: (text: string) => {
        const colorMap: Record<string, string> = {
          'full-time': 'blue',
          'part-time': 'green',
          'internship': 'orange',
        }
        return text ? <Tag color={colorMap[text] || 'default'}>{text}</Tag> : '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, _record: Job) => (
        <Button type="link" icon={<EyeOutlined />}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2} style={{ color: '#fff', marginBottom: '24px' }}>职位列表</Title>
      
      <Card style={{ background: '#1a1a1a', border: '1px solid #303030', marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input.Search 
              placeholder="搜索职位" 
              style={{ background: '#0e0e10', border: '1px solid #303030' }}
            />
          </Col>
          <Col span={4}>
            <Select 
              placeholder="工作类型" 
              style={{ width: '100%' }}
              options={[
                { value: 'full-time', label: '全职' },
                { value: 'part-time', label: '兼职' },
                { value: 'internship', label: '实习' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: '#1a1a1a', border: '1px solid #303030' }}>
        <Table 
          columns={columns} 
          dataSource={jobs} 
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          style={{ background: 'transparent' }}
        />
      </Card>
    </div>
  )
}

export default Jobs
