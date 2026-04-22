import httpx
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import select

from app.database import sync_session_maker
from app.models import CampusRecruitment
from app.config import settings

logger = logging.getLogger(__name__)

# 求职方舟 campus 页面的真实 API
# 数据字段: id, company, positions, locations, deadline, industry, batch,
#           urlType, noticeUrl, applyUrl, sourceUrl, typeTag, referralCode
CAMPUS_API_CANDIDATES = [
    "https://api.qiuzhifangzhou.com/api/campus/getDailyData",
    "https://api.qiuzhifangzhou.com/api/campus/getByDate",
    "https://api.qiuzhifangzhou.com/api/campus/daily",
    "https://api.qiuzhifangzhou.com/api/campusRecruitment/getByDate",
]

# 备用：通过 job API + keyword=校招 获取
JOB_API_URL = "https://api.qiuzhifangzhou.com/api/job/getDemoTable"


class CampusScraper:
    """爬虫模块 - 抓取求职方舟校招数据"""

    def __init__(self, token: str = ""):
        self.token = token or getattr(settings, "QZFZ_TOKEN", "")
        self.client = httpx.Client(
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Content-Type": "application/json",
                "Origin": "https://www.qiuzhifangzhou.com",
                "Referer": "https://www.qiuzhifangzhou.com/campus",
            },
            timeout=30.0,
        )
        if self.token:
            self.client.headers["Authorization"] = f"Bearer {self.token}"

    def _try_campus_api(self, date_str: str) -> List[Dict[str, Any]]:
        """尝试各种 campus API 端点"""
        for url in CAMPUS_API_CANDIDATES:
            for method in ["GET", "POST"]:
                try:
                    if method == "GET":
                        resp = self.client.get(url, params={"date": date_str})
                    else:
                        resp = self.client.post(url, json={"date": date_str})

                    if resp.status_code == 200:
                        data = resp.json()
                        # 可能返回 {md5, data: [...]} 或直接 [...]
                        if isinstance(data, list) and len(data) > 0:
                            logger.info(f"Campus API found: {method} {url}")
                            return data
                        if isinstance(data, dict):
                            items = data.get("data", [])
                            if items:
                                logger.info(f"Campus API found: {method} {url}")
                                return items
                except Exception:
                    continue
        return []

    def fetch_campus_real(self, days: int = 7) -> List[Dict[str, Any]]:
        """尝试通过真实 campus API 获取数据（需要 token）"""
        all_items = []
        today = datetime.now()

        for i in range(days):
            date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            items = self._try_campus_api(date_str)
            if items:
                for item in items:
                    all_items.append(self._parse_campus_item(item))

        return all_items

    def _parse_campus_item(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """解析真实 campus API 返回的数据"""
        type_tags = raw.get("typeTag", [])
        return {
            "recruitment_id": str(raw.get("id", "")),
            "title": raw.get("positions", ""),
            "company": raw.get("company", ""),
            "location": raw.get("locations", ""),
            "industry": raw.get("industry", ""),
            "company_type": ", ".join(type_tags) if isinstance(type_tags, list) else str(type_tags or ""),
            "deadline": raw.get("deadline", ""),
            "source_type": raw.get("urlType", ""),
            "detail_url": raw.get("sourceUrl", ""),
            "notice_url": raw.get("noticeUrl", ""),
            "apply_url": raw.get("applyUrl", ""),
            "batch": raw.get("batch", ""),
            "referral_code": raw.get("referralCode", ""),
            "update_date": raw.get("createTime", "").split("T")[0] if raw.get("createTime") else "",
        }

    def fetch_campus_fallback(
        self,
        demo_id: str = "banking",
        direction: str = "金融学专业",
        max_pages: int = 1,
    ) -> List[Dict[str, Any]]:
        """备用方案：通过 job API + keyword=校招"""
        all_items = []

        for current_page in range(1, 1 + max_pages):
            payload = {
                "demoId": demo_id,
                "keyword": "校招",
                "page": current_page,
                "pageSize": 50,
                "searchScope": "global",
                "userJobPreference": {
                    "directionId": "major",
                    "direction": direction,
                    "education": "可投",
                    "major": "推荐",
                    "city": "全国",
                    "matchDegree": "不限",
                    "company": "不限",
                    "source": "不限",
                },
            }

            try:
                response = self.client.post(JOB_API_URL, json=payload)
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                logger.error(f"校招API请求失败 page={current_page}: {e}")
                break

            positions = data.get("positions", [])
            if not positions:
                break

            for pos in positions:
                rid = pos.get("id", "")
                source_type = pos.get("sourceType", "")
                all_items.append({
                    "recruitment_id": rid,
                    "title": pos.get("title", ""),
                    "company": pos.get("company", ""),
                    "location": ", ".join(pos.get("location", [])) if isinstance(pos.get("location"), list) else str(pos.get("location", "")),
                    "industry": pos.get("industry", ""),
                    "education": pos.get("degree", ""),
                    "grade": ", ".join([str(g) + "届" for g in pos.get("graduation", [])]) if isinstance(pos.get("graduation"), list) else str(pos.get("graduation", "")),
                    "major": ", ".join(pos.get("major", [])) if isinstance(pos.get("major"), list) else str(pos.get("major", "")),
                    "credit_score": str(pos.get("qccScore", "")),
                    "company_type": ", ".join(pos.get("companyTag", [])) if isinstance(pos.get("companyTag"), list) else str(pos.get("companyTag", "")),
                    "update_date": pos.get("updateDate", "").split("T")[0] if pos.get("updateDate") else "",
                    "source_type": source_type,
                })

        return all_items

    def save_campus(self, items: List[Dict[str, Any]]) -> int:
        """保存校招数据到数据库"""
        saved_count = 0

        with sync_session_maker() as session:
            for item_data in items:
                if not item_data.get("company"):
                    continue

                recruitment_id = item_data.get("recruitment_id")

                existing = None
                if recruitment_id:
                    existing = session.execute(
                        select(CampusRecruitment).where(
                            CampusRecruitment.recruitment_id == str(recruitment_id)
                        )
                    ).scalar_one_or_none()

                if not existing and item_data.get("title") and item_data.get("company"):
                    existing = session.execute(
                        select(CampusRecruitment).where(
                            CampusRecruitment.title == item_data["title"],
                            CampusRecruitment.company == item_data["company"],
                        )
                    ).scalar_one_or_none()

                if existing:
                    for key, value in item_data.items():
                        if key != "recruitment_id":
                            setattr(existing, key, value)
                    saved_count += 1
                else:
                    record = CampusRecruitment(**item_data)
                    session.add(record)
                    saved_count += 1

            session.commit()

        return saved_count

    def run(
        self,
        demo_id: str = "banking",
        direction: str = "金融学专业",
        max_pages: int = 3,
    ) -> Dict[str, Any]:
        """执行爬虫：先尝试真实 campus API，失败则用 job API 备用"""
        try:
            # 先尝试真实 campus API
            items = self.fetch_campus_real(days=7)
            source = "campus_api"

            # 如果没拿到数据，用 job API 备用
            if not items:
                items = self.fetch_campus_fallback(demo_id, direction, max_pages)
                source = "job_api_fallback"

            saved = self.save_campus(items)

            return {
                "status": "success",
                "source": source,
                "fetched": len(items),
                "saved": saved,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"校招爬虫执行失败: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    def close(self):
        self.client.close()


def scrape_campus(
    demo_id: str = "banking",
    direction: str = "金融学专业",
    max_pages: int = 3,
) -> Dict[str, Any]:
    """校招爬虫入口函数"""
    scraper = CampusScraper()
    result = scraper.run(demo_id=demo_id, direction=direction, max_pages=max_pages)
    scraper.close()
    return result
