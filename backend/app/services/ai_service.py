import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

OPTIMIZE_PROMPT = """你是一位专业的简历优化顾问。请根据以下简历内容，给出具体的优化建议和改进后的版本。

请从以下几个方面进行优化：
1. 个人简介：是否突出核心竞争力，是否简洁有力
2. 工作/项目经历：是否使用了STAR法则，是否有量化成果
3. 技能描述：是否与求职意向匹配
4. 整体结构：是否逻辑清晰，重点突出
5. 用词表达：是否专业、精炼

请先给出总体评价，然后逐项给出具体的修改建议和优化后的文本。

简历内容：
{resume_text}
"""


async def optimize_resume_with_ai(resume_text: str) -> str:
    response = await client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": "你是一位资深的简历优化专家，擅长帮助求职者优化简历内容。"},
            {"role": "user", "content": OPTIMIZE_PROMPT.format(resume_text=resume_text)},
        ],
        temperature=0.7,
        max_tokens=2000,
    )
    return response.choices[0].message.content or "优化结果为空，请重试"
