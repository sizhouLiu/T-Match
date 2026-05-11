import { useState, useMemo, useEffect, useRef } from 'react'
import { Button, Space, Modal, Input, message, Spin, Tooltip } from 'antd'
import {
  SaveOutlined, RobotOutlined, FormOutlined,
  LeftOutlined, RightOutlined, FullscreenOutlined, FullscreenExitOutlined,
  FilePdfOutlined,
} from '@ant-design/icons'
import { marked } from 'marked'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { ResumeContent } from './ResumeEditor'
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

marked.setOptions({ breaks: true, gfm: true })

const RESUME_PREVIEW_CSS = `
  .resume-preview {
    font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 40px 48px;
  }
  .resume-preview h1 {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: #111;
    letter-spacing: 1px;
  }
  .resume-preview h2 {
    font-size: 14px;
    font-weight: 700;
    color: #1a1a1a;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 4px;
    margin: 20px 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .resume-preview h3 {
    font-size: 13px;
    font-weight: 600;
    margin: 10px 0 4px 0;
    color: #111;
  }
  .resume-preview p {
    margin: 4px 0;
    color: #333;
  }
  .resume-preview ul {
    margin: 4px 0;
    padding-left: 20px;
  }
  .resume-preview li {
    margin: 2px 0;
    color: #333;
  }
  .resume-preview blockquote {
    border-left: 3px solid #555;
    margin: 6px 0;
    padding: 2px 12px;
    color: #555;
    font-style: italic;
  }
  .resume-preview strong {
    font-weight: 600;
    color: #111;
  }
  .resume-preview code {
    background: #f3f4f6;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 12px;
    font-family: monospace;
    color: #374151;
  }
  .resume-preview hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 12px 0;
  }
  .resume-preview a {
    color: #2563eb;
    text-decoration: none;
  }
`

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
  const [previewOnly, setPreviewOnly] = useState(false)
  const [editorOnly, setEditorOnly] = useState(false)
  const [exporting, setExporting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMarkdown(initialMarkdown)
  }, [initialMarkdown])

  const htmlPreview = useMemo(() => {
    try {
      return marked.parse(markdown || '') as string
    } catch {
      return ''
    }
  }, [markdown])

  const parsedContent = useMemo(() => {
    try {
      return parseMarkdownToResume(markdown)
    } catch {
      return parseMarkdownToResume('')
    }
  }, [markdown])

  const handleSave = async () => {
    if (!markdown.trim()) { message.warning('简历内容不能为空'); return }
    await onSave(markdown, parsedContent)
  }

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) { message.warning('请输入编辑指令'); return }
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

  const exportPDF = async () => {
    if (!previewRef.current) { message.error('预览区域未加载'); return }
    setExporting(true)
    const hide = message.loading('正在生成 PDF...', 0)
    try {
      const el = previewRef.current
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const A4_W = 210
      const A4_H = 297
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pxPerMm = canvas.width / A4_W
      const contentHeightMm = canvas.height / pxPerMm
      let yOffset = 0
      let pageIndex = 0
      while (yOffset < contentHeightMm) {
        if (pageIndex > 0) pdf.addPage()
        const srcY = yOffset * pxPerMm
        const srcH = Math.min(A4_H * pxPerMm, canvas.height - srcY)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = srcH
        const ctx = pageCanvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
        const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95)
        const renderedH = (srcH / pxPerMm)
        pdf.addImage(pageImg, 'JPEG', 0, 0, A4_W, renderedH)
        yOffset += A4_H
        pageIndex++
      }
      const filename = `${initialTitle || '简历'}.pdf`
      pdf.save(filename)
      message.success(`已导出 ${filename}`)
    } catch (e) {
      message.error('PDF 导出失败，请重试')
    } finally {
      hide()
      setExporting(false)
    }
  }

  const showEditor = !previewOnly
  const showPreview = !editorOnly

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 48px)', background: '#0a0a0a' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '8px 8px 0 0',
        flexShrink: 0,
      }}>
        <Space size={4}>
          <span style={{ color: '#71717a', fontSize: 13 }}>{initialTitle}</span>
          <span style={{ color: '#3f3f46', fontSize: 12 }}>·</span>
          <span style={{ color: '#52c41a', fontSize: 12 }}>● Markdown</span>
        </Space>
        <Space>
          <Tooltip title={editorOnly ? '显示预览' : '仅显示编辑器'}>
            <Button
              size="small"
              type={editorOnly ? 'primary' : 'text'}
              icon={<LeftOutlined />}
              onClick={() => { setEditorOnly(!editorOnly); setPreviewOnly(false) }}
              style={{ color: editorOnly ? undefined : '#a1a1aa' }}
            />
          </Tooltip>
          <Tooltip title={previewOnly ? '显示编辑器' : '仅显示预览'}>
            <Button
              size="small"
              type={previewOnly ? 'primary' : 'text'}
              icon={<RightOutlined />}
              onClick={() => { setPreviewOnly(!previewOnly); setEditorOnly(false) }}
              style={{ color: previewOnly ? undefined : '#a1a1aa' }}
            />
          </Tooltip>
          <Button size="small" icon={<FormOutlined />} onClick={onSwitchToForm} style={{ color: '#a1a1aa' }}>
            表单模式
          </Button>
          <Button size="small" icon={<RobotOutlined />} onClick={() => setAiModalVisible(true)} style={{ color: '#a78bfa' }}>
            AI 编辑
          </Button>
          <Button size="small" icon={<FilePdfOutlined />} onClick={exportPDF} loading={exporting} style={{ color: '#f97316' }}>
            导出 PDF
          </Button>
          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存
          </Button>
        </Space>
      </div>

      {/* Editor + Preview */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', border: '1px solid #27272a', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        {/* Left: Markdown Editor */}
        {showEditor && (
          <div style={{
            flex: showPreview ? '0 0 42%' : '1',
            display: 'flex',
            flexDirection: 'column',
            background: '#0d0d12',
            borderRight: showPreview ? '1px solid #27272a' : 'none',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '6px 16px',
              background: '#18181b',
              borderBottom: '1px solid #27272a',
              fontSize: 12,
              color: '#52525b',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Markdown</span>
              <span>{markdown.length} 字符</span>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={'# 姓名\n\n> 求职意向：职位\n\n**电话**: xxx | **邮箱**: xxx\n\n## 教育经历\n\n### 学校 · 学历 · 专业 (2020.09 - 2024.06)\n\n## 工作经历\n\n### 公司 · 职位 (2024.07 - 至今)\n\n负责...'}
              spellCheck={false}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#d4d4d8',
                fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", Monaco, Menlo, monospace',
                fontSize: 13.5,
                lineHeight: 1.7,
                resize: 'none',
                padding: '20px 20px',
                overflowY: 'auto',
              }}
            />
          </div>
        )}

        {/* Right: A4 Preview */}
        {showPreview && (
          <div style={{
            flex: 1,
            background: '#f0f0f0',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 16px',
          }}>
            <div style={{
              fontSize: 12,
              color: '#888',
              marginBottom: 12,
              alignSelf: 'flex-start',
              paddingLeft: 4,
            }}>
              预览
            </div>
            {/* A4 paper */}
            <div
              ref={previewRef}
              style={{
                width: 794,
                minHeight: 1123,
                background: '#fff',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              borderRadius: 2,
              flexShrink: 0,
            }}>
              <style>{RESUME_PREVIEW_CSS}</style>
              <div
                className="resume-preview"
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
              />
            </div>
          </div>
        )}
      </div>

      {/* AI Edit Modal */}
      <Modal
        title={<span style={{ color: '#fff' }}>✨ AI 智能编辑简历</span>}
        open={aiModalVisible}
        onCancel={() => { setAiModalVisible(false); setAiInstruction('') }}
        styles={{ content: { background: '#18181b', border: '1px solid #27272a' }, header: { background: '#18181b', borderBottom: '1px solid #27272a' }, body: { background: '#18181b' } }}
        footer={[
          <Button key="cancel" onClick={() => setAiModalVisible(false)} disabled={aiLoading}>取消</Button>,
          <Button key="submit" type="primary" onClick={handleAiEdit} loading={aiLoading} icon={<RobotOutlined />}>
            开始编辑
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: '#a1a1aa', marginBottom: 8, fontSize: 13 }}>示例指令：</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {['让工作经历更专业资深', '优化个人简介', '添加一个 Python 项目经历', '用 STAR 法则重写项目描述'].map(tip => (
              <span
                key={tip}
                onClick={() => setAiInstruction(tip)}
                style={{
                  background: '#27272a',
                  color: '#a1a1aa',
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {tip}
              </span>
            ))}
          </div>
        </div>
        <TextArea
          value={aiInstruction}
          onChange={(e) => setAiInstruction(e.target.value)}
          placeholder="描述你想做的修改..."
          rows={4}
          disabled={aiLoading}
          onPressEnter={(e) => { if (e.metaKey || e.ctrlKey) handleAiEdit() }}
          style={{ background: '#27272a', borderColor: '#3f3f46', color: '#d4d4d8' }}
        />
        <div style={{ color: '#52525b', fontSize: 12, marginTop: 6 }}>Ctrl+Enter 快速提交</div>
        {aiLoading && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Spin />
            <div style={{ marginTop: 8, color: '#a1a1aa', fontSize: 13 }}>AI 正在编辑简历，请稍候...</div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MarkdownResumeEditor

