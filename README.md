# T-Match

T-Match 是一个 AI 驱动的全栈求职辅助平台。基于 FastAPI (异步)、React 18、Celery、PostgreSQL 和 Milvus 向量数据库构建。通过 AI 简历解析、自动职位爬取、双路召回（混合搜索）与精排模型，提供智能岗位匹配与管理服务。

## 🌟 核心特性

- **多渠道职位抓取**：内置社招（Jobs）和校招（Campus）API 和浏览器爬虫
- **自动触发爬虫**：用户上传简历后，系统自动通过 LLM (通义 qwen-turbo) 提取专业信息，触发该专业的定点岗位抓取
- **Milvus 双路召回检索**：
  - 稠密向量 (Dense)：使用阿里云百炼 `text-embedding-v3` 计算语义相似度
  - 稀疏向量 (Sparse)：使用 Milvus 内置的 `BM25` Function 自动分词生成关键字检索向量
- **两阶段重排 (Rerank)**：
  - 第一阶段：向量混合打分（WeightedRanker 融合 BM25 与 Dense 距离）
  - 第二阶段：调用阿里云 `gte-rerank` 接口对 Top N 结果做高精度交叉重排
- **全异步后端架构**：FastAPI + asyncpg 数据库连接，Celery 处理爬虫和 AI 耗时任务
- **浏览器扩展集成**：配套 Chrome 插件用于前端页面的快捷抓取和注入

## 📂 项目结构

```text
T-Match/
├── backend/                  # FastAPI 异步后端
│   ├── app/
│   │   ├── config.py         # 全局配置
│   │   ├── database.py       # PostgreSQL 连接 (async & sync)
│   │   ├── external/         # 第三方 AI 服务封装
│   │   │   ├── embedding.py  # 阿里云 Tongyi 稠密向量服务
│   │   │   ├── llm.py        # 简历专业信息提取 (qwen-turbo)
│   │   │   └── rerank.py     # 交叉重排服务 (gte-rerank)
│   │   ├── middleware/       # 自定义中间件 (JWT Auth等)
│   │   ├── models/           # SQLAlchemy 2.0 ORM 模型
│   │   ├── routers/          # FastAPI 路由模块
│   │   ├── schemas/          # Pydantic 数据验证模型
│   │   ├── services/         # 核心业务服务 (如 vector_service, ai_service)
│   │   ├── tasks/            # Celery 异步任务池
│   │   └── utils/            # 爬虫逻辑 (scraper_api, scraper_campus等)
│   ├── migrations/           # Alembic 数据库迁移目录
│   ├── alembic.ini           # Alembic 配置文件
│   └── pyproject.toml        # 项目依赖配置
│
├── frontend/                 # React + TypeScript 前端
│   ├── src/
│   │   ├── api/              # Axios 请求封装
│   │   ├── components/       # 公共 UI 组件
│   │   ├── pages/            # 路由页面 (Jobs, Campus, Match, Resumes 等)
│   │   ├── stores/           # Zustand 状态管理
│   │   └── types/            # TS 类型定义
│   └── package.json          # Node 依赖配置
│
├── extension/                # Chrome 浏览器扩展
│   ├── src/
│   │   ├── background/       # 后台 Service Worker
│   │   ├── content/          # 注入页面的 Content Script
│   │   └── popup/            # 点击图标弹出的 UI
│   └── manifest.json         # 扩展配置声明
│
├── docker-compose.yml        # 5 个核心服务：DB, Redis, Milvus, Backend, Celery
└── CLAUDE.md                 # 紧凑代码规范说明
```

## 🛠️ 快速启动

本项目所有服务（前端、后端、数据库、消息队列、向量库）均可通过 Docker Compose 一键拉起。

### 1. 环境准备
确保本机已安装 [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/)。

### 2. 配置环境变量
复制根目录的 `.env` 示例文件并填入真实的 API Key（主要是百炼平台的 Token）：
```bash
# Milvus 向量库
MILVUS_URI=http://milvus:19530
MILVUS_COLLECTION_NAME=job_vectors

# 阿里云百炼 API (必需，用于向量生成、重排、大模型分析)
TONGYI_API_KEY=sk-xxxxxx
TONGYI_EMBEDDING_MODEL=text-embedding-v3
TONGYI_CHAT_MODEL=qwen-turbo
TONGYI_RERANK_MODEL=gte-rerank
```

### 3. 启动服务
```bash
docker-compose up -d
```
Docker 将会拉起以下 5 个容器：
- `db`: PostgreSQL 数据库 (Port: 5432)
- `redis`: Celery 的 Broker 和 Backend (Port: 6379)
- `milvus`: Standalone 向量数据库 (Port: 19530, 9091)
- `backend`: FastAPI 服务 (Port: 8000)
- `celery_worker`: 执行异步爬虫与编码任务

### 4. 数据库初始化 (首次运行)
后端容器启动后，进入容器执行数据表迁移（如果 `create_all` 被移除的情况下）：
```bash
docker exec -it t-match-backend-1 /bin/bash
uv run alembic upgrade head
```

### 5. 访问服务
- 前端页面: http://localhost:3000
- 接口文档 (Swagger): http://localhost:8000/api/docs

## 💡 AI 岗位匹配流程原理解析

T-Match 最核心的亮点是基于简历内容的**智能定点爬取**和**高精度混合检索**流程：

1. **信息提取**：用户上传简历后，FastAPI 触发 Celery 任务，调用通义千问 API 提取用户的专业（如：`"计算机科学与技术"`）。
2. **定点爬虫**：使用提取出的专业名称作为参数，调用求职方舟的 API 进行岗位爬取，并将结果持久化到 PostgreSQL。
3. **混合编码入库**：对于新入库的岗位：
   - 后端调用阿里云 `text-embedding-v3` 生成稠密语义向量（Dense Vector）存入 Milvus。
   - Milvus 内置的 BM25 `Function` 会自动对文本进行中文分词并生成稀疏特征向量（Sparse Vector），构建倒排索引。
4. **查询与双路召回**：用户在前端点击"智能匹配"时，使用简历全文查询 Milvus：
   - 同时发起 HNSW 稠密召回和 BM25 稀疏召回。
   - 使用 `WeightedRanker` 以 `0.6 : 0.4` 的权重融合两路得分，截取 Top-50 的岗位。
5. **重排 (Rerank)**：这 50 个岗位再经由 `gte-rerank` 交叉编码模型进行细致重排，剔除低相关性结果，最后返回高精度的 Top-20。

## ✒️ 代码规范

请参考项目根目录下的 [CLAUDE.md](./CLAUDE.md)。本项目遵循「紧凑代码规范（Compact Code Style）」，不写废话注释，多用提前返回，使用单行条件语句，去除视觉噪音，要求代码自带极强的自描述性。
