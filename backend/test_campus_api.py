"""
手动测试脚本：找到校招页面真实 API

使用方法：
1. 打开浏览器访问 https://www.qiuzhifangzhou.com/campus
2. 打开开发者工具 (F12) -> Network 标签页
3. 刷新页面，观察 XHR/Fetch 请求
4. 找到返回校招列表数据的请求（通常包含 company, positions, deadline 等字段）
5. 复制请求 URL 和响应 JSON，填入下面的测试代码

找到后，把以下信息告诉我：
- API URL
- 请求方法 (GET/POST)
- 请求参数/body
- 响应 JSON 中第一条数据的完整结构（特别是链接字段的 key 名）
"""

import httpx
import json

# 填入你找到的真实 API
API_URL = "https://api.qiuzhifangzhou.com/api/???"  # 替换成真实 URL
METHOD = "GET"  # 或 "POST"
PARAMS = {}  # GET 参数
BODY = {}    # POST body

client = httpx.Client(
    headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://www.qiuzhifangzhou.com/campus",
    },
    timeout=30.0
)

if METHOD == "GET":
    resp = client.get(API_URL, params=PARAMS)
else:
    resp = client.post(API_URL, json=BODY)

print(f"Status: {resp.status_code}")
data = resp.json()
print(json.dumps(data, ensure_ascii=False, indent=2))
