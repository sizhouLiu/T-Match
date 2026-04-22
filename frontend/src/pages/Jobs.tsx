import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Tag, Checkbox, Space, Dropdown, Modal, Typography, message } from 'antd'
import { DownOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import { jobsApi } from '../api'
import type { Job } from '../types'

const { Text } = Typography

// 筛选选项配置
const DIRECTION_OPTIONS = [
  { key: 'banking', label: '金融学专业' },
  { key: 'surveying', label: '测绘专业' },
  { key: 'cs', label: '计算机专业' },
  { key: 'all', label: '不限专业岗' },
]

const JOB_TYPE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'ygtq', label: '央国企' },
  { key: 'analyst', label: '金融分析师' },
  { key: 'advisor', label: '投资顾问' },
  { key: 'manager', label: '银行客户经理' },
]

const INDUSTRY_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: 'finance', label: '金融业行业' },
  { key: 'service', label: '商业服务行业' },
  { key: 'retail', label: '商贸零售行业' },
]

const GRADE_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: '26', label: '26届' },
  { key: '25', label: '25届' },
  { key: '24', label: '24届' },
]

const EDUCATION_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: 'bachelor_ok', label: '本科可投' },
  { key: 'bachelor_only', label: '只看本科' },
  { key: 'master', label: '硕士及以上' },
]

const MAJOR_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: 'recommend', label: '推荐' },
  { key: 'required', label: '明确要求' },
]

const CITY_OPTIONS = [
  { key: 'all', label: '全国' },
  { key: 'beijing', label: '北京' },
  { key: 'shanghai', label: '上海' },
  { key: 'shenzhen', label: '深圳' },
  { key: 'guangzhou', label: '广州' },
  { key: 'hangzhou', label: '杭州' },
  { key: 'chengdu', label: '成都' },
]

const MATCH_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: 'high', label: '高匹配' },
]

const SOURCE_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: 'ygtq', label: '央国企' },
  { key: 'bigtech', label: '大厂' },
  { key: 'highcredit', label: '高信用' },
  { key: 'hightech', label: '高科技' },
]

