import { useState, useMemo, useEffect } from 'react'
import { Button, Space, Modal, Input, message, Spin, Card } from 'antd'
import { SaveOutlined, RobotOutlined, FormOutlined } from '@ant-design/icons'
import type { ResumeContent } from './ResumeEditor'
import ResumePreview from './ResumePreview'
import { parseMarkdownToResume } from '../utils/markdownParser'
import { resumesApi } from '../api/resumes'

const { TextArea } = Input

interface MarkdownResumeEditorProps {
  resumeId: number
  initialMarkdown: string
  initialTitle: string
  onSave: (markdown: string, content: ResumeContent) => Promise<void>
  onSwitchToForm: () => void
  saving?: boolean
}

const MarkdownResumeEditor = ({
  resumeId,
  initialMarkdown,
  initialTitle,
  onSave,
  onSwitchToForm,
  saving,
}: MarkdownResumeEditorProps) => {
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    setMarkdown(initialMarkdown)
  }, [initialMarkdown])

  const parsedContent = useMemo(() => {
    try {
      return parseMarkdownToResume(markdown)
    } catch {
      return parseMarkdownToResume('')
    }
  }, [markdown])

  const handleSave = async () => {
    if (!markdown.trim()) {
      message.warning('简历内容不能为空')
      return
    }
    await onSave(markdown, parsedContent)
  }

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) {
      message.warning('请输入编辑指令')
      return
    }
    setAiLoading(true)
    try {
      const result = await resumesApi.aiEditMarkdown(resumeId, aiInstruction, markdown)
      setMarkdown(result.markdown)
      message.success('AI 编辑完成')
      setAiModalVisible(false)
      setAiInstruction('')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'AI 编辑失败，请重试')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#fff', margin: 0 }}>{initialTitle} - Markdown 编辑</h3>
        <Space>
          <Button icon={<FormOutlined />} onClick={onSwitchToForm}>
            切换到表单编辑
          </Button>
          <Button icon={<RobotOutlined />} onClick={() => setAiModalVisible(true)}>
            AI 编辑
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存简历
          </Button>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: 'calc(100vh - 200px)' }}>
        <Card
          title="Markdown 编辑"
          style={{ background: '#1a1a2e', border: '1px solid #27272a', height: '100%', overflow: 'hidden' }}
          styles={{ body: { padding: 0, height: 'calc(100% - 57px)', overflow: 'auto' } }}
        >
          <TextArea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="在此输入 Markdown 格式的简历..."
            style={{
              background: '#0d0d1a',
              border: 'none',
              color: '#d4d4d8',
              fontFamily: 'Monaco, Menlo, "Courier New", monospace',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'none',
              height: '100%',
              padding: 16,
            }}
          />
        </Card>

        <Card
          title="实时预览"
          style={{ background: '#1a1a2e', border: '1px solid #27272a', height: '100%', overflow: 'hidden' }}
          styles={{ body: { padding: 16, height: 'calc(100% - 57px)', overflow: 'auto' } }}
        >
          <ResumePreview content={parsedContent} />
        </Card>
      </div>

      <Modal
        title="AI 编辑简历"
        open={aiModalVisible}
        onCancel={() => {
          setAiModalVisible(false)
          setAiInstruction('')
        }}
        footer={[
          <Button key="cancel" onClick={() => setAiModalVisible(false)} disabled={aiLoading}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleAiEdit} loading={aiLoading}>
            开始编辑
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#a1a1aa', marginBottom: 8 }}>
            告诉 AI 你想如何修改简历，例如：
          </p>
          <ul style={{ color: '#71717a', fontSize: 13, paddingLeft: 20 }}>
            <li>让我的工作经历听起来更资深</li>
            <li>添加一个 Python 相关的项目经历</li>
            <li>优化个人简介，突出前端开发技能</li>
            <li>把教育经历移到最后</li>
          </ul>
        </div>
        <TextArea
          value={aiInstruction}
          onChange={(e) => setAiInstruction(e.target.value)}
          placeholder="输入编辑指令..."
          rows={4}
          disabled={aiLoading}
          style={{
            background: '#27272a',
            borderColor: '#3f3f46',
            color: '#d4d4d8',
          }}
        />
        {aiLoading && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Spin />
            <div style={{ marginTop: 8, color: '#a1a1aa' }}>AI 正在编辑简历...</div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MarkdownResumeEditor
