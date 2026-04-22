from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class CampusRecruitment(Base):
    __tablename__ = "campus_recruitments"

    id = Column(Integer, primary_key=True, index=True)
    recruitment_id = Column(String(100), unique=True, index=True)  # 求职方舟校招ID
    title = Column(String(255), nullable=False, index=True)  # 复用为 positions 字段
    company = Column(String(255), nullable=False, index=True)
    company_type = Column(String(100))
    industry = Column(String(255))
    location = Column(String(255))
    education = Column(String(50))
    grade = Column(String(50))
    major = Column(String(500))
    deadline = Column(String(50))
    source_type = Column(String(50))  # 官网/公众号
    detail_url = Column(String(500))
    credit_score = Column(String(20))
    update_date = Column(String(20))
    description = Column(Text)
    requirements = Column(Text)
    notice_url = Column(String(1000))  # 公告链接
    apply_url = Column(String(1000))   # 投递链接
    batch = Column(String(50))         # 批次：26春招/补录等
    referral_code = Column(String(100))  # 内推码

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
