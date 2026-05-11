from app.external.llm import tongyi_llm
from app.external.config import external_settings
import httpx

_EDIT_SYSTEM = "你是一位专业的简历编辑助手。根据用户指令修改Markdown格式的简历。只返回修改后的完整Markdown文本，不要有任何解释或代码块标记。"

_EDIT_PROMPT = """编辑指令：{instruction}

当前简历：
{markdown}"""


async def edit_resume_markdown(markdown: str, instruction: str) -> str:
    if not external_settings.TONGYI_API_KEY: raise ValueError("TONGYI_API_KEY is not set")
    payload = {
        "model": external_settings.TONGYI_CHAT_MODEL,
        "messages": [
            {"role": "system", "content": _EDIT_SYSTEM},
            {"role": "user", "content": _EDIT_PROMPT.format(instruction=instruction, markdown=markdown)},
        ],
        "temperature": 0.3,
        "max_tokens": 3000,
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{external_settings.TONGYI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {external_settings.TONGYI_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=90.0,
        )
        response.raise_for_status()
        result = response.json()["choices"][0]["message"]["content"] or ""
        result = result.strip()
        if result.startswith("```"): result = result.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        return result
