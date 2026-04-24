import httpx
import json
import re
from .config import external_settings

_RESUME_PARSE_SYSTEM = """你是一个简历解析助手。请分析提供的简历图片或文本，提取所有信息并以严格的 JSON 格式返回。

JSON 结构如下：
{
  "basic_info": {"name": "", "phone": "", "email": "", "gender": "", "birth_date": "", "location": "", "job_intention": "", "self_summary": ""},
  "education": [{"school": "", "degree": "", "major": "", "start_date": "", "end_date": "", "gpa": "", "description": ""}],
  "work_experience": [{"company": "", "position": "", "start_date": "", "end_date": "", "description": ""}],
  "project_experience": [{"name": "", "role": "", "start_date": "", "end_date": "", "description": "", "tech_stack": ""}],
  "skills": [{"name": "", "level": 3}],
  "awards": [{"name": "", "date": "", "description": ""}]
}

只返回 JSON，不要有任何其他文字。"""


class TongyiLLM:
    def __init__(self):
        self.api_key = external_settings.TONGYI_API_KEY
        self.base_url = external_settings.TONGYI_BASE_URL
        self.model = external_settings.TONGYI_CHAT_MODEL
        self.vl_model = external_settings.TONGYI_VL_MODEL

    def _headers(self) -> dict:
        if not self.api_key: raise ValueError("TONGYI_API_KEY is not set")
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def _build_payload(self, resume_text: str) -> dict:
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": '你是一个简历解析助手。从用户提供的简历文本中提取专业名称。只返回专业名称本身，不要加"专业"二字，不要有任何其他解释。如果找不到专业信息，返回空字符串。'},
                {"role": "user", "content": f"请从以下简历中提取专业名称：\n\n{resume_text[:2000]}"}
            ],
            "temperature": 0.1,
            "max_tokens": 50
        }

    def _build_vl_payload(self, images_b64: list[str]) -> dict:
        content = [
            {"type": "text", "text": "请分析这张简历图片，提取所有信息并以严格的 JSON 格式返回。"}
        ]
        for img in images_b64:
            content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img}"}})
        return {
            "model": self.vl_model,
            "messages": [
                {"role": "system", "content": _RESUME_PARSE_SYSTEM},
                {"role": "user", "content": content}
            ],
            "temperature": 0.1
        }

    def _build_text_payload(self, text: str) -> dict:
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": _RESUME_PARSE_SYSTEM},
                {"role": "user", "content": f"请分析以下简历文本，提取所有信息并以严格的 JSON 格式返回：\n\n{text[:8000]}"}
            ],
            "temperature": 0.1
        }

    def _parse_major(self, data: dict) -> str:
        major = data["choices"][0]["message"]["content"].strip()
        if major.endswith("专业"): major = major[:-2]
        return major

    def _parse_json_response(self, text: str) -> dict:
        text = text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)

    async def extract_major(self, resume_text: str) -> str:
        if not resume_text or not resume_text.strip(): return ""
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/chat/completions", headers=self._headers(), json=self._build_payload(resume_text), timeout=30.0)
            response.raise_for_status()
            return self._parse_major(response.json())

    def extract_major_sync(self, resume_text: str) -> str:
        if not resume_text or not resume_text.strip(): return ""
        with httpx.Client() as client:
            response = client.post(f"{self.base_url}/chat/completions", headers=self._headers(), json=self._build_payload(resume_text), timeout=30.0)
            response.raise_for_status()
            return self._parse_major(response.json())

    async def parse_resume_vl(self, images_b64: list[str]) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/chat/completions", headers=self._headers(), json=self._build_vl_payload(images_b64), timeout=120.0)
            response.raise_for_status()
            return self._parse_json_response(response.json()["choices"][0]["message"]["content"])

    async def parse_resume_text(self, text: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/chat/completions", headers=self._headers(), json=self._build_text_payload(text), timeout=60.0)
            response.raise_for_status()
            return self._parse_json_response(response.json()["choices"][0]["message"]["content"])


tongyi_llm = TongyiLLM()
