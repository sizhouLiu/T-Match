import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Tag, Space, Dropdown, Modal, Typography, message, Card } from 'antd'
import { DownOutlined, ReloadOutlined, RobotOutlined, LinkOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import { campusApi } from '../api'
import type { CampusRecruitment } from '../types'

const { Title, Text } = Typography

// 筛选选项配置
const GRADE_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: '26', label: '26届' },
  { key: '25', label: '25届' },
  { key: '24', label: '24届' },
]

const EDUCATION_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: 'bachelor', label: '本科' },
  { key: 'master', label: '硕士' },
  { key: 'doctor', label: '博士' },
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

const SOURCE_OPTIONS = [
  { key: 'all', label: '不限' },
  { key: 'official', label: '官网' },
  { key: 'wechat', label: '公众号' },
]

const Campus = () => {
  const [filters, setFilters] = useState({
    grade: 'all',
    education: 'all',
    city: 'all',
    source: 'all',
  })

  const [detailModal, setDetailModal] = useState<{ visible: boolean; item: CampusRecruitment | null }>({
    visible: false,
    item: null,
  })

  const { data: campusData, isLoading, refetch } = useQuery({
    queryKey: ['campus'],
    queryFn: () => campusApi.list(0, 200),
  })

  const filteredData = useMemo(() => {
    if (!campusData) return []
    return campusData.filter((item: CampusRecruitment) => {
      if (filters.city !== 'all' && item.location) {
        const cityMap: Record<string, string[]> = {
          beijing: ['北京'],
          shanghai: ['上海'],
          shenzhen: ['深圳'],
          guangzhou: ['广州'],
          hangzhou: ['杭州'],
          chengdu: ['成都'],
        }
        const cities = cityMap[filters.city] || []
        if (!cities.some(c => item.location?.includes(c))) return false
      }

      if (filters.grade !== 'all' && item.grade) {
        if (!item.grade.includes(filters.grade + '届')) return false
      }

      if (filters.education !== 'all' && item.education) {
        const eduMap: Record<string, string> = {
          bachelor: '本科',
          master: '硕士',
          doctor: '博士',
        }
        if (!item.education.includes(eduMap[filters.education])) return false
      }

      if (filters.source !== 'all' && item.source_type) {
        const sourceMap: Record<string, string> = {
          official: '官网',
          wechat: '公众号',
        }
        if (!item.source_type.includes(sourceMap[filters.source])) return false
      }

      return true
    })
  }, [campusData, filters])

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

  const getFilterLabel = (
    options: Array<{ key: string; label: string }>,
    filterKey: keyof typeof filters
  ) => {
    const selected = options.find(opt => opt.key === filters[filterKey])
    return selected?.label || '不限'
  }

  const columns: ColumnsType<CampusRecruitment> = [
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      width: 180,
      render: (text: string) => text,
    },
    {
      title: '职位',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text: string, record: CampusRecruitment) => (
        <a
          onClick={() => setDetailModal({ visible: true, item: record })}
          style={{ color: '#3b82f6' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '学历',
      dataIndex: 'education',
      key: 'education',
      width: 100,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: '届数',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
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
      width: 120,
      render: (text: string) => {
        if (!text) return '-'
        const types = text.split(', ')
        const colorMap: Record<string, string> = {
          '央企': 'gold',
          '国企': 'orange',
          '上市': 'green',
          '大型': 'blue',
        }
        return types.slice(0, 2).map(t => (
          <Tag key={t} color={colorMap[t] || 'default'}>{t}</Tag>
        ))
      },
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '来源',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 100,
      render: (text: string) => text ? <Tag color="cyan">{text}</Tag> : '-',
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '更新日期',
      dataIndex: 'update_date',
      key: 'update_date',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: CampusRecruitment) => (
        <Space size="small">
          {record.notice_url && (
            <a
              href={record.notice_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3b82f6' }}
            >
              公告
            </a>
          )}
          {record.apply_url && (
            <a
              href={record.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#52c41a' }}
            >
              投递
            </a>
          )}
          {!record.notice_url && !record.apply_url && record.detail_url && (
            <a
              href={record.detail_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3b82f6' }}
            >
              详情
            </a>
          )}
          {!record.notice_url && !record.apply_url && !record.detail_url && (
            <span style={{ color: '#52525b' }}>-</span>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="jobs-page">
      {/* 筛选区域 */}
      <div className="filter-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>校招信息</Title>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={async () => {
              message.loading('正在同步校招数据...', 0)
              try {
                await campusApi.runScraper('banking', '金融学专业', 2)
                message.destroy()
                message.success('同步成功')
                refetch()
              } catch {
                message.destroy()
                message.error('同步失败')
              }
            }}
          >
            同步数据
          </Button>
        </div>

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
              <Text className="filter-label">来源：</Text>
              <Dropdown menu={createFilterMenu(SOURCE_OPTIONS, 'source')} trigger={['click']}>
                <Button size="small">
                  {getFilterLabel(SOURCE_OPTIONS, 'source')} <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </Space>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="action-bar">
        <Space>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => refetch()}
          >
            刷新数据
          </Button>
          <Text style={{ color: '#71717a' }}>共 {filteredData.length} 条校招信息</Text>
        </Space>
      </div>

      {/* 表格 */}
      <div className="jobs-table-wrapper">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="small"
          scroll={{ x: 1600 }}
        />
      </div>

      {/* 详情弹窗 */}
      <Modal
        title={detailModal.item?.title}
        open={detailModal.visible}
        onCancel={() => setDetailModal({ visible: false, item: null })}
        footer={null}
        width={700}
      >
        {detailModal.item && (
          <div className="job-detail">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Card size="small" style={{ background: '#141428', border: '1px solid #27272a' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>公司：</Text>
                    <Text style={{ color: '#fff' }}>{detailModal.item.company}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>地点：</Text>
                    <Text>{detailModal.item.location || '-'}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>学历要求：</Text>
                    <Text>{detailModal.item.education || '-'}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>届数要求：</Text>
                    <Text>{detailModal.item.grade || '-'}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>专业要求：</Text>
                    <Text>{detailModal.item.major || '-'}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>公司类型：</Text>
                    <Text>{detailModal.item.company_type || '-'}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>行业：</Text>
                    <Text>{detailModal.item.industry || '-'}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>来源：</Text>
                    <Text>{detailModal.item.source_type || '-'}</Text>
                  </div>
                  <div>
                    <Text strong style={{ color: '#a1a1aa' }}>截止日期：</Text>
                    <Text style={{ color: detailModal.item.deadline ? '#faad14' : '#71717a' }}>
                      {detailModal.item.deadline || '未知'}
                    </Text>
                  </div>
                </Space>
              </Card>

              {detailModal.item.description && (
                <div>
                  <Text strong style={{ color: '#a1a1aa' }}>描述：</Text>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      background: '#141428',
                      padding: '12px',
                      borderRadius: '4px',
                      marginTop: '8px',
                      color: '#d4d4d8',
                    }}
                  >
                    {detailModal.item.description}
                  </div>
                </div>
              )}

              {detailModal.item.requirements && (
                <div>
                  <Text strong style={{ color: '#a1a1aa' }}>要求：</Text>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      background: '#141428',
                      padding: '12px',
                      borderRadius: '4px',
                      marginTop: '8px',
                      color: '#d4d4d8',
                    }}
                  >
                    {detailModal.item.requirements}
                  </div>
                </div>
              )}

              {detailModal.item.notice_url && (
                <div>
                  <Button
                    type="default"
                    icon={<LinkOutlined />}
                    href={detailModal.item.notice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginRight: 16 }}
                  >
                    查看招聘公告
                  </Button>
                </div>
              )}

              {detailModal.item.apply_url && (
                <div>
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    href={detailModal.item.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    去投递
                  </Button>
                </div>
              )}

              {!detailModal.item.notice_url && !detailModal.item.apply_url && detailModal.item.detail_url && (
                <div>
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    href={detailModal.item.detail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    查看原始链接
                  </Button>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Campus
