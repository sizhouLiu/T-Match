import { Outlet } from 'react-router-dom'
import { Layout, Menu, Button, Space } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { HomeOutlined, SearchOutlined, FileTextOutlined, SendOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../stores/authStore'

const { Header, Content, Footer } = Layout

const MainLayout = () => {
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuthStore()

  const navItems = [
    { key: '/', label: '首页', path: '/' },
    { key: '/jobs', label: '职位列表', path: '/jobs' },
    { key: '/campus', label: '校招信息', path: '/campus' },
    { key: '/resumes', label: '我的简历', path: '/resumes' },
    { key: '/applications', label: '投递记录', path: '/applications' },
    { key: '/match', label: 'AI匹配', path: '/match' },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        background: '#0a0a0a',
        borderBottom: '1px solid #1e1e22',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        padding: '0 24px',
        height: '56px',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
            T-Match
          </div>
        </Link>
        <nav style={{ display: 'flex', gap: '8px' }}>
          {navItems.map(item => (
            <Link
              key={item.key}
              to={item.path}
              style={{
                padding: '6px 12px',
                color: location.pathname === item.key ? '#fff' : '#a1a1aa',
                background: location.pathname === item.key ? '#1a1a1e' : 'transparent',
                borderRadius: '6px',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto' }}>
          {isAuthenticated() ? (
            <Space>
              <span style={{ color: '#e4e4e7', fontSize: '14px' }}>
                <UserOutlined style={{ marginRight: '4px' }} />
                {user?.username || user?.email}
              </span>
              <Button type="text" onClick={logout} style={{ color: '#3b82f6' }}>
                退出
              </Button>
            </Space>
          ) : (
            <Space>
              <Link to="/login">
                <Button type="default" ghost style={{ borderColor: '#27272a', color: '#e4e4e7' }}>
                  登录
                </Button>
              </Link>
              <Link to="/register">
                <Button type="primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>
                  注册
                </Button>
              </Link>
            </Space>
          )}
        </div>
      </Header>
      <Content style={{
        padding: '0',
        background: '#0a0a0a',
        minHeight: 'calc(100vh - 56px - 48px)',
      }}>
        <Outlet />
      </Content>
      <Footer style={{
        textAlign: 'center',
        background: '#0a0a0a',
        color: '#a1a1aa',
        padding: '16px 24px',
        borderTop: '1px solid #1e1e22',
      }}>
        <Space split={<span style={{ color: '#27272a' }}>|</span>}>
          <span>T-Match ©{new Date().getFullYear()}</span>
          <span>AI驱动的求职助手</span>
        </Space>
      </Footer>
    </Layout>
  )
}

export default MainLayout
