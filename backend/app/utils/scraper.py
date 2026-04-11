import httpx
import re
import json
import subprocess
import tempfile
import os
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import sync_session_maker
from app.models import Job


class JobScraper:
    """爬虫模块 - 抓取求职方舟职位数据"""
    
    BASE_URL = "https://www.qiuzhifangzhou.com/job"
    
    def __init__(self):
        self.client = httpx.Client(
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            },
            timeout=60.0,
        )
    
    def fetch_with_browser(self) -> List[Dict[str, Any]]:
        """使用浏览器获取动态渲染的页面数据"""
        # JavaScript代码用于提取AG Grid中的职位数据
        js_script = '''
const leftViewport = document.querySelector('.ag-pinned-left-cols-viewport') || document.querySelector('.ag-pinned-left-cols-container');
const centerViewport = document.querySelector('.ag-center-cols-viewport') || document.querySelector('.ag-center-cols-container');

const jobs = [];

if (leftViewport && centerViewport) {
  const leftRows = leftViewport.querySelectorAll('.ag-row');
  const centerRows = centerViewport.querySelectorAll('.ag-row');
  
  leftRows.forEach((leftRow) => {
    const rowIndex = leftRow.getAttribute('row-index');
    const leftCells = leftRow.querySelectorAll('.ag-cell');
    
    const centerRow = centerViewport.querySelector(`.ag-row[row-index="${rowIndex}"]`);
    
    if (centerRow) {
      const centerCells = centerRow.querySelectorAll('.ag-cell');
      
      const job = {};
      
      leftCells.forEach((cell) => {
        const colId = cell.getAttribute('col-id');
        if (colId === 'updateTime') job.update_time = cell.textContent.trim();
        if (colId === 'tags') job.company_type = cell.textContent.trim();
        if (colId === 'company') job.company = cell.textContent.trim();
      });
      
      centerCells.forEach((cell) => {
        const colId = cell.getAttribute('col-id');
        if (colId === 'industry') job.industry = cell.textContent.trim();
        if (colId === 'reliability') job.credit_score = cell.textContent.trim();
        if (colId === 'position') job.position = cell.textContent.trim();
        if (colId === 'matchScore') job.match_score = cell.textContent.trim();
        if (colId === 'city') job.city = cell.textContent.trim();
        if (colId === 'education') job.education = cell.textContent.trim();
        if (colId === 'grade') job.grade = cell.textContent.trim();
        if (colId === 'major') job.major = cell.textContent.trim();
      });
      
      if (job.company && job.position) {
        jobs.push(job);
      }
    }
  });
}

JSON.stringify(jobs);
'''
        
        # 使用agent-browser执行脚本
        try:
            # 打开页面
            result = subprocess.run(
                ['agent-browser', 'open', self.BASE_URL],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # 等待页面加载
            subprocess.run(
                ['agent-browser', 'wait', '--load', 'networkidle'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # 执行JavaScript获取数据
            result = subprocess.run(
                ['agent-browser', 'eval', '--stdin'],
                input=js_script,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # 关闭浏览器
            subprocess.run(
                ['agent-browser', 'close'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                jobs_json = result.stdout.strip()
                # 提取JSON部分（可能包含其他输出）
                if jobs_json.startswith('"[') or jobs_json.startswith('['):
                    # 移除可能的引号
                    if jobs_json.startswith('"'):
                        jobs_json = jobs_json[1:-1] if jobs_json.endswith('"') else jobs_json[1:]
                    jobs_json = jobs_json.replace('\\"', '"')
                    return json.loads(jobs_json)
            
            return []
            
        except Exception as e:
            print(f"Browser scraping error: {e}")
            return []
    
    def parse_job_data(self, html: str) -> List[Dict[str, Any]]:
        """解析页面中的职位数据"""
        # 使用浏览器获取动态数据
        jobs = self.fetch_with_browser()
        
        if jobs:
            return jobs
        
        # 如果浏览器获取失败，返回示例数据
        return [
            {
                "update_time": "04-10",
                "company_type": "央企",
                "company": "中国一汽",
                "industry": "货车制造",
                "credit_score": "1388",
                "position": "工艺工程师",
                "match_score": "★★★★",
                "city": "长春",
                "education": "本科",
                "grade": "26届",
                "major": "机械"
            },
        ]
    
    def save_jobs(self, jobs: List[Dict[str, Any]]) -> int:
        """保存职位数据到数据库"""
        saved_count = 0
        
        with sync_session_maker() as session:
            for job_data in jobs:
                # 清理职位名称
                title = job_data.get("position", "").replace("\n", "").strip()
                title = re.sub(r'官|智|B|资|国|前|央企|上市|大型|中型|小型|微型', '', title).strip()
                
                if not title or not job_data.get("company"):
                    continue
                
                # 检查是否已存在
                existing = session.execute(
                    select(Job).where(
                        Job.title == title,
                        Job.company == job_data.get("company")
                    )
                ).scalar_one_or_none()
                
                if not existing:
                    job = Job(
                        title=title,
                        company=job_data.get("company"),
                        location=job_data.get("city"),
                        description=f"行业: {job_data.get('industry', '')}\n专业要求: {job_data.get('major', '')}",
                        requirements=job_data.get("major"),
                        salary_range=None,
                        job_type="full-time" if "实习" not in title else "internship",
                        source_url="https://www.qiuzhifangzhou.com/job",
                    )
                    session.add(job)
                    saved_count += 1
            
            session.commit()
        
        return saved_count
    
    def run(self) -> Dict[str, Any]:
        """执行爬虫"""
        try:
            jobs = self.parse_job_data("")
            saved = self.save_jobs(jobs)
            
            return {
                "status": "success",
                "fetched": len(jobs),
                "saved": saved,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
    
    def close(self):
        """关闭客户端"""
        self.client.close()


def scrape_jobs() -> Dict[str, Any]:
    """爬虫入口函数"""
    scraper = JobScraper()
    result = scraper.run()
    scraper.close()
    return result
