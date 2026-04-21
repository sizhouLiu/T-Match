import { useState, useEffect } from 'react'
import {
  Form, Input, Button, Card, Space, Typography, Divider,
  DatePicker, Rate, message, Tabs,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, UserOutlined,
  BookOutlined, BankOutlined, ProjectOutlined,
  ToolOutlined, TrophyOutlined, SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

export interface ResumeBasicInfo {
  name: string
  phone: string
  email: string
  location: string
  birth_date: string
  gender: string
  job_intention: string
  self_summary: string
}

export interface Education {
  school: string
  degree: string
  major: string
  start_date: string
  end_date: string
  gpa: string
  description: string
}

export interface WorkExperience {
  company: string
  position: string
  start_date: string
  end_date: string
  description: string
}

export interface ProjectExperience {
  name: string
  role: string
  start_date: string
  end_date: string
  description: string
  tech_stack: string
}

export interface Skill {
  name: string
  level: number
}

export interface Award {
  name: string
  date: string
  description: string
}

export interface ResumeContent {
  basic_info: ResumeBasicInfo
  education: Education[]
  work_experience: WorkExperience[]
  project_experience: ProjectExperience[]
  skills: Skill[]
  awards: Award[]
}

const emptyContent: ResumeContent = {
  basic_info: {
    name: '', phone: '', email: '', location: '',
    birth_date: '', gender: '', job_intention: '', self_summary: '',
  },
  education: [],
  work_experience: [],
  project_experience: [],
  skills: [],
  awards: [],
}

interface ResumeEditorProps {
  initialTitle?: string
  initialContent?: ResumeContent
  onSave: (title: string, content: ResumeContent) => Promise<void>
  saving?: boolean
}

const ResumeEditor = ({ initialTitle, initialContent, onSave, saving }: ResumeEditorProps) => {
  const [title, setTitle] = useState(initialTitle || '')
  const [content, setContent] = useState<ResumeContent>(initialContent || emptyContent)

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle)
    if (initialContent) setContent(initialContent)
  }, [initialTitle, initialContent])

  const updateBasicInfo = (field: keyof ResumeBasicInfo, value: string) => {
    setContent(prev => ({
      ...prev,
      basic_info: { ...prev.basic_info, [field]: value },
    }))
  }

  const addItem = <T,>(key: keyof ResumeContent, item: T) => {
    setContent(prev => ({
      ...prev,
      [key]: [...(prev[key] as T[]), item],
    }))
  }

  const removeItem = (key: keyof ResumeContent, index: number) => {
    setContent(prev => ({
      ...prev,
      [key]: (prev[key] as unknown[]).filter((_, i) => i !== index),
    }))
  }

  const updateItem = <T,>(key: keyof ResumeContent, index: number, field: keyof T, value: unknown) => {
    setContent(prev => {
      const arr = [...(prev[key] as T[])]
      arr[index] = { ...arr[index], [field]: value }
      return { ...prev, [key]: arr }
    })
  }

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning('请输入简历标题')
      return
    }
    if (!content.basic_info.name.trim()) {
      message.warning('请输入姓名')
      return
    }
    await onSave(title, content)
  }

  const cardStyle = { background: '#1a1a2e', border: '1px solid #27272a', marginBottom: 16 }
  const inputStyle = { background: '#27272a', borderColor: '#3f3f46', color: '#d4d4d8' }

  const tabItems = [
    {
      key: 'basic',
      label: <span><UserOutlined /> 基本信息</span>,
      children: (
        <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
          <Form layout="vertical">
            <Form.Item label={<Text style={{ color: '#a1a1aa' }}>简历标题</Text>} required>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如：前端开发工程师-张三"
                style={inputStyle}
              />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item label={<Text style={{ color: '#a1a1aa' }}>姓名</Text>} required>
                <Input value={content.basic_info.name} onChange={e => updateBasicInfo('name', e.target.value)} placeholder="姓名" style={inputStyle} />
              </Form.Item>
              <Form.Item label={<Text style={{ color: '#a1a1aa' }}>性别</Text>}>
                <Input value={content.basic_info.gender} onChange={e => updateBasicInfo('gender', e.target.value)} placeholder="性别" style={inputStyle} />
              </Form.Item>
              <Form.Item label={<Text style={{ color: '#a1a1aa' }}>手机号</Text>}>
                <Input value={content.basic_info.phone} onChange={e => updateBasicInfo('phone', e.target.value)} placeholder="手机号" style={inputStyle} />
              </Form.Item>
              <Form.Item label={<Text style={{ color: '#a1a1aa' }}>邮箱</Text>}>
                <Input value={content.basic_info.email} onChange={e => updateBasicInfo('email', e.target.value)} placeholder="邮箱" style={inputStyle} />
              </Form.Item>
              <Form.Item label={<Text style={{ color: '#a1a1aa' }}>所在城市</Text>}>
                <Input value={content.basic_info.location} onChange={e => updateBasicInfo('location', e.target.value)} placeholder="所在城市" style={inputStyle} />
              </Form.Item>
              <Form.Item label={<Text style={{ color: '#a1a1aa' }}>求职意向</Text>}>
                <Input value={content.basic_info.job_intention} onChange={e => updateBasicInfo('job_intention', e.target.value)} placeholder="求职意向" style={inputStyle} />
              </Form.Item>
            </div>
            <Form.Item label={<Text style={{ color: '#a1a1aa' }}>个人简介</Text>}>
              <TextArea
                value={content.basic_info.self_summary}
                onChange={e => updateBasicInfo('self_summary', e.target.value)}
                placeholder="简要介绍自己的优势和特点"
                rows={4}
                style={inputStyle}
              />
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'education',
      label: <span><BookOutlined /> 教育经历</span>,
      children: (
        <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
          {content.education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: 24, padding: 16, background: '#141428', borderRadius: 8, border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#a1a1aa' }}>教育经历 #{idx + 1}</Text>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem('education', idx)} />
              </div>
              <Form layout="vertical">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>学校</Text>}>
                    <Input value={edu.school} onChange={e => updateItem<Education>('education', idx, 'school', e.target.value)} placeholder="学校名称" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>学历</Text>}>
                    <Input value={edu.degree} onChange={e => updateItem<Education>('education', idx, 'degree', e.target.value)} placeholder="本科/硕士/博士" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>专业</Text>}>
                    <Input value={edu.major} onChange={e => updateItem<Education>('education', idx, 'major', e.target.value)} placeholder="专业名称" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>GPA</Text>}>
                    <Input value={edu.gpa} onChange={e => updateItem<Education>('education', idx, 'gpa', e.target.value)} placeholder="GPA" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>开始时间</Text>}>
                    <DatePicker
                      picker="month"
                      value={edu.start_date ? dayjs(edu.start_date) : null}
                      onChange={(_, ds) => updateItem<Education>('education', idx, 'start_date', ds as string)}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>结束时间</Text>}>
                    <DatePicker
                      picker="month"
                      value={edu.end_date ? dayjs(edu.end_date) : null}
                      onChange={(_, ds) => updateItem<Education>('education', idx, 'end_date', ds as string)}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Form.Item>
                </div>
                <Form.Item label={<Text style={{ color: '#a1a1aa' }}>描述</Text>}>
                  <TextArea value={edu.description} onChange={e => updateItem<Education>('education', idx, 'description', e.target.value)} placeholder="主修课程、荣誉等" rows={3} style={inputStyle} />
                </Form.Item>
              </Form>
            </div>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => addItem<Education>('education', { school: '', degree: '', major: '', start_date: '', end_date: '', gpa: '', description: '' })}
            style={{ borderColor: '#3f3f46', color: '#a1a1aa' }}
          >
            添加教育经历
          </Button>
        </Card>
      ),
    },
    {
      key: 'work',
      label: <span><BankOutlined /> 工作经历</span>,
      children: (
        <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
          {content.work_experience.map((work, idx) => (
            <div key={idx} style={{ marginBottom: 24, padding: 16, background: '#141428', borderRadius: 8, border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#a1a1aa' }}>工作经历 #{idx + 1}</Text>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem('work_experience', idx)} />
              </div>
              <Form layout="vertical">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>公司</Text>}>
                    <Input value={work.company} onChange={e => updateItem<WorkExperience>('work_experience', idx, 'company', e.target.value)} placeholder="公司名称" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>职位</Text>}>
                    <Input value={work.position} onChange={e => updateItem<WorkExperience>('work_experience', idx, 'position', e.target.value)} placeholder="职位名称" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>开始时间</Text>}>
                    <DatePicker
                      picker="month"
                      value={work.start_date ? dayjs(work.start_date) : null}
                      onChange={(_, ds) => updateItem<WorkExperience>('work_experience', idx, 'start_date', ds as string)}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>结束时间</Text>}>
                    <DatePicker
                      picker="month"
                      value={work.end_date ? dayjs(work.end_date) : null}
                      onChange={(_, ds) => updateItem<WorkExperience>('work_experience', idx, 'end_date', ds as string)}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Form.Item>
                </div>
                <Form.Item label={<Text style={{ color: '#a1a1aa' }}>工作描述</Text>}>
                  <TextArea value={work.description} onChange={e => updateItem<WorkExperience>('work_experience', idx, 'description', e.target.value)} placeholder="工作职责和成果" rows={4} style={inputStyle} />
                </Form.Item>
              </Form>
            </div>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => addItem<WorkExperience>('work_experience', { company: '', position: '', start_date: '', end_date: '', description: '' })}
            style={{ borderColor: '#3f3f46', color: '#a1a1aa' }}
          >
            添加工作经历
          </Button>
        </Card>
      ),
    },
    {
      key: 'project',
      label: <span><ProjectOutlined /> 项目经历</span>,
      children: (
        <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
          {content.project_experience.map((proj, idx) => (
            <div key={idx} style={{ marginBottom: 24, padding: 16, background: '#141428', borderRadius: 8, border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#a1a1aa' }}>项目经历 #{idx + 1}</Text>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem('project_experience', idx)} />
              </div>
              <Form layout="vertical">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>项目名称</Text>}>
                    <Input value={proj.name} onChange={e => updateItem<ProjectExperience>('project_experience', idx, 'name', e.target.value)} placeholder="项目名称" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>担任角色</Text>}>
                    <Input value={proj.role} onChange={e => updateItem<ProjectExperience>('project_experience', idx, 'role', e.target.value)} placeholder="角色" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>开始时间</Text>}>
                    <DatePicker
                      picker="month"
                      value={proj.start_date ? dayjs(proj.start_date) : null}
                      onChange={(_, ds) => updateItem<ProjectExperience>('project_experience', idx, 'start_date', ds as string)}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>结束时间</Text>}>
                    <DatePicker
                      picker="month"
                      value={proj.end_date ? dayjs(proj.end_date) : null}
                      onChange={(_, ds) => updateItem<ProjectExperience>('project_experience', idx, 'end_date', ds as string)}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Form.Item>
                </div>
                <Form.Item label={<Text style={{ color: '#a1a1aa' }}>技术栈</Text>}>
                  <Input value={proj.tech_stack} onChange={e => updateItem<ProjectExperience>('project_experience', idx, 'tech_stack', e.target.value)} placeholder="React, Node.js, Python..." style={inputStyle} />
                </Form.Item>
                <Form.Item label={<Text style={{ color: '#a1a1aa' }}>项目描述</Text>}>
                  <TextArea value={proj.description} onChange={e => updateItem<ProjectExperience>('project_experience', idx, 'description', e.target.value)} placeholder="项目内容和个人贡献" rows={4} style={inputStyle} />
                </Form.Item>
              </Form>
            </div>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => addItem<ProjectExperience>('project_experience', { name: '', role: '', start_date: '', end_date: '', description: '', tech_stack: '' })}
            style={{ borderColor: '#3f3f46', color: '#a1a1aa' }}
          >
            添加项目经历
          </Button>
        </Card>
      ),
    },
    {
      key: 'skills',
      label: <span><ToolOutlined /> 技能</span>,
      children: (
        <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
          {content.skills.map((skill, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Input
                value={skill.name}
                onChange={e => updateItem<Skill>('skills', idx, 'name', e.target.value)}
                placeholder="技能名称"
                style={{ ...inputStyle, flex: 1 }}
              />
              <Rate
                value={skill.level}
                onChange={v => updateItem<Skill>('skills', idx, 'level', v)}
                count={5}
              />
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem('skills', idx)} />
            </div>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => addItem<Skill>('skills', { name: '', level: 3 })}
            style={{ borderColor: '#3f3f46', color: '#a1a1aa' }}
          >
            添加技能
          </Button>
        </Card>
      ),
    },
    {
      key: 'awards',
      label: <span><TrophyOutlined /> 荣誉奖项</span>,
      children: (
        <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
          {content.awards.map((award, idx) => (
            <div key={idx} style={{ marginBottom: 24, padding: 16, background: '#141428', borderRadius: 8, border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#a1a1aa' }}>奖项 #{idx + 1}</Text>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem('awards', idx)} />
              </div>
              <Form layout="vertical">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>奖项名称</Text>}>
                    <Input value={award.name} onChange={e => updateItem<Award>('awards', idx, 'name', e.target.value)} placeholder="奖项名称" style={inputStyle} />
                  </Form.Item>
                  <Form.Item label={<Text style={{ color: '#a1a1aa' }}>获奖时间</Text>}>
                    <DatePicker
                      picker="month"
                      value={award.date ? dayjs(award.date) : null}
                      onChange={(_, ds) => updateItem<Award>('awards', idx, 'date', ds as string)}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </Form.Item>
                </div>
                <Form.Item label={<Text style={{ color: '#a1a1aa' }}>描述</Text>}>
                  <TextArea value={award.description} onChange={e => updateItem<Award>('awards', idx, 'description', e.target.value)} placeholder="奖项描述" rows={2} style={inputStyle} />
                </Form.Item>
              </Form>
            </div>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => addItem<Award>('awards', { name: '', date: '', description: '' })}
            style={{ borderColor: '#3f3f46', color: '#a1a1aa' }}
          >
            添加荣誉奖项
          </Button>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          {initialTitle ? '编辑简历' : '新建简历'}
        </Title>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          保存简历
        </Button>
      </div>
      <Tabs items={tabItems} type="card" />
    </div>
  )
}

export default ResumeEditor
