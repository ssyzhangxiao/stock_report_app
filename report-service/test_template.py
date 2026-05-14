#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from jinja2 import Environment, FileSystemLoader, select_autoescape
import json

template_dir = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "app", "templates"
)

env = Environment(
    loader=FileSystemLoader(template_dir),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

env.filters["markdown_to_html"] = lambda x: "<p>mock</p>"

template = env.get_template("report.html")
print("✅ 模板加载成功")

test_chart_spec = {
    "title": {"text": "测试图表"},
    "xAxis": {"data": ["A", "B"]},
    "yAxis": {},
    "series": [{"data": [1, 2]}],
}
test_chart_spec_json = json.dumps(test_chart_spec, ensure_ascii=False)

context = {
    "title": "测试报告",
    "stock_code": "600519",
    "generated_at": "2024-01-01 00:00:00",
    "sections": [
        {
            "title": "第一章",
            "html_content": "<p>测试内容</p>",
            "tables": [
                {
                    "chart_spec": test_chart_spec,
                    "chart_spec_json": test_chart_spec_json,
                    "conversion_status": "success",
                    "error_message": None,
                    "raw_markdown": "| A | B |\n|---|---|\n| 1 | 2 |",
                }
            ],
        }
    ],
}

try:
    html = template.render(**context)
    print("✅ 模板渲染成功！长度:", len(html))

    if "data-chart-spec=" in html:
        print("✅ 找到 data-chart-spec 属性")
    else:
        print("❌ 未找到 data-chart-spec 属性")

    if "DOMContentLoaded" in html:
        print("✅ 找到 DOMContentLoaded 事件监听")
    else:
        print("❌ 未找到 DOMContentLoaded 事件监听")

    print("\n--- 图表相关HTML片段 ---")
    import re

    chart_matches = re.findall(
        r'<div class="chart-container"[^>]*>.*?</div>', html, re.DOTALL
    )
    for m in chart_matches:
        print(m[:300])

except Exception as e:
    print(f"❌ 渲染失败: {e}")
    import traceback

    traceback.print_exc()
