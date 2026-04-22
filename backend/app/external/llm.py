import httpx
from .config import external_settings

class TongyiLLM:
    """通义千问 LLM 服务，用于文本提取等任务"""

    def __init__(self):
        self.api_key = external_settings.TONGYI_API_KEY
        self.base_url = external_settings.TONGYI_BASE_URL
        self.model = external_settings.TONGYI_CHAT_MODEL

    async def extract_major(self, resume_text: str) -> str:
        """从简历原文中提取专业名称

        Args:
            resume_text: 简历原文

        Returns:
            专业名称，如 "计算机科学与技术"（不含"专业"二字）
        """
        if not self.api_key:
            raise ValueError("TONGYI_API_KEY is not set")

        if not resume_text or not resume_text.strip():
            return ""

        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": '你是一个简历解析助手。从用户提供的简历文本中提取专业名称。只返回专业名称本身，不要加"专业"二字，不要有任何其他解释。如果找不到专业信息，返回空字符串。'
                    },
                    {
                        "role": "user",
                        "content": f"请从以下简历中提取专业名称：\n\n{resume_text[:2000]}"
                    }
                ],
                "temperature": 0.1,
                "max_tokens": 50
            }

            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()

            data = response.json()
            major = data["choices"][0]["message"]["content"].strip()

            # 移除可能的"专业"后缀
            if major.endswith("专业"):
                major = major[:-2]

            return major

# Global instance
tongyi_llm = TongyiLLM()
