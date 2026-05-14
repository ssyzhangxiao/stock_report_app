"""
图表引擎 - 表格到 ECharts 配置转换

转换优先级：
1. 元注释强制指定
2. 自动智能判断
3. 失败则保留原表格

所有图表使用 SVG 渲染（renderer: 'svg'）
"""

from typing import Dict, Any
import pandas as pd
import numpy as np

from app.services.md_parser import TableData
from app.utils.helpers import setup_logger

logger = setup_logger("chart_engine")


# 专业配色方案（屏幕显示）
COLOR_PALETTE = [
    "#5470c6",
    "#91cc75",
    "#fac858",
    "#ee6666",
    "#73c0de",
    "#3ba272",
    "#fc8452",
    "#9a60b4",
    "#ea7ccc",
    "#ff9f7f",
]

# 打印配色方案（灰度）
PRINT_PALETTE = [
    "#333333",
    "#666666",
    "#999999",
    "#CCCCCC",
    "#000000",
    "#444444",
    "#777777",
    "#AAAAAA",
    "#555555",
    "#888888",
]


class ChartRuleEngine:
    """
    表格到图表的规则引擎
    """

    def process_table(self, table: TableData) -> TableData:
        """
        处理单个表格，尝试转换为图表

        Args:
            table: 表格数据

        Returns:
            更新了 chart_spec 的表格数据
        """
        try:
            df = table.dataframe

            # 1. 如果有元注释，直接使用
            if table.chart_config:
                logger.info(
                    f"使用元注释配置 (行{table.line_number}): {table.chart_config}"
                )
                table.chart_spec = self._generate_from_config(df, table.chart_config)
                table.conversion_status = "success"
                return table

            # 2. 自动判断图表类型
            chart_type = self._detect_chart_type(df)

            if chart_type == "table":
                table.conversion_status = "skipped"
                return table

            # 3. 生成图表配置
            table.chart_spec = self._generate_auto_chart(df, chart_type)
            table.conversion_status = "success"
            logger.info(f"自动转换成功 (行{table.line_number}): {chart_type}")

            return table

        except Exception as e:
            logger.error(f"图表转换失败 (行{table.line_number}): {e}")
            table.conversion_status = "failed"
            table.error_message = str(e)
            return table

    def _detect_chart_type(self, df: pd.DataFrame) -> str:
        """
        自动检测最适合的图表类型

        规则：
        - 首列时间（年/季/月）→ 折线图
        - 仅两列，第二列为百分比或总和≈100% → 环形图
        - 行数 ≤ 6，列数 3~6，均为占比/排名 → 雷达图
        - 多类别（行）多时间（列）→ 堆叠柱状图
        - 矩阵形式（行≥5，列≥5，数值密集）→ 热力图
        - 第一列年份，第二列事件描述 → 时间轴图
        - 第一列为流程阶段，第二列为数值 → 漏斗图
        - 行数 ≤ 8 的对比数据 → 柱状图
        - 其他 → 柱状图
        """
        if df.empty or len(df.columns) < 2:
            return "table"

        rows, cols = df.shape
        first_col_values = df.iloc[:, 0].astype(str)

        # 检测时间序列
        if self._is_time_series(first_col_values):
            return "line"

        # 检测占比数据（两列，第二列百分比或总和≈100%）
        if cols == 2:
            second_col = df.iloc[:, 1]
            if self._is_percentage_column(second_col) or self._sums_to_100(second_col):
                return "pie"

        # 检测雷达图（行数≤6，列数3~6，数值范围0~100或名次）
        if rows <= 6 and 3 <= cols <= 6:
            if self._is_radar_data(df):
                return "radar"

        # 检测堆叠柱状图（多类别多时间）
        if self._is_stacked_bar_data(df):
            return "stacked_bar"

        # 检测热力图（矩阵数据）
        if rows >= 5 and cols >= 5 and self._is_matrix_data(df):
            return "heatmap"

        # 检测时间轴图
        if self._is_timeline_data(df):
            return "timeline"

        # 检测漏斗图
        if self._is_funnel_data(df):
            return "funnel"

        # 检测K线图
        if self._is_kline_data(df):
            return "kline"

        # 默认：行数≤8 → 柱状图，否则 → 柱状图（横向）
        if rows <= 8:
            return "bar"
        else:
            return "bar_horizontal"

    def _is_time_series(self, values) -> bool:
        """检测是否为时间序列"""
        time_keywords = ["年", "季度", "Q", "月", "周", "日", "date", "year", "month"]
        # 支持 Index 和 Series
        if hasattr(values, "head"):
            sample = " ".join(values.head(5).astype(str))
        else:
            sample = " ".join(str(v) for v in list(values)[:5])
        return any(kw in sample for kw in time_keywords)

    def _is_percentage_column(self, col: pd.Series) -> bool:
        """检测是否为百分比列"""
        sample = col.astype(str).head(10)
        return sample.str.contains("%").any()

    def _sums_to_100(self, col: pd.Series) -> bool:
        """检测数值是否总和≈100"""
        try:
            numeric = pd.to_numeric(col, errors="coerce")
            total = numeric.sum()
            return 95 <= total <= 105
        except Exception:
            return False

    def _is_radar_data(self, df: pd.DataFrame) -> bool:
        """检测是否为雷达图数据"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) < 3:
            return False
        for col in numeric_cols:
            vals = df[col]
            if vals.min() >= 0 and vals.max() <= 100:
                return True
        return False

    def _is_stacked_bar_data(self, df: pd.DataFrame) -> bool:
        """检测是否为堆叠柱状图数据"""
        if len(df.columns) < 3:
            return False
        # 第一列是类别，其余是时间
        return self._is_time_series(df.columns[1:])

    def _is_matrix_data(self, df: pd.DataFrame) -> bool:
        """检测是否为矩阵数据"""
        numeric_count = len(df.select_dtypes(include=[np.number]).columns)
        return numeric_count >= 4

    def _is_timeline_data(self, df: pd.DataFrame) -> bool:
        """检测是否为时间轴数据"""
        if len(df.columns) < 2:
            return False
        first_col = df.iloc[:, 0].astype(str)
        second_col = df.iloc[:, 1].astype(str)
        return self._is_time_series(first_col) and second_col.str.len().mean() > 10

    def _is_funnel_data(self, df: pd.DataFrame) -> bool:
        """检测是否为漏斗图数据"""
        if len(df.columns) < 2:
            return False
        first_col = df.iloc[:, 0].astype(str)
        funnel_keywords = ["步骤", "环节", "转化", "阶段", "流程", "step", "stage"]
        return any(kw in " ".join(first_col) for kw in funnel_keywords)

    def _is_kline_data(self, df: pd.DataFrame) -> bool:
        """检测是否为K线图数据"""
        required_cols = ["open", "high", "low", "close", "开盘", "最高", "最低", "收盘"]
        col_names = " ".join(df.columns.str.lower())
        return sum(1 for c in required_cols if c in col_names) >= 4

    def _generate_from_config(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """根据元注释生成图表配置"""
        chart_type = config.get("type", "bar")

        generators = {
            "line": self._generate_line_chart,
            "bar": self._generate_bar_chart,
            "pie": self._generate_pie_chart,
            "radar": self._generate_radar_chart,
            "stacked_bar": self._generate_stacked_bar_chart,
            "heatmap": self._generate_heatmap,
            "timeline": self._generate_timeline,
            "funnel": self._generate_funnel,
            "area": self._generate_area_chart,
            "scatter": self._generate_scatter_chart,
            "kline": self._generate_kline_chart,
        }

        generator = generators.get(chart_type, self._generate_bar_chart)
        return generator(df, config)

    def _generate_auto_chart(self, df: pd.DataFrame, chart_type: str) -> Dict[str, Any]:
        """自动生成图表配置"""
        config = {"type": chart_type}
        return self._generate_from_config(df, config)

    def _generate_line_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成折线图配置"""
        x_col = df.columns[0]
        y_cols = config.get(
            "ycols", [c for c in df.columns[1:] if pd.api.types.is_numeric_dtype(df[c])]
        )

        series = []
        for i, col in enumerate(y_cols):
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                series.append(
                    {
                        "name": col,
                        "type": "line",
                        "data": df[col].fillna(0).tolist(),
                        "smooth": True,
                        "symbol": "circle",
                        "symbolSize": 6,
                        "lineStyle": {"width": 2},
                        "itemStyle": {"color": COLOR_PALETTE[i % len(COLOR_PALETTE)]},
                    }
                )

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "axis"},
            "legend": {"data": [s["name"] for s in series], "bottom": 0},
            "grid": {
                "left": "3%",
                "right": "4%",
                "bottom": "10%",
                "top": "15%",
                "containLabel": True,
            },
            "xAxis": {
                "type": "category",
                "data": df[x_col].astype(str).tolist(),
                "axisLabel": {"rotate": 30 if len(df) > 6 else 0},
            },
            "yAxis": {"type": "value"},
            "series": series,
            "animation": True,
        }

    def _generate_bar_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成柱状图配置"""
        x_col = df.columns[0]
        y_cols = config.get(
            "ycols", [c for c in df.columns[1:] if pd.api.types.is_numeric_dtype(df[c])]
        )

        series = []
        for i, col in enumerate(y_cols):
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                series.append(
                    {
                        "name": col,
                        "type": "bar",
                        "data": df[col].fillna(0).tolist(),
                        "itemStyle": {"color": COLOR_PALETTE[i % len(COLOR_PALETTE)]},
                        "barMaxWidth": 40,
                    }
                )

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "axis"},
            "legend": {"data": [s["name"] for s in series], "bottom": 0},
            "grid": {
                "left": "3%",
                "right": "4%",
                "bottom": "10%",
                "top": "15%",
                "containLabel": True,
            },
            "xAxis": {
                "type": "category",
                "data": df[x_col].astype(str).tolist(),
                "axisLabel": {"rotate": 30 if len(df) > 6 else 0},
            },
            "yAxis": {"type": "value"},
            "series": series,
            "animation": True,
        }

    def _generate_pie_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成环形图配置"""
        name_col = df.columns[0]
        value_col = config.get("ycol", df.columns[1])

        data = []
        for _, row in df.iterrows():
            data.append(
                {
                    "name": str(row[name_col]),
                    "value": float(row[value_col]) if pd.notna(row[value_col]) else 0,
                }
            )

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "item", "formatter": "{b}: {c} ({d}%)"},
            "legend": {"orient": "vertical", "left": "left", "top": "center"},
            "series": [
                {
                    "name": config.get("title", ""),
                    "type": "pie",
                    "radius": ["40%", "70%"],
                    "avoidLabelOverlap": False,
                    "itemStyle": {
                        "borderRadius": 10,
                        "borderColor": "#fff",
                        "borderWidth": 2,
                    },
                    "label": {"show": True, "formatter": "{b}\n{d}%"},
                    "data": data,
                    "color": COLOR_PALETTE,
                }
            ],
            "animation": True,
        }

    def _generate_radar_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成雷达图配置"""
        indicator_col = df.columns[0]
        dimensions = config.get(
            "dimensions",
            [c for c in df.columns[1:] if pd.api.types.is_numeric_dtype(df[c])],
        )

        indicators = []
        for col in dimensions[:6]:
            if col in df.columns:
                max_val = df[col].max()
                indicators.append(
                    {"name": col, "max": max_val * 1.2 if max_val > 0 else 100}
                )

        series_data = []
        for _, row in df.iterrows():
            values = []
            for col in dimensions:
                if col in df.columns:
                    values.append(float(row[col]) if pd.notna(row[col]) else 0)
            series_data.append({"name": str(row[indicator_col]), "value": values})

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "item"},
            "legend": {"data": [d["name"] for d in series_data], "bottom": 0},
            "radar": {
                "indicator": indicators,
                "radius": "65%",
                "center": ["50%", "55%"],
            },
            "series": [
                {
                    "type": "radar",
                    "data": series_data,
                    "symbol": "circle",
                    "symbolSize": 6,
                    "lineStyle": {"width": 2},
                    "areaStyle": {"opacity": 0.2},
                }
            ],
            "animation": True,
        }

    def _generate_stacked_bar_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成堆叠柱状图配置"""
        x_col = df.columns[0]
        y_cols = config.get(
            "ycols", [c for c in df.columns[1:] if pd.api.types.is_numeric_dtype(df[c])]
        )

        series = []
        for i, col in enumerate(y_cols):
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                series.append(
                    {
                        "name": col,
                        "type": "bar",
                        "stack": "total",
                        "data": df[col].fillna(0).tolist(),
                        "itemStyle": {"color": COLOR_PALETTE[i % len(COLOR_PALETTE)]},
                    }
                )

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}},
            "legend": {"data": [s["name"] for s in series], "bottom": 0},
            "grid": {
                "left": "3%",
                "right": "4%",
                "bottom": "10%",
                "top": "15%",
                "containLabel": True,
            },
            "xAxis": {"type": "category", "data": df[x_col].astype(str).tolist()},
            "yAxis": {"type": "value"},
            "series": series,
            "animation": True,
        }

    def _generate_heatmap(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成热力图配置"""
        y_labels = df.iloc[:, 0].astype(str).tolist()
        x_labels = [c for c in df.columns[1:] if pd.api.types.is_numeric_dtype(df[c])]

        data = []
        for i, row in df.iterrows():
            for j, col in enumerate(x_labels):
                val = row[col]
                data.append([j, i, float(val) if pd.notna(val) else 0])

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"position": "top"},
            "grid": {"height": "70%", "top": "15%"},
            "xAxis": {
                "type": "category",
                "data": x_labels,
                "splitArea": {"show": True},
            },
            "yAxis": {
                "type": "category",
                "data": y_labels,
                "splitArea": {"show": True},
            },
            "visualMap": {
                "min": min(d[2] for d in data),
                "max": max(d[2] for d in data),
                "calculable": True,
                "orient": "horizontal",
                "left": "center",
                "bottom": "0%",
            },
            "series": [
                {
                    "name": config.get("title", ""),
                    "type": "heatmap",
                    "data": data,
                    "label": {"show": True},
                    "emphasis": {
                        "itemStyle": {
                            "shadowBlur": 10,
                            "shadowColor": "rgba(0, 0, 0, 0.5)",
                        }
                    },
                }
            ],
            "animation": True,
        }

    def _generate_timeline(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成时间轴图配置"""
        x_field = config.get("xfield", df.columns[0])
        y_field = config.get("yfield", df.columns[1])

        data = []
        for _, row in df.iterrows():
            data.append(
                {
                    "name": str(row[x_field]),
                    "value": [str(row[x_field]), str(row[y_field])],
                }
            )

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "item"},
            "series": [
                {
                    "type": "scatter",
                    "symbolSize": 15,
                    "data": data,
                    "itemStyle": {"color": COLOR_PALETTE[0]},
                }
            ],
            "animation": True,
        }

    def _generate_funnel(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成漏斗图配置"""
        name_col = df.columns[0]
        value_col = config.get("ycol", df.columns[1])

        data = []
        for _, row in df.iterrows():
            data.append(
                {
                    "name": str(row[name_col]),
                    "value": float(row[value_col]) if pd.notna(row[value_col]) else 0,
                }
            )

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "item", "formatter": "{b}: {c}"},
            "series": [
                {
                    "name": config.get("title", ""),
                    "type": "funnel",
                    "left": "10%",
                    "top": 60,
                    "bottom": 60,
                    "width": "80%",
                    "min": 0,
                    "max": max(d["value"] for d in data),
                    "minSize": "0%",
                    "maxSize": "100%",
                    "sort": "descending",
                    "gap": 2,
                    "label": {"show": True, "position": "inside"},
                    "data": data,
                    "color": COLOR_PALETTE,
                }
            ],
            "animation": True,
        }

    def _generate_area_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成面积图配置"""
        spec = self._generate_line_chart(df, config)
        for s in spec.get("series", []):
            s["type"] = "line"
            s["areaStyle"] = {"opacity": 0.3}
        return spec

    def _generate_scatter_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成散点图配置"""
        x_col = df.columns[0]
        y_col = config.get(
            "ycol", df.columns[1] if len(df.columns) > 1 else df.columns[0]
        )

        data = []
        for _, row in df.iterrows():
            x_val = row[x_col]
            y_val = row[y_col]
            if pd.notna(x_val) and pd.notna(y_val):
                data.append([float(x_val), float(y_val)])

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "item"},
            "xAxis": {"type": "value"},
            "yAxis": {"type": "value"},
            "series": [
                {
                    "type": "scatter",
                    "data": data,
                    "symbolSize": 10,
                    "itemStyle": {"color": COLOR_PALETTE[0]},
                }
            ],
            "animation": True,
        }

    def _generate_kline_chart(
        self, df: pd.DataFrame, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成K线图配置"""
        date_col = df.columns[0]

        # 查找 OHLC 列
        ohlc = {}
        col_lower = {c.lower(): c for c in df.columns}
        for key in ["open", "high", "low", "close"]:
            for k in [
                key,
                key[:1],
                "开盘"
                if key == "open"
                else "最高"
                if key == "high"
                else "最低"
                if key == "low"
                else "收盘",
            ]:
                if k in col_lower:
                    ohlc[key] = col_lower[k]
                    break

        if len(ohlc) < 4:
            raise ValueError("K线图需要 open/high/low/close 四列数据")

        data = []
        for _, row in df.iterrows():
            data.append(
                [
                    float(row[ohlc["open"]]),
                    float(row[ohlc["close"]]),
                    float(row[ohlc["low"]]),
                    float(row[ohlc["high"]]),
                ]
            )

        return {
            "renderer": "svg",
            "title": {"text": config.get("title", ""), "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {"type": "category", "data": df[date_col].astype(str).tolist()},
            "yAxis": {"type": "value"},
            "series": [
                {
                    "type": "candlestick",
                    "data": data,
                    "itemStyle": {
                        "color": "#ee6666",
                        "color0": "#91cc75",
                        "borderColor": "#ee6666",
                        "borderColor0": "#91cc75",
                    },
                }
            ],
            "animation": True,
        }


def process_all_tables(report_data) -> None:
    """
    处理报告中的所有表格，尝试转换为图表

    Args:
        report_data: ReportData 对象
    """
    engine = ChartRuleEngine()
    success_count = 0
    fail_count = 0
    skip_count = 0

    for table in report_data.all_tables:
        engine.process_table(table)
        if table.conversion_status == "success":
            success_count += 1
        elif table.conversion_status == "failed":
            fail_count += 1
        else:
            skip_count += 1

    total = len(report_data.all_tables)
    logger.info(
        f"表格处理完成: 总计{total}, "
        f"成功{success_count}({success_count / total * 100:.1f}%), "
        f"失败{fail_count}, 跳过{skip_count}"
    )


if __name__ == "__main__":
    from app.services.md_parser import MarkdownParser

    test_file = "/Users/mac/projects/stock-research-agent/RESEARCH/STOCK_600519_贵州茅台/FULL_REPORT.md"

    parser = MarkdownParser()
    report = parser.parse_file(test_file)

    process_all_tables(report)

    print("\n✅ 图表转换完成!")
    print(f"总表格数: {len(report.all_tables)}")

    for i, table in enumerate(report.all_tables[:5]):
        print(f"\n表格 {i + 1} (行{table.line_number}):")
        print(f"  状态: {table.conversion_status}")
        if table.chart_spec:
            print(
                f"  图表类型: {table.chart_spec.get('series', [{}])[0].get('type', 'unknown')}"
            )
        if table.error_message:
            print(f"  错误: {table.error_message}")
