import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Typography, message, Card } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'

const { Title, Paragraph } = Typography

interface RegisterForm {
  email: string
  password: string
  username?: string
}

const Register = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      message.success('注册成功，请登录')
      navigate('/login')
    },
    onError: () => {
      message.error('注册失败，邮箱可能已被使用')
    },
  })

  const onFinish = (values: RegisterForm) => {
    registerMutation.mutate(values)
  }

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '60px auto',
      padding: '20px',
    }}>
      <Card style={{ background: '#1a1a1a', border: '1px solid #303030' }}>
        <Title level={2} style={{ color: '#fff', textAlign: 'center', marginBottom: '32px' }}>
          注册
        </Title>
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名（可选）" 
              style={{ background: '#0e0e10', border: '1px solid #303030', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="邮箱" 
              style={{ background: '#0e0e10', border: '1px solid #303030', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="密码" 
              style={{ background: '#0e0e10', border: '1px solid #303030', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="确认密码" 
              style={{ background: '#0e0e10', border: '1px solid #303030', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={registerMutation.isPending}
            >
              注册
            </Button>
          </Form.Item>
        </Form>
        <Paragraph style={{ textAlign: 'center', color: '#999' }}>
          已有账号？ <Link to="/login" style={{ color: '#1890ff' }}>立即登录</Link>
        </Paragraph>
      </Card>
    </div>
  )
}

export default Register
