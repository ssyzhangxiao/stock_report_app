"""
OpenBB Workspace 兼容响应模型。

这些模型与 openbb_platform_api.response_models 格式兼容，
用于让 OpenBB Workspace 正确识别和渲染 Widget。
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class MetricResponseModel(BaseModel):
    """Metric Widget - 显示标签、数值和变化量。"""
    label: str = Field(description="指标标签")
    value: Any = Field(description="指标数值")
    delta: Optional[Any] = Field(default=None, description="变化量")


class OmniWidgetResponseModel(BaseModel):
    """Omni Widget - 通用内容展示（表格/图表/文本）。"""
    content: Any = Field(description="展示内容")
    parse_as: Optional[str] = Field(default=None, description="解析类型: table/chart/text")


class WidgetConfig(BaseModel):
    """Widget 配置元数据。"""
    name: str
    description: str
    endpoint: str
    widget_type: str = "omni"
    category: str = "分析"
    subcategory: Optional[str] = None
    icon: Optional[str] = None
    params: Optional[dict] = None


class AppTemplate(BaseModel):
    """App 模板定义。"""
    name: str
    description: str
    icon: Optional[str] = None
    tabs: dict = Field(default_factory=dict)
    allowCustomization: bool = True
