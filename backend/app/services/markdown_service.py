import re


def resume_to_markdown(content: dict) -> str:
    bi = content.get("basic_info", {})
    lines = [f"# {bi.get('name', '').strip() or '未填写'}"]
    if intent := bi.get("job_intention", "").strip():
        lines.append(f"\n> 求职意向：{intent}")
    contact = " | ".join(filter(None, [
        f"**电话**: {bi['phone']}" if bi.get("phone") else "",
        f"**邮箱**: {bi['email']}" if bi.get("email") else "",
        f"**城市**: {bi['location']}" if bi.get("location") else "",
        f"**性别**: {bi['gender']}" if bi.get("gender") else "",
        f"**出生年月**: {bi['birth_date']}" if bi.get("birth_date") else "",
    ]))
    if contact: lines.append(f"\n{contact}")
    if summary := bi.get("self_summary", "").strip():
        lines += ["\n## 个人简介", "", summary]
    if edu_list := content.get("education", []):
        lines.append("\n## 教育经历")
        for e in edu_list:
            end = e.get("end_date") or "至今"
            header = f"### {e.get('school', '')} · {e.get('degree', '')} · {e.get('major', '')} ({e.get('start_date', '')} - {end})"
            lines.append(f"\n{header}")
            if e.get("gpa"): lines.append(f"- GPA: {e['gpa']}")
            if e.get("description"): lines.append(f"\n{e['description']}")
    if work_list := content.get("work_experience", []):
        lines.append("\n## 工作经历")
        for w in work_list:
            end = w.get("end_date") or "至今"
            lines.append(f"\n### {w.get('company', '')} · {w.get('position', '')} ({w.get('start_date', '')} - {end})")
            if w.get("description"): lines.append(f"\n{w['description']}")
    if proj_list := content.get("project_experience", []):
        lines.append("\n## 项目经历")
        for p in proj_list:
            end = p.get("end_date") or "至今"
            lines.append(f"\n### {p.get('name', '')} · {p.get('role', '')} ({p.get('start_date', '')} - {end})")
            if p.get("tech_stack"): lines.append(f"- **技术栈**: {p['tech_stack']}")
            if p.get("description"): lines.append(f"\n{p['description']}")
    if skill_list := content.get("skills", []):
        lines.append("\n## 专业技能")
        lines += [f"- {s.get('name', '')}: {s.get('level', 3)}" for s in skill_list if s.get("name")]
    if award_list := content.get("awards", []):
        lines.append("\n## 荣誉奖项")
        for a in award_list:
            date_str = f" ({a['date']})" if a.get("date") else ""
            lines.append(f"\n### {a.get('name', '')}{date_str}")
            if a.get("description"): lines.append(f"\n{a['description']}")
    return "\n".join(lines)


def markdown_to_resume(markdown: str) -> dict:
    if not markdown or not markdown.strip():
        return _empty_resume()
    result = _empty_resume()
    bi = result["basic_info"]
    sections = re.split(r'\n(?=## )', markdown)
    header_block = sections[0] if sections else ""
    if m := re.search(r'^#\s+(.+)$', header_block, re.MULTILINE):
        bi["name"] = m.group(1).strip()
    if m := re.search(r'^>\s*求职意向[：:]\s*(.+)$', header_block, re.MULTILINE):
        bi["job_intention"] = m.group(1).strip()
    if m := re.search(r'\*\*电话\*\*[：:]\s*([^\s|]+)', header_block):
        bi["phone"] = m.group(1).strip()
    if m := re.search(r'\*\*邮箱\*\*[：:]\s*([^\s|]+)', header_block):
        bi["email"] = m.group(1).strip()
    if m := re.search(r'\*\*城市\*\*[：:]\s*([^\s|]+)', header_block):
        bi["location"] = m.group(1).strip()
    if m := re.search(r'\*\*性别\*\*[：:]\s*([^\s|]+)', header_block):
        bi["gender"] = m.group(1).strip()
    if m := re.search(r'\*\*出生年月\*\*[：:]\s*([^\s|]+)', header_block):
        bi["birth_date"] = m.group(1).strip()
    for section in sections[1:]:
        heading_match = re.match(r'^##\s+(.+)$', section, re.MULTILINE)
        if not heading_match: continue
        heading = heading_match.group(1).strip()
        body = section[heading_match.end():].strip()
        if heading == "个人简介":
            bi["self_summary"] = body
        elif heading == "教育经历":
            result["education"] = _parse_edu(body)
        elif heading == "工作经历":
            result["work_experience"] = _parse_work(body)
        elif heading == "项目经历":
            result["project_experience"] = _parse_proj(body)
        elif heading == "专业技能":
            result["skills"] = _parse_skills(body)
        elif heading == "荣誉奖项":
            result["awards"] = _parse_awards(body)
    return result


