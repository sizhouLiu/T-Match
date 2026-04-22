import httpx
from .config import external_settings

class TongyiLLM:
    def __init__(self):
        self.api_key = external_settings.TONGYI_API_KEY
        self.base_url = external_settings.TONGYI_BASE_URL
        self.model = external_settings.TONGYI_CHAT_MODEL

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

    def _parse_major(self, data: dict) -> str:
        major = data["choices"][0]["message"]["content"].strip()
        if major.endswith("专业"): major = major[:-2]
        return major

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

tongyi_llm = TongyiLLM()
