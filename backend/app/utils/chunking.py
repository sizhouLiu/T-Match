from typing import List
from app.models.job import Job
from app.models.campus import CampusRecruitment


def chunk_job(job: Job) -> List[str]:
    chunks = []
    header = f"{job.title} {job.company}"
    if job.location: header += f" {job.location}"
    if getattr(job, "industry", None): header += f" {job.industry}"
    if getattr(job, "salary_range", None): header += f" 薪资:{job.salary_range}"
    if getattr(job, "education", None): header += f" 学历:{job.education}"
    if getattr(job, "major", None): header += f" 专业:{job.major}"
    chunks.append(header.strip())
    if job.description and job.description.strip():
        chunks.extend(_split_text(f"岗位职责 {job.title}:\n{job.description}", max_len=400))
    if job.requirements and job.requirements.strip():
        chunks.extend(_split_text(f"任职要求 {job.title}:\n{job.requirements}", max_len=400))
    return chunks or [header.strip()]


def chunk_campus(job: CampusRecruitment) -> List[str]:
    chunks = []
    header = f"{job.title} {job.company}"
    if job.location: header += f" {job.location}"
    if job.industry: header += f" {job.industry}"
    if job.major: header += f" 专业:{job.major}"
    if job.education: header += f" 学历:{job.education}"
    if job.batch: header += f" {job.batch}"
    chunks.append(header.strip())
    if job.description and job.description.strip():
        chunks.extend(_split_text(f"岗位信息 {job.title}:\n{job.description}", max_len=400))
    if job.requirements and job.requirements.strip():
        chunks.extend(_split_text(f"招聘要求 {job.title}:\n{job.requirements}", max_len=400))
    return chunks or [header.strip()]


def chunk_resume(resume_data: dict) -> List[str]:
    chunks = []
    bi = resume_data.get("basic_info", {})
    header_parts = []
    if bi.get("name"): header_parts.append(bi["name"])
    if bi.get("job_intention"): header_parts.append(f"求职意向:{bi['job_intention']}")
    if bi.get("location"): header_parts.append(f"所在地:{bi['location']}")
    edu_list = resume_data.get("education", [])
    for edu in edu_list[:1]:
        if edu.get("school"): header_parts.append(edu["school"])
        if edu.get("major"): header_parts.append(f"{edu['major']}专业")
        if edu.get("degree"): header_parts.append(edu["degree"])
    if header_parts: chunks.append(" ".join(header_parts))
    if bi.get("self_summary"): chunks.append(f"个人简介: {bi['self_summary']}")
    for edu in edu_list:
        parts = [edu.get("school", ""), edu.get("degree", ""), edu.get("major", "")]
        if edu.get("gpa"): parts.append(f"GPA:{edu['gpa']}")
        if edu.get("description"): parts.append(edu["description"])
        text = " ".join(p for p in parts if p).strip()
        if text: chunks.append(f"教育经历: {text}")
    for exp in resume_data.get("work_experience", []):
        parts = [exp.get("company", ""), exp.get("position", "")]
        if exp.get("description"): parts.append(exp["description"])
        text = " ".join(p for p in parts if p).strip()
        if text: chunks.extend(_split_text(f"工作经历: {text}", max_len=400))
    for proj in resume_data.get("project_experience", []):
        parts = [proj.get("name", ""), proj.get("role", "")]
        if proj.get("tech_stack"): parts.append(f"技术栈:{proj['tech_stack']}")
        if proj.get("description"): parts.append(proj["description"])
        text = " ".join(p for p in parts if p).strip()
        if text: chunks.extend(_split_text(f"项目经历: {text}", max_len=400))
    skills = resume_data.get("skills", [])
    if skills:
        skill_names = [s["name"] if isinstance(s, dict) else s for s in skills]
        chunks.append(f"技能: {' '.join(skill_names)}")
    awards = resume_data.get("awards", [])
    if awards:
        award_texts = [a["name"] if isinstance(a, dict) else a for a in awards]
        chunks.append(f"荣誉奖项: {' '.join(award_texts)}")
    return [c for c in chunks if c.strip()] or ["简历"]


def _split_text(text: str, max_len: int = 400) -> List[str]:
    if len(text) <= max_len: return [text]
    chunks, buf = [], ""
    for sentence in text.replace("。", "。\n").replace("；", "；\n").replace("\n", "\n").split("\n"):
        sentence = sentence.strip()
        if not sentence: continue
        if len(buf) + len(sentence) + 1 > max_len and buf:
            chunks.append(buf.strip())
            buf = sentence
        else:
            buf = f"{buf} {sentence}" if buf else sentence
    if buf.strip(): chunks.append(buf.strip())
    return chunks or [text[:max_len]]
