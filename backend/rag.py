import os
import pdfplumber
# 👇 修复了你截图里的报错，使用新版引用路径
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import DashScopeEmbeddings
from dotenv import load_dotenv

load_dotenv()

embeddings = DashScopeEmbeddings(
    model="text-embedding-v1",
    dashscope_api_key=os.getenv("DASHSCOPE_API_KEY")
)

DB_PATH = "faiss_index"

def build_knowledge_base():
    """
    读取用户人工整理的 doc.pdf (全量读取，因为全是精华)
    """
    pdf_path = "doc.pdf"
    
    if not os.path.exists(pdf_path):
        return "❌ 错误：backend 文件夹里找不到 doc.pdf！"

    print(f"📖 正在读取人工精选教材: {pdf_path} ...")
    
    selected_docs = []
    total_pages = 0
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"📄 文件共 {total_pages} 页，正在逐页提取...")
            
            for i, page in enumerate(pdf.pages):
                # 提取文字
                text = page.extract_text()
                
                if not text:
                    text = "(本页无文字)"
                else:
                    # 🔍 简单的 Debug: 看看有没有读到那个关键数字
                    if "330" in text or "330,000" in text or "Backlog" in text:
                        print(f"✨ 在第 {i+1} 页发现了 Backlog 关键数据！")
                    if "16B" in text or "17B" in text:
                        print(f"💰 在第 {i+1} 页发现了 Capital Needs 关键数据！")

                # 封装成 Document 对象
                doc = Document(
                    page_content=f"[Manual Ref: Page {i+1}]\n{text}",
                    metadata={"source": "manual_doc.pdf", "page": i+1}
                )
                selected_docs.append(doc)

    except Exception as e:
        return f"❌ PDF 读取失败: {str(e)}"

    if not selected_docs:
        return "❌ 没有提取到任何内容，请检查 PDF 是否为空。"

    print(f"✅ 成功提取 {len(selected_docs)} 页。正在切分并存入大脑...")

    # 切分设置：因为你的整理非常密集，我们把块稍微设大一点，重叠多一点
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=300)
    texts = text_splitter.split_documents(selected_docs)
    
    try:
        # 重建索引 (覆盖旧的)
        db = FAISS.from_documents(texts, embeddings)
        db.save_local(DB_PATH)
        print(f"💾 知识库构建完成！已保存到 '{DB_PATH}'。")
        return f"Success: Ingested {len(selected_docs)} pages of manual context. Ready for Level 2 consulting."
    except Exception as e:
        return f"❌ 向量化/保存失败: {str(e)}"

def query_knowledge_base(query):
    """
    检索逻辑
    """
    if not os.path.exists(DB_PATH):
        return None

    try:
        db = FAISS.load_local(DB_PATH, embeddings, allow_dangerous_deserialization=True)
        # 搜索最相关的 4 个片段
        docs = db.similarity_search(query, k=4)
        context = "\n\n".join([d.page_content for d in docs])
        return context
    except Exception as e:
        print(f"RAG Error: {e}")
        return None