from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    # 基本信息
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False, index=True)
    location = Column(String(255))
    
    # 详细信息
    description = Column(Text)
    requirements = Column(Text)
    salary_range = Column(String(100))
    job_type = Column(String(50))  # full-time, part-time, internship
    source_url = Column(String(500))
    
    # 求职方舟特有字段
    update_date = Column(String(20))  # 更新日期 如 "04-10"
    company_type = Column(String(50))  # 公司类型: 央企/国企/上市/大型/中型/小型/微型
    industry = Column(String(255))  # 行业
    credit_score = Column(String(20))  # 公司信用分
    match_score = Column(String(20))  # 匹配度: ★★★★★
    education = Column(String(50))  # 学历要求
    grade = Column(String(50))  # 届数: 26届
    major = Column(Text)  # 专业要求
    detail_url = Column(String(500))  # 职位详情链接
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING)
    notes = Column(Text)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    # user = relationship("User", back_populates="applications")
    # job = relationship("Job", back_populates="applications")