const Jobs = () => {
  // 筛选状态
  const [filters, setFilters] = useState({
    direction: 'banking',
    jobType: 'all',
    industry: 'all',
    grade: 'all',
    education: 'all',
    major: 'all',
    city: 'all',
    match: 'all',
    source: 'all',
  })

  // 选中行
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  
  // 详情弹窗
  const [detailModal, setDetailModal] = useState<{ visible: boolean; job: Job | null }>({
    visible: false,
    job: null,
  })

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsApi.list(),
  })

  // 筛选后的数据
  const filteredJobs = useMemo(() => {
    if (!jobs) return []
    return jobs.filter((job: Job) => {
      // 城市筛选
      if (filters.city !== 'all' && job.location) {
        const cityMap: Record<string, string[]> = {
          beijing: ['北京'],
          shanghai: ['上海'],
          shenzhen: ['深圳'],
          guangzhou: ['广州'],
          hangzhou: ['杭州'],
          chengdu: ['成都'],
        }
        const cities = cityMap[filters.city] || []
        if (!cities.some(c => job.location?.includes(c))) return false
      }
      
      // 届数筛选
      if (filters.grade !== 'all' && job.grade) {
        if (!job.grade.includes(filters.grade + '届')) return false
      }
      
      // 学历筛选
      if (filters.education !== 'all' && job.education) {
        if (filters.education === 'bachelor_only' && !job.education.includes('本科')) return false
        if (filters.education === 'master' && !job.education.includes('硕士') && !job.education.includes('博士')) return false
      }
      
      return true
    })
  }, [jobs, filters])

  // 创建下拉菜单
  const createFilterMenu = (
    options: Array<{ key: string; label: string }>,
    filterKey: keyof typeof filters
  ): MenuProps => ({
    items: options.map(opt => ({
      key: opt.key,
      label: opt.label,
      onClick: () => setFilters(prev => ({ ...prev, [filterKey]: opt.key })),
    })),
    selectedKeys: [filters[filterKey]],
  })

  // 获取筛选按钮显示文本
  const getFilterLabel = (
    options: Array<{ key: string; label: string }>,
    filterKey: keyof typeof filters
  ) => {
    const selected = options.find(opt => opt.key === filters[filterKey])
    return selected?.label || '不限'
  }

  // 表格列配置
  const columns: ColumnsType<Job> = [
    {
      title: '职位名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text: string, record: Job) => (
        <a 
          onClick={() => setDetailModal({ visible: true, job: record })}
          style={{ color: '#1890ff' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      width: 150,
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '学历',
      dataIndex: 'education',
      key: 'education',
      width: 80,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: '届数',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
      render: (text: string) => text || '-',
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
      width: 150,
      render: (text: string) => {
        if (!text) return '-'
        const majors = text.split(/[,、]\s*/).filter(Boolean)
        const show = majors.slice(0, 3)
        const rest = majors.length - show.length
        return (
          <div
            title={majors.join('、')}
            style={{
              display: 'flex',
              gap: 4,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              cursor: rest > 0 ? 'pointer' : 'default',
            }}
          >
            {show.map(m => <Tag key={m} style={{ flexShrink: 0 }}>{m}</Tag>)}
            {rest > 0 && <Tag style={{ flexShrink: 0, background: '#3f3f46', borderColor: '#52525b', color: '#a1a1aa' }}>+{rest}</Tag>}
          </div>
        )
      },
    },
    {
      title: '公司类型',
      dataIndex: 'company_type',
      key: 'company_type',
      width: 100,
      render: (text: string) => {
        if (!text) return '-'
        const types = text.split(', ')
        const colorMap: Record<string, string> = {
          '央企': 'gold',
          '国企': 'orange',
          '上市': 'green',
          '大型': 'blue',
          '中型': 'cyan',
        }
        return types.map(t => (
          <Tag key={t} color={colorMap[t] || 'default'}>{t}</Tag>
        ))
      },
    },
    {
      title: '信用分',
      dataIndex: 'credit_score',
      key: 'credit_score',
      width: 80,
      render: (text: string) => {
        if (!text) return '-'
        const score = parseInt(text)
        if (score >= 80) return <Tag color="green">{text}</Tag>
        if (score >= 60) return <Tag color="blue">{text}</Tag>
        return <Tag color="orange">{text}</Tag>
      },
    },
    {
      title: '匹配度',
      dataIndex: 'match_score',
      key: 'match_score',
      width: 80,
      render: (text: string) => {
        if (!text) return '-'
        const score = parseInt(text.replace('%', ''))
        if (score >= 80) return <Tag color="green">{text}</Tag>
        if (score >= 60) return <Tag color="blue">{text}</Tag>
        return <Tag>{text}</Tag>
      },
    },
    {
      title: '更新日期',
      dataIndex: 'update_date',
      key: 'update_date',
      width: 100,
      render: (text: string) => text || '-',
    },
  ]

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 40,
  }

  return (
    <div className="jobs-page">
      {/* 筛选区域 */}
      <div className="filter-section">
        {/* 专业方向 */}
        <div className="filter-row">
          <Text className="filter-label">专业方向：</Text>
          <Space>
            {DIRECTION_OPTIONS.filter(opt => opt.key !== 'all').map(opt => (
              <Button
                key={opt.key}
                type={filters.direction === opt.key ? 'primary' : 'default'}
                size="small"
                onClick={() => setFilters(prev => ({ ...prev, direction: opt.key }))}
              >
                {opt.label}
              </Button>
            ))}
            <Button
              type={filters.direction === 'all' ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilters(prev => ({ ...prev, direction: 'all' }))}
            >
              不限专业岗
            </Button>
          </Space>
        </div>

        {/* 职位类型 */}
        <div className="filter-row">
          <Text className="filter-label">职位类型：</Text>
          <Space>
            {JOB_TYPE_OPTIONS.map(opt => (
              <Button
                key={opt.key}
                type={filters.jobType === opt.key ? 'primary' : 'default'}
                size="small"
                onClick={() => setFilters(prev => ({ ...prev, jobType: opt.key }))}
              >
                {opt.label}
              </Button>
            ))}
          </Space>
        </div>

        {/* 行业 */}
        <div className="filter-row">
          <Text className="filter-label">行业：</Text>
          <Space>
            {INDUSTRY_OPTIONS.map(opt => (
              <Button
                key={opt.key}
                type={filters.industry === opt.key ? 'primary' : 'default'}
                size="small"
                onClick={() => setFilters(prev => ({ ...prev, industry: opt.key }))}
              >
                {opt.label}
              </Button>
            ))}
          </Space>
        </div>

        {/* 届数、学历、专业 */}
        <div className="filter-row">
          <Space size="large">
            <Space>
              <Text className="filter-label">届数：</Text>
              <Dropdown menu={createFilterMenu(GRADE_OPTIONS, 'grade')} trigger={['click']}>
                <Button size="small">
                  {getFilterLabel(GRADE_OPTIONS, 'grade')} <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
            <Space>
              <Text className="filter-label">学历：</Text>
              <Dropdown menu={createFilterMenu(EDUCATION_OPTIONS, 'education')} trigger={['click']}>
                <Button size="small">
                  {getFilterLabel(EDUCATION_OPTIONS, 'education')} <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
            <Space>
              <Text className="filter-label">专业：</Text>
              <Dropdown menu={createFilterMenu(MAJOR_OPTIONS, 'major')} trigger={['click']}>
                <Button size="small">
                  {getFilterLabel(MAJOR_OPTIONS, 'major')} <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </Space>
        </div>

        {/* 城市、匹配度、来源 */}
        <div className="filter-row">
          <Space size="large">
            <Space>
              <Text className="filter-label">城市：</Text>
              {CITY_OPTIONS.slice(0, 5).map(opt => (
                <Button
                  key={opt.key}
                  type={filters.city === opt.key ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setFilters(prev => ({ ...prev, city: opt.key }))}
                >
                  {opt.label}
                </Button>
              ))}
              <Dropdown menu={createFilterMenu(CITY_OPTIONS.slice(5), 'city')} trigger={['click']}>
                <Button size="small">
                  更多 <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
            <Space>
              <Text className="filter-label">匹配度：</Text>
              <Dropdown menu={createFilterMenu(MATCH_OPTIONS, 'match')} trigger={['click']}>
                <Button size="small">
                  {getFilterLabel(MATCH_OPTIONS, 'match')} <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
            <Space>
              <Text className="filter-label">来源：</Text>
              {SOURCE_OPTIONS.map(opt => (
                <Button
                  key={opt.key}
                  type={filters.source === opt.key ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setFilters(prev => ({ ...prev, source: opt.key }))}
                >
                  {opt.label}
                </Button>
              ))}
            </Space>
          </Space>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="action-bar">
        <Space>
          <Checkbox
            checked={selectedRowKeys.length === filteredJobs.length && filteredJobs.length > 0}
            indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredJobs.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowKeys(filteredJobs.map(j => j.id))
              } else {
                setSelectedRowKeys([])
              }
            }}
          >
            全选 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
          </Checkbox>
          <Button 
            icon={<ReloadOutlined />} 
            size="small"
            onClick={() => refetch()}
          >
            刷新数据
          </Button>
          <Button icon={<SettingOutlined />} size="small">
            设置
          </Button>
        </Space>
      </div>

      {/* 职位表格 */}
      <div className="jobs-table-wrapper">
        <Table
          columns={columns}
          dataSource={filteredJobs}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="small"
          scroll={{ x: 1200 }}
        />
      </div>

      {/* 详情弹窗 */}
      <Modal
        title={detailModal.job?.title}
        open={detailModal.visible}
        onCancel={() => setDetailModal({ visible: false, job: null })}
        footer={null}
        width={600}
      >
        {detailModal.job && (
          <div className="job-detail">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>公司：</Text>
                <Text>{detailModal.job.company}</Text>
              </div>
              <div>
                <Text strong>地点：</Text>
                <Text>{detailModal.job.location || '-'}</Text>
              </div>
              <div>
                <Text strong>学历要求：</Text>
                <Text>{detailModal.job.education || '-'}</Text>
              </div>
              <div>
                <Text strong>届数要求：</Text>
                <Text>{detailModal.job.grade || '-'}</Text>
              </div>
              <div>
                <Text strong>专业要求：</Text>
                <Text>{detailModal.job.major || '-'}</Text>
              </div>
              <div>
                <Text strong>公司类型：</Text>
                <Text>{detailModal.job.company_type || '-'}</Text>
              </div>
              <div>
                <Text strong>行业：</Text>
                <Text>{detailModal.job.industry || '-'}</Text>
              </div>
              <div>
                <Text strong>信用分：</Text>
                <Text>{detailModal.job.credit_score || '-'}</Text>
              </div>
              <div>
                <Text strong>匹配度：</Text>
                <Text>{detailModal.job.match_score || '-'}</Text>
              </div>
              <div>
                <Text strong>职位描述：</Text>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  background: '#1a1a1a', 
                  padding: '12px',
                  borderRadius: '4px',
                  marginTop: '8px'
                }}>
                  {detailModal.job.description || '暂无描述'}
                </div>
              </div>
              {detailModal.job.detail_url && (
                <div>
                  <a href={detailModal.job.detail_url} target="_blank" rel="noopener noreferrer">
                    查看原始链接
                  </a>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Jobs
