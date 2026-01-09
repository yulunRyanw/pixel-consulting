import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# 引入自定义模块
from prompts import SYSTEM_PROMPTS
from rag import build_knowledge_base, query_knowledge_base
from ppt_engine import create_one_slide_ppt

# 加载环境变量
load_dotenv()

# RAG 专用的系统提示词
RAG_CHAT_SYSTEM_PROMPT = """
你是一个顶级咨询顾问 (Associate @ MBB)。
你有权访问一份关于 "NYCHA (纽约市房屋局)" 的内部机密文档。

【思维链 (Chain of Thought) 要求】
在回答用户之前，请严格遵循以下步骤：
1. **Context Check**: 检查下方的【参考文档片段】。
2. **Fact Matching**: 如果用户问具体数据（如积压量、预算缺口），必须使用文档里的数字。
3. **Citation**: 在引用数据时，必须在括号里标注来源，例如 "(Source: P22 Data)".
4. **Honesty**: 如果文档里没有提到，直接说“文档里没有这部分数据，我们需要做假设吗？”，严禁瞎编。

【参考文档片段 (RAG Context)】:
{context}

【你的角色设定】
- 语气：专业、干练、略带一点“加班过度的疲惫感”。
- 格式：如果涉及多个数据，请使用 Markdown 表格展示。
"""

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 Qwen 客户端
client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url=os.getenv("QWEN_BASE_URL"),
)
model_name = os.getenv("MODEL_NAME", "qwen-plus")

# --- 数据模型定义 ---

class ChatRequest(BaseModel):
    role: str       # 例如 "Partner"
    message: str    # 例如 "帮我看看这个PPT"

class SlideRequest(BaseModel):
    topic: str      # 这里修正为 topic，与前端 fetch 里的 key 保持一致
    role: str       # 例如 "Associate"

# --- 路由定义 ---

@app.get("/")
def read_root():
    return {"status": "Brain Online", "model": model_name}

@app.post("/api/learn")
def trigger_learning():
    """
    触发 AI 读取 PDF 并构建知识库
    """
    try:
        # 调用 rag.py 里的函数
        result = build_knowledge_base()
        return {"status": "success", "message": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/chat")
def chat_gen(request: ChatRequest):
    """
    带 RAG 功能的聊天接口
    """
    # 1. 🔍 RAG 检索
    user_query = request.message
    retrieved_context = query_knowledge_base(user_query)
    
    if not retrieved_context:
        retrieved_context = "（没有在知识库中找到直接相关的内容）"
        print(f"🤷‍♂️ Chat RAG: No context found for '{user_query}'")
    else:
        print(f"📚 Chat RAG: Found context! Injection into prompt...")

    # 2. 🧠 注入上下文
    system_prompt = RAG_CHAT_SYSTEM_PROMPT.format(context=retrieved_context)

    # 3. 🗣️ 生成回答
    # 如果是 Associate，就用 RAG 模式；如果是 Partner/BA，暂时还用原来的简单模式
    final_system_message = system_prompt if request.role == "Associate" else SYSTEM_PROMPTS.get(request.role, "你是AI助手")

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": final_system_message},
                {"role": "user", "content": request.message}
            ]
        )
        return {"reply": response.choices[0].message.content}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate_ppt")
def generate_ppt(request: SlideRequest):
    """
    生成 Markdown 内容，并引导用户去 Gamma
    """
    # 1. RAG 检索 (为 PPT 寻找素材)
    retrieved_context = query_knowledge_base(request.topic)
    if not retrieved_context:
        retrieved_context = "No specific internal data found. Use general consulting knowledge."
    
    # 2. 让 LLM 策划内容，要求输出严格 JSON
    prompt = f"""
    Based on the context below, generate content for a consulting slide about "{request.topic}".
    The role is {request.role}.
    
    Context: {retrieved_context}
    
    Return STRICT JSON format ONLY (no markdown backticks around it if possible):
    {{
      "title": "Slide Title",
      "points": ["Key Insight 1", "Key Insight 2", "Key Insight 3"],
      "chart_data": {{
        "type": "bar",
        "categories": ["Cat A", "Cat B"],
        "values": [10, 20]
      }}
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}]
        )
        content_text = response.choices[0].message.content
        print(f"🤖 LLM Raw Output: {content_text}") 

        # 3. 🛡️ 强壮的 JSON 解析逻辑 (防呆设计)
        md_content = ""
        try:
            # 清洗可能存在的 Markdown 标记
            json_str = content_text
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            
            # 解析 JSON
            ppt_data = json.loads(json_str.strip())
            
            # 调用 ppt_engine 生成 Markdown
            md_content = create_one_slide_ppt(ppt_data)
            
        except Exception as e:
            print(f"⚠️ JSON Parsing Failed: {e}. Falling back to raw text.")
            # 兜底：解析失败直接返回原话，绝不为空
            md_content = f"# Analysis Result\n\n> Auto-formatting failed, raw output:\n\n{content_text}"

        # 4. 返回 JSON
        return {
            "status": "success",
            "markdown": md_content,
            "gamma_link": "https://gamma.app/new?mode=text",
            "message": "Content generated! Please copy the markdown and paste it into Gamma."
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}