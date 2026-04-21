import { Card, Typography, Divider, Tag, Space, Rate } from 'antd'
import {
  UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  CalendarOutlined, StarOutlined,
} from '@ant-design/icons'
import type { ResumeContent } from './ResumeEditor'

const { Title, Text, Paragraph } = Typography

interface ResumePreviewProps {
  content: ResumeContent
}

const ResumePreview = ({ content }: ResumePreviewProps) => {
  const { basic_info, education, work_experience, project_experience, skills, awards } = content

  const sectionStyle = { marginBottom: 24 }
  const titleStyle = { color: '#3b82f6', fontSize: 18, marginBottom: 12 }
  const itemStyle = { marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #27272a' }

  return (
    <Card style={{ background: '#1a1a2e', border: '1px solid #27272a' }}>
      {/* 基本信息 */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>
          {basic_info.name || '未填写姓名'}
        </Title>
        <Space split={<Divider type="vertical" />} wrap>
          {basic_info.phone && (
            <Text style={{ color: '#a1a1aa' }}>
              <PhoneOutlined /> {basic_info.phone}
            </Text>
          )}
          {basic_info.email && (
            <Text style={{ color: '#a1a1aa' }}>
              <MailOutlined /> {basic_info.email}
            </Text>
          )}
          {basic_info.location && (
            <Text style={{ color: '#a1a1aa' }}>
              <EnvironmentOutlined /> {basic_info.location}
            </Text>
          )}
          {basic_info.gender && (
            <Text style={{ color: '#a1a1aa' }}>
              {basic_info.gender}
            </Text>
          )}
        </Space>
        {basic_info.job_intention && (
          <div style={{ marginTop: 12 }}>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              求职意向：{basic_info.job_intention}
            </Tag>
          </div>
        )}
      </div>

      {/* 个人简介 */}
      {basic_info.self_summary && (
        <div style={sectionStyle}>
          <Title level={4} style={titleStyle}>
            <UserOutlined /> 个人简介
          </Title>
          <Paragraph style={{ color: '#d4d4d8', whiteSpace: 'pre-wrap' }}>
            {basic_info.self_summary}
          </Paragraph>
        </div>
      )}

      {/* 教育经历 */}
      {education.length > 0 && (
        <div style={sectionStyle}>
          <Title level={4} style={titleStyle}>
            教育经历
          </Title>
          {education.map((edu, idx) => (
            <div key={idx} style={itemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ color: '#fff', fontSize: 16 }}>
                  {edu.school}
                </Text>
                <Text style={{ color: '#a1a1aa' }}>
                  <CalendarOutlined /> {edu.start_date} - {edu.end_date || '至今'}
                </Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <Tag color="blue">{edu.degree}</Tag>
                  <Tag color="green">{edu.major}</Tag>
                  {edu.gpa && <Tag color="orange">GPA: {edu.gpa}</Tag>}
                </Space>
              </div>
              {edu.description && (
                <Paragraph style={{ color: '#d4d4d8', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {edu.description}
                </Paragraph>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 工作经历 */}
      {work_experience.length > 0 && (
        <div style={sectionStyle}>
          <Title level={4} style={titleStyle}>
            工作经历
          </Title>
          {work_experience.map((work, idx) => (
            <div key={idx} style={itemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <Text strong style={{ color: '#fff', fontSize: 16 }}>
                    {work.company}
                  </Text>
                  <Text style={{ color: '#a1a1aa', marginLeft: 12 }}>
                    {work.position}
                  </Text>
                </div>
                <Text style={{ color: '#a1a1aa' }}>
                  <CalendarOutlined /> {work.start_date} - {work.end_date || '至今'}
                </Text>
              </div>
              {work.description && (
                <Paragraph style={{ color: '#d4d4d8', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {work.description}
                </Paragraph>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 项目经历 */}
      {project_experience.length > 0 && (
        <div style={sectionStyle}>
          <Title level={4} style={titleStyle}>
            项目经历
          </Title>
          {project_experience.map((proj, idx) => (
            <div key={idx} style={itemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <Text strong style={{ color: '#fff', fontSize: 16 }}>
                    {proj.name}
                  </Text>
                  <Text style={{ color: '#a1a1aa', marginLeft: 12 }}>
                    {proj.role}
                  </Text>
                </div>
                <Text style={{ color: '#a1a1aa' }}>
                  <CalendarOutlined /> {proj.start_date} - {proj.end_date || '至今'}
                </Text>
              </div>
              {proj.tech_stack && (
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#a1a1aa' }}>技术栈：</Text>
                  {proj.tech_stack.split(',').map((tech, i) => (
                    <Tag key={i} color="cyan" style={{ marginLeft: 4 }}>
                      {tech.trim()}
                    </Tag>
                  ))}
                </div>
              )}
              {proj.description && (
                <Paragraph style={{ color: '#d4d4d8', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {proj.description}
                </Paragraph>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 技能 */}
      {skills.length > 0 && (
        <div style={sectionStyle}>
          <Title level={4} style={titleStyle}>
            专业技能
          </Title>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {skills.map((skill, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#d4d4d8', flex: 1 }}>{skill.name}</Text>
                <Rate disabled value={skill.level} count={5} style={{ fontSize: 14 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 荣誉奖项 */}
      {awards.length > 0 && (
        <div style={sectionStyle}>
          <Title level={4} style={titleStyle}>
            <StarOutlined /> 荣誉奖项
          </Title>
          {awards.map((award, idx) => (
            <div key={idx} style={itemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ color: '#fff' }}>
                  {award.name}
                </Text>
                <Text style={{ color: '#a1a1aa' }}>
                  {award.date}
                </Text>
              </div>
              {award.description && (
                <Text style={{ color: '#d4d4d8' }}>{award.description}</Text>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default ResumePreview