def _empty_resume() -> dict:
    return {
        "basic_info": {"name": "", "phone": "", "email": "", "location": "", "birth_date": "", "gender": "", "job_intention": "", "self_summary": ""},
        "education": [], "work_experience": [], "project_experience": [], "skills": [], "awards": [],
    }


def _parse_dates(date_str: str) -> tuple[str, str]:
    m = re.match(r'\((.+?)\s*-\s*(.+?)\)$', date_str.strip())
    if not m: return ("", "")
    start, end = m.group(1).strip(), m.group(2).strip()
    return (start, "" if end == "至今" else end)


def _split_items(body: str) -> list[str]:
    return [s.strip() for s in re.split(r'\n(?=###\s)', body) if s.strip()]


def _parse_edu(body: str) -> list[dict]:
    items = []
    for item in _split_items(body):
        m = re.match(r'###\s+(.+?)\s+·\s+(.+?)\s+·\s+(.+?)\s+(\(.+?\))', item)
        if not m: continue
        start, end = _parse_dates(m.group(4))
        rest = item[m.end():].strip()
        gpa = ""
        if gm := re.search(r'GPA[：:]\s*([\d./]+)', rest):
            gpa = gm.group(1)
            rest = rest[:gm.start()].strip() + rest[gm.end():].strip()
        rest = re.sub(r'^-\s*\n?', '', rest, flags=re.MULTILINE).strip()
        items.append({"school": m.group(1).strip(), "degree": m.group(2).strip(), "major": m.group(3).strip(), "start_date": start, "end_date": end, "gpa": gpa, "description": rest})
    return items


def _parse_work(body: str) -> list[dict]:
    items = []
    for item in _split_items(body):
        m = re.match(r'###\s+(.+?)\s+·\s+(.+?)\s+(\(.+?\))', item)
        if not m: continue
        start, end = _parse_dates(m.group(3))
        desc = item[m.end():].strip()
        items.append({"company": m.group(1).strip(), "position": m.group(2).strip(), "start_date": start, "end_date": end, "description": desc})
    return items


def _parse_proj(body: str) -> list[dict]:
    items = []
    for item in _split_items(body):
        m = re.match(r'###\s+(.+?)\s+·\s+(.+?)\s+(\(.+?\))', item)
        if not m: continue
        start, end = _parse_dates(m.group(3))
        rest = item[m.end():].strip()
        tech = ""
        if tm := re.search(r'\*\*技术栈\*\*[：:]\s*(.+?)(?:\n|$)', rest):
            tech = tm.group(1).strip()
            rest = (rest[:tm.start()] + rest[tm.end():]).strip()
        rest = re.sub(r'^-\s*', '', rest, flags=re.MULTILINE).strip()
        items.append({"name": m.group(1).strip(), "role": m.group(2).strip(), "start_date": start, "end_date": end, "description": rest, "tech_stack": tech})
    return items


def _parse_skills(body: str) -> list[dict]:
    skills = []
    for line in body.splitlines():
        line = line.strip().lstrip("- ")
        if ":" not in line and "：" not in line: continue
        parts = re.split(r'[：:]', line, 1)
        if len(parts) != 2: continue
        name, level_str = parts[0].strip(), parts[1].strip()
        if not name: continue
        try: level = max(1, min(5, int(level_str)))
        except ValueError: level = 3
        skills.append({"name": name, "level": level})
    return skills


def _parse_awards(body: str) -> list[dict]:
    items = []
    for item in _split_items(body):
        m = re.match(r'###\s+(.+?)(?:\s+\((.+?)\))?$', item.splitlines()[0])
        if not m: continue
        desc = "\n".join(item.splitlines()[1:]).strip()
        items.append({"name": m.group(1).strip(), "date": m.group(2) or "", "description": desc})
    return items
