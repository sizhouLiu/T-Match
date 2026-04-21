import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Typography, List, Button, Empty, Modal, Space, Tag, Popconfirm, message, Spin } from 'antd'
import {
  PlusOutlined, FileTextOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, StarOutlined, StarFilled, RobotOutlined,
} from '@ant-design/icons'
import { resumesApi } from '../api'
import { useAuthStore } from '../stores/authStore'
import ResumeEditor from '../components/ResumeEditor'
import ResumePreview from '../components/ResumePreview'
import type { ResumeContent } from '../components/ResumeEditor'
import type { Resume } from '../types'

const { Title, Text } = Typography

type ViewMode = 'list' | 'create' | 'edit' | 'preview'

const Resumes = () => {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentResume, setCurrentResume] = useState<Resume | null>(null)
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: () => resumesApi.list(user!.id),
    enabled: !!user?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: ResumeContent }) =>
      resumesApi.create(user!.id, {
        title: data.title,
        content: data.content as unknown as Record<string, unknown>,
      }),
    onSuccess: () => {
      message.success('简历创建成功')
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      setViewMode('list')
    },
    onError: () => message.error('创建失败，请重试'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; title: string; content: ResumeContent }) =>
      resumesApi.update(data.id, {
        title: data.title,
        content: data.content as unknown as Record<string, unknown>,
      }),
    onSuccess: () => {
      message.success('简历更新成功')
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      setViewMode('list')
    },
    onError: () => message.error('更新失败，请重试'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resumesApi.delete(id),
    onSuccess: () => {
      message.success('简历已删除')
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
    onError: () => message.error('删除失败'),
  })

  const setPrimaryMutation = useMutation({
    mutationFn: (id: number) => resumesApi.update(id, { is_primary: 1 }),
    onSuccess: () => {
      message.success('已设为主简历')
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })

  const handleCreate = async (title: string, content: ResumeContent) => {
    await createMutation.mutateAsync({ title, content })
  }

  const handleUpdate = async (title: string, content: ResumeContent) => {
    if (!currentResume) return
    await updateMutation.mutateAsync({ id: currentResume.id, title, content })
  }

  const handleEdit = (resume: Resume) => {
    setCurrentResume(resume)
    setViewMode('edit')
  }

  const handlePreview = (resume: Resume) => {
    setCurrentResume(resume)
    setViewMode('preview')
  }

  const handleAiOptimize = async (resume: Resume) => {
    setCurrentResume(resume)
    setAiModalVisible(true)
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await resumesApi.aiOptimize(resume.id)
      setAiResult(res.optimized_text)
    } catch {
      message.error('AI 优化失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }

  const handleApplyAiResult = async () => {
    if (!currentResume || !aiResult) return
    await resumesApi.update(currentResume.id, { optimized_text: aiResult })
    message.success('AI 优化结果已保存')
    queryClient.invalidateQueries({ queryKey: ['resumes'] })
    setAiModalVisible(false)
  }

  // 列表视图
  if (viewMode === 'list') {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#fff', margin: 0 }}>我的简历</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCurrentResume(null); setViewMode('create') }}>
            新建简历
          </Button>
        </div>

        <Card style={{ background: '#1a1a1a', border: '1px solid #303030' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : resumes && resumes.length > 0 ? (
            <List
              dataSource={resumes}
              renderItem={(resume: Resume) => (
                <List.Item
                  style={{ borderBottom: '1px solid #27272a', padding: '16px 0' }}
                  actions={[
                    <Button
                      type="text"
                      icon={resume.is_primary === 1 ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                      onClick={() => setPrimaryMutation.mutate(resume.id)}
                      style={{ color: resume.is_primary === 1 ? '#faad14' : '#a1a1aa' }}
                    >
                      {resume.is_primary === 1 ? '主简历' : '设为主简历'}
                    </Button>,
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(resume)} style={{ color: '#a1a1aa' }}>
                      预览
                    </Button>,
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(resume)} style={{ color: '#3b82f6' }}>
                      编辑
                    </Button>,
                    <Button type="text" icon={<RobotOutlined />} onClick={() => handleAiOptimize(resume)} style={{ color: '#52c41a' }}>
                      AI优化
                    </Button>,
                    <Popconfirm title="确定删除这份简历吗？" onConfirm={() => deleteMutation.mutate(resume.id)} okText="删除" cancelText="取消">
                      <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 28, color: '#3b82f6' }} />}
                    title={
                      <Space>
                        <span style={{ color: '#fff', fontSize: 16 }}>{resume.title}</span>
                        {resume.is_primary === 1 && <Tag color="gold">主简历</Tag>}
                        {resume.optimized_text && <Tag color="green">已AI优化</Tag>}
                      </Space>
                    }
                    description={
                      <Text style={{ color: '#71717a' }}>
                        创建于 {new Date(resume.created_at).toLocaleDateString('zh-CN')}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty
              description={<Text style={{ color: '#71717a' }}>还没有简历，创建一份吧</Text>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '60px 0' }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setViewMode('create')}>
                创建第一份简历
              </Button>
            </Empty>
          )}
        </Card>

        {/* AI 优化结果弹窗 */}
        <Modal
          title="AI 简历优化建议"
          open={aiModalVisible}
          onCancel={() => setAiModalVisible(false)}
          width={700}
          footer={aiResult ? [
            <Button key="cancel" onClick={() => setAiModalVisible(false)}>关闭</Button>,
            <Button key="apply" type="primary" onClick={handleApplyAiResult}>应用优化结果</Button>,
          ] : null}
        >
          {aiLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#a1a1aa' }}>AI 正在分析你的简历...</div>
            </div>
          ) : aiResult ? (
            <div style={{ whiteSpace: 'pre-wrap', color: '#d4d4d8', background: '#141428', padding: 16, borderRadius: 8, maxHeight: 500, overflow: 'auto' }}>
              {aiResult}
            </div>
          ) : null}
        </Modal>
      </div>
    )
  }

  // 创建视图
  if (viewMode === 'create') {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <Button type="text" onClick={() => setViewMode('list')} style={{ color: '#a1a1aa', marginBottom: 16 }}>
          &larr; 返回简历列表
        </Button>
        <ResumeEditor onSave={handleCreate} saving={createMutation.isPending} />
      </div>
    )
  }

  // 编辑视图
  if (viewMode === 'edit' && currentResume) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <Button type="text" onClick={() => setViewMode('list')} style={{ color: '#a1a1aa', marginBottom: 16 }}>
          &larr; 返回简历列表
        </Button>
        <ResumeEditor
          initialTitle={currentResume.title}
          initialContent={currentResume.content as unknown as ResumeContent}
          onSave={handleUpdate}
          saving={updateMutation.isPending}
        />
      </div>
    )
  }

  // 预览视图
  if (viewMode === 'preview' && currentResume) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Button type="text" onClick={() => setViewMode('list')} style={{ color: '#a1a1aa' }}>
            &larr; 返回简历列表
          </Button>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setViewMode('edit')}>编辑</Button>
            <Button type="primary" icon={<RobotOutlined />} onClick={() => handleAiOptimize(currentResume)}>AI优化</Button>
          </Space>
        </div>
        <Title level={3} style={{ color: '#fff', marginBottom: 16 }}>{currentResume.title}</Title>
        {currentResume.optimized_text && (
          <Card style={{ background: '#0f2a1a', border: '1px solid #1a4a2a', marginBottom: 16 }}>
            <Title level={5} style={{ color: '#52c41a', marginBottom: 8 }}>
              <RobotOutlined /> AI 优化建议
            </Title>
            <Text style={{ color: '#d4d4d8', whiteSpace: 'pre-wrap' }}>
              {currentResume.optimized_text}
            </Text>
          </Card>
        )}
        <ResumePreview content={currentResume.content as unknown as ResumeContent} />
      </div>
    )
  }

  return null
}

export default Resumes
