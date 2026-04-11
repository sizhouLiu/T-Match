import { useQuery } from '@tanstack/react-query'
import { Card, Typography, List, Button, Empty } from 'antd'
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons'
import { resumesApi } from '../api'
import { useAuthStore } from '../stores/authStore'

const { Title } = Typography

const Resumes = () => {
  const user = useAuthStore((state) => state.user)

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: () => resumesApi.list(user!.id),
    enabled: !!user?.id,
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ color: '#fff', margin: 0 }}>我的简历</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          新建简历
        </Button>
      </div>

      <Card style={{ background: '#1a1a1a', border: '1px solid #303030' }}>
        {resumes && resumes.length > 0 ? (
          <List
            loading={isLoading}
            dataSource={resumes}
            renderItem={(resume) => (
              <List.Item
                actions={[
                  <Button type="link">编辑</Button>,
                  <Button type="link" danger>删除</Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                  title={<span style={{ color: '#fff' }}>{resume.title}</span>}
                  description={
                    <span style={{ color: '#999' }}>
                      创建于 {new Date(resume.created_at).toLocaleDateString()}
                      {resume.is_primary === 1 && ' | 主简历'}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty 
            description="还没有简历" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              创建第一份简历
            </Button>
          </Empty>
        )}
      </Card>
    </div>
  )
}

export default Resumes
