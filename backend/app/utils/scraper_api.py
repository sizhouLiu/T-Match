import httpx
import json
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy import select

from app.database import sync_session_maker
from app.models import Job


class JobScraper:
    """爬虫模块 - 通过API抓取求职方舟职位数据"""
    
    API_URL = "https://api.qiuzhifangzhou.com/api/job/getDemoTable"
    DETAIL_URL = "https://api.qiuzhifangzhou.com/api/job/getPosition"
    
    def __init__(self):
        self.client = httpx.Client(
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Content-Type": "application/json",
                "Origin": "https://www.qiuzhifangzhou.com",
                "Referer": "https://www.qiuzhifangzhou.com/job",
            },
            timeout=30.0,
        )
    
    def fetch_position_detail(self, position_id: str) -> Dict[str, Any]:
        """获取职位详情
        
        Args:
            position_id: 职位ID
        """
        payload = {"positionId": position_id}
        
        response = self.client.post(self.DETAIL_URL, json=payload)
        response.raise_for_status()
        
        data = response.json()
        return data
    
    def fetch_jobs_api(
        self,
        demo_id: str = "banking",
        direction: str = "金融学专业",
        page: int = 1,
        page_size: int = 50,
        max_pages: int = 1,
    ) -> List[Dict[str, Any]]:
        """通过API获取职位数据
        
        Args:
            demo_id: 方向ID，如 "banking", "surveying" 等
            direction: 方向名称，如 "金融学专业", "测绘专业" 等
            page: 起始页码
            page_size: 每页数量
            max_pages: 最大爬取页数
        """
        all_jobs = []
        
        for current_page in range(page, page + max_pages):
            payload = {
                "demoId": demo_id,
                "keyword": None,
                "page": current_page,
                "pageSize": page_size,
                "searchScope": "global",
                "userJobPreference": {
                    "directionId": "major",
                    "direction": direction,
                    "education": "可投",
                    "major": "推荐",
                    "city": "全国",
                    "matchDegree": "不限",
                    "company": "不限",
                    "source": "不限"
                }
            }
            
            response = self.client.post(self.API_URL, json=payload)
            response.raise_for_status()
            
            data = response.json()
            positions = data.get("positions", [])
            
            if not positions:
                break
            
            for pos in positions:
                position_id = pos.get("id", "")
                job = {
                    "position_id": position_id,
                    "title": pos.get("title", ""),
                    "company": pos.get("company", ""),
                    "location": ", ".join(pos.get("location", [])),
                    "industry": pos.get("industry", ""),
                    "education": pos.get("degree", ""),
                    "grade": ", ".join([str(g) + "届" for g in pos.get("graduation", [])]),
                    "major": ", ".join(pos.get("major", [])),
                    "credit_score": str(pos.get("qccScore", "")),
                    "match_score": str(pos.get("matchDegree", "")) + "%",
                    "company_type": ", ".join(pos.get("companyTag", [])),
                    "update_date": pos.get("updateDate", "").split("T")[0].replace("-", ""),
                    "source_url": "https://www.qiuzhifangzhou.com/job",
                    "job_type": "full-time",
                    "description": f"来源: {pos.get('sourceType', '')}\n匹配标签: {', '.join(pos.get('matchTag', []))}",
                }
                all_jobs.append(job)
        
        return all_jobs
    
    def save_jobs(self, jobs: List[Dict[str, Any]]) -> int:
        """保存职位数据到数据库"""
        saved_count = 0
        
        with sync_session_maker() as session:
            for job_data in jobs:
                if not job_data.get("title") or not job_data.get("company"):
                    continue
                
                position_id = job_data.get("position_id")
                
                # 优先使用 position_id 去重
                if position_id:
                    existing = session.execute(
                        select(Job).where(Job.position_id == position_id)
                    ).scalar_one_or_none()
                else:
                    existing = session.execute(
                        select(Job).where(
                            Job.title == job_data["title"],
                            Job.company == job_data["company"]
                        )
                    ).scalar_one_or_none()
                
                if not existing:
                    # 获取职位详情
                    if position_id:
                        try:
                            detail = self.fetch_position_detail(position_id)
                            job_data = self._merge_detail(job_data, detail)
                        except Exception:
                            pass
                    
                    job = Job(**job_data)
                    session.add(job)
                    saved_count += 1
            
            session.commit()
        
        return saved_count
    
    def _merge_detail(self, job: Dict[str, Any], detail: Dict[str, Any]) -> Dict[str, Any]:
        """合并职位详情数据"""
        position_data = detail.get("position", {})
        
        # 更新描述和详情URL
        if position_data.get("description"):
            job["description"] = position_data.get("description", "")
        if position_data.get("requirements"):
            job["requirements"] = position_data.get("requirements", "")
        if position_data.get("salary"):
            job["salary_range"] = position_data.get("salary", "")
        if position_data.get("url"):
            job["detail_url"] = position_data.get("url", "")
        
        return job
    
    def run(
        self,
        demo_id: str = "banking",
        direction: str = "金融学专业",
        max_pages: int = 1,
    ) -> Dict[str, Any]:
        """执行爬虫
        
        Args:
            demo_id: 方向ID
            direction: 方向名称
            max_pages: 最大爬取页数
        """
        try:
            jobs = self.fetch_jobs_api(
                demo_id=demo_id,
                direction=direction,
                max_pages=max_pages,
            )
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
        self.client.close()


def scrape_jobs(
    demo_id: str = "banking",
    direction: str = "金融学专业",
    max_pages: int = 1,
) -> Dict[str, Any]:
    scraper = JobScraper()
    result = scraper.run(
        demo_id=demo_id,
        direction=direction,
        max_pages=max_pages,
    )
    scraper.close()
    return result
