import { Typography, Row, Col, Card } from 'antd'
import { RocketOutlined, ThunderboltOutlined, FileSearchOutlined, TeamOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

const { Title, Paragraph } = Typography

const features = [
  {
    icon: <RocketOutlined style={{ fontSize: '40px', color: '#1890ff' }} />,
    title: 'AI简历优化',
    description: '智能分析简历，一键优化，提升面试机会',
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: '40px', color: '#52c41a' }} />,
    title: '自动投递',
    description: '自动填充网申表单，批量投递，节省时间',
  },
  {
    icon: <FileSearchOutlined style={{ fontSize: '40px', color: '#faad14' }} />,
    title: '职位汇总',
    description: '大厂校招信息一网打尽，实时更新',
  },
  {
    icon: <TeamOutlined style={{ fontSize: '40px', color: '#722ed1' }} />,
    title: '内推资源',
    description: '独家内推机会，直达HR',
  },
]

const Home = () => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <Title level={1} style={{ color: '#fff', marginBottom: '16px' }}>
          AI驱动的求职助手
        </Title>
        <Paragraph style={{ fontSize: '18px', color: '#999' }}>
          用AI赋能求职，让找工作更简单
        </Paragraph>
        <div style={{ marginTop: '32px' }}>
          <Link to="/register" style={{ 
            display: 'inline-block',
            padding: '12px 32px',
            background: '#1890ff',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '16px',
            marginRight: '16px',
          }}>
            立即开始
          </Link>
          <Link to="/jobs" style={{ 
            display: 'inline-block',
            padding: '12px 32px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid #303030',
            borderRadius: '6px',
            fontSize: '16px',
          }}>
            浏览职位
          </Link>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card 
              style={{ 
                background: '#1a1a1a', 
                border: '1px solid #303030',
                textAlign: 'center',
                height: '100%',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ marginBottom: '16px' }}>{feature.icon}</div>
              <Title level={4} style={{ color: '#fff', marginBottom: '8px' }}>
                {feature.title}
              </Title>
              <Paragraph style={{ color: '#999', margin: 0 }}>
                {feature.description}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default Home
