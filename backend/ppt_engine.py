# backend/ppt_engine.py

def create_one_slide_ppt(content_data):
    """
    【Gamma 专用优化版】
    生成专门针对 Gamma "Paste Text" 模式优化的 Markdown 脚本。
    包含显式的布局指令和图表提示。
    """
    title = content_data.get("title", "Consulting Analysis")
    points = content_data.get("points", [])
    chart_info = content_data.get("chart_data", {})
    
    # 1. 幻灯片标题 (Heading 1)
    md_output = f"# {title}\n\n"
    
    # 2. 核心观点 (Layout Hint)
    # 给 Gamma 一个布局提示，通常 "Key Insights" 会触发列表布局
    md_output += "## Key Insights\n"
    if isinstance(points, str): 
        points = [points]
    for p in points:
        md_output += f"- {p}\n"
    
    # 3. 图表区域 (The "Visual" Section)
    if chart_info and "values" in chart_info:
        chart_type = chart_info.get("type", "bar")
        categories = chart_info.get("categories", [])
        values = chart_info.get("values", [])
        
        md_output += "\n---\n"  # 强制分割线 (可选，防止 Gamma 把图表挤得太小)
        md_output += f"\n## Data Analysis: {title}\n"
        
        # 3.1 构建自然语言描述 (Gamma AI 更容易读懂这个)
        # 例子: "Create a bar chart comparing NYCHA (330k) and Benchmark (0)."
        desc_list = []
        limit = min(len(categories), len(values))
        for i in range(limit):
            desc_list.append(f"{categories[i]} is {values[i]}")
        data_desc = ", ".join(desc_list)
        
        # 3.2 显式指令块 (Blockquote)
        # 这是给 Gamma 的 Agent 看的，不是给最终观众看的
        md_output += f"> **Design Instruction:** Create a **{chart_type} chart** to visualize this data.\n"
        md_output += f"> Data points: {data_desc}.\n\n"
        
        # 3.3 结构化表格 (作为数据的绝对备份)
        md_output += "| Category | Value |\n"
        md_output += "| :--- | :--- |\n"
        
        for i in range(limit):
            cat_str = str(categories[i])
            val_str = str(values[i])
            md_output += f"| {cat_str} | {val_str} |\n"

    # 4. 结尾标记
    md_output += "\n\n"
    
    return md_output