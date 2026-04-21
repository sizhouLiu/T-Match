import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Typography, message, Card } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuthStore } from '../stores/authStore'

const { Title, Paragraph } = Typography

interface LoginForm {
  email: string
  password: string
}

const Login = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [form] = Form.useForm()

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      localStorage.setItem('token', data.access_token)
      message.success('登录成功')
      // Fetch user info
      authApi.getCurrentUser().then((user) => {
        setAuth(user, data.access_token)
        navigate('/')
      })
    },
    onError: () => {
      message.error('登录失败，请检查邮箱和密码')
    },
  })

  const onFinish = (values: LoginForm) => {
    loginMutation.mutate(values)
  }

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '60px auto',
      padding: '20px',
    }}>
      <Card style={{ background: '#111113', border: '1px solid #1e1e22' }}>
        <Title level={2} style={{ color: '#fff', textAlign: 'center', marginBottom: '32px' }}>
          登录
        </Title>
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="邮箱"
              style={{ background: '#0a0a0a', border: '1px solid #1e1e22', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              style={{ background: '#0a0a0a', border: '1px solid #1e1e22', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        <Paragraph style={{ textAlign: 'center', color: '#a1a1aa' }}>
          还没有账号？ <Link to="/register" style={{ color: '#3b82f6' }}>立即注册</Link>
        </Paragraph>
      </Card>
    </div>
  )
}

export default Login
