from app.schemas.user import UserBase, UserCreate, UserLogin, UserResponse, Token, TokenData
from app.schemas.job import JobBase, JobCreate, JobResponse, JobApplicationBase, JobApplicationCreate, JobApplicationResponse, JobApplicationUpdate
from app.schemas.resume import ResumeBase, ResumeCreate, ResumeUpdate, ResumeResponse
from app.schemas.campus import CampusRecruitmentBase, CampusRecruitmentCreate, CampusRecruitmentResponse

__all__ = [
    "UserBase", "UserCreate", "UserLogin", "UserResponse", "Token", "TokenData",
    "JobBase", "JobCreate", "JobResponse", "JobApplicationBase", "JobApplicationCreate", "JobApplicationResponse", "JobApplicationUpdate",
    "ResumeBase", "ResumeCreate", "ResumeUpdate", "ResumeResponse",
    "CampusRecruitmentBase", "CampusRecruitmentCreate", "CampusRecruitmentResponse",
]
