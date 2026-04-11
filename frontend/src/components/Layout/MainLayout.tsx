import { Outlet } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { HomeOutlined, SearchOutlined, FileTextOutlined, SendOutlined, LoginOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../stores/authStore'

const { Header, Content, Footer, Sider } = Layout

const MainLayout = () => {
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuthStore()

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
    { key: '/jobs', icon: <SearchOutlined />, label: <Link to="/jobs">职位列表</Link> },
    ...(isAuthenticated() ? [
      { key: '/resumes', icon: <FileTextOutlined />, label: <Link to="/resumes">我的简历</Link> },
      { key: '/applications', icon: <SendOutlined />, label: <Link to="/applications">投递记录</Link> },
    ] : []),
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        background: '#141414',
        borderBottom: '1px solid #303030',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        padding: '0 50px',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#1890ff',
            marginRight: '40px',
          }}>
            T-Match
          </div>
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ 
            flex: 1, 
            minWidth: 0,
            background: 'transparent',
            borderBottom: 'none',
          }}
          theme="dark"
        />
        <div style={{ marginLeft: 'auto' }}>
          {isAuthenticated() ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#fff' }}>{user?.username || user?.email}</span>
              <a onClick={logout} style={{ color: '#1890ff', cursor: 'pointer' }}>退出</a>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '16px' }}>
              <Link to="/login" style={{ color: '#fff' }}>
                <LoginOutlined /> 登录
              </Link>
              <Link to="/register" style={{ color: '#1890ff' }}>注册</Link>
            </div>
          )}
        </div>
      </Header>
      <Content style={{ padding: '24px 50px', background: '#0e0e10' }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center', background: '#0e0e10', color: '#666' }}>
        T-Match ©{new Date().getFullYear()} - AI驱动的求职助手
      </Footer>
    </Layout>
  )
}

export default MainLayout
