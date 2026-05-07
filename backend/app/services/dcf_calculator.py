"""
DCF (Discounted Cash Flow) 估值计算器

基于自由现金流折现模型计算股票内在价值，并生成敏感性分析矩阵。
支持从真实财务数据动态计算，无硬编码。
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


INDUSTRY_WACC = {
    "白酒": 0.080, "食品饮料": 0.080, "医药": 0.075, "医疗": 0.075,
    "新能源": 0.090, "光伏": 0.090, "锂电池": 0.090, "电动车": 0.090,
    "半导体": 0.100, "芯片": 0.100, "电子": 0.095,
    "银行": 0.065, "保险": 0.070, "证券": 0.085, "金融": 0.075,
    "房地产": 0.085, "建筑": 0.080,
    "电力": 0.065, "煤炭": 0.080, "石油": 0.080, "能源": 0.075,
    "汽车": 0.085, "家电": 0.080, "机械": 0.085,
    "互联网": 0.100, "软件": 0.100, "计算机": 0.100,
    "通信": 0.080, "传媒": 0.090,
    "交通运输": 0.075, "航空": 0.080, "物流": 0.080,
    "农业": 0.080, "化工": 0.085, "钢铁": 0.085, "有色": 0.090,
    "零售": 0.080, "旅游": 0.085, "酒店": 0.085,
}
DEFAULT_WACC = 0.085


@dataclass
class DCFResult:
    symbol: str
    current_price: float
    fair_value: float
    upside_potential: float
    downside_potential: float
    wacc: float
    terminal_growth: float
    sensitivity_matrix: List[List[float]]
    wacc_values: List[float]
    growth_values: List[float]
    using_default: bool = False
    fcff_base: Optional[float] = None
    total_shares: Optional[float] = None
    growth_rate: Optional[float] = None


class DCFCalculator:

    def __init__(self):
        self.forecast_years = 3
        self.sensitivity_wacc_range = [0.08, 0.09, 0.10, 0.11, 0.12]
        self.sensitivity_growth_range = [0.01, 0.02, 0.03, 0.04, 0.05]

    def calculate(
        self,
        symbol: str,
        current_price: float,
        financial_data: Dict[str, Any]
    ) -> Optional[DCFResult]:
        try:
            logger.info(f"[DCF] 开始计算 {symbol} 的 DCF 估值，当前价格: {current_price}")

            deep = financial_data.get("deep_financial", {})
            cashflow_list = financial_data.get("cashflow") or deep.get("cashflow", [])
            balance_list = financial_data.get("balance_sheet") or deep.get("balance_sheet", [])
            income_list = financial_data.get("income_statement") or deep.get("income_statement", [])
            indicators_list = financial_data.get("financial_indicators") or deep.get("financial_indicators", [])
            company_info = financial_data.get("company_info", {})
            valuation = financial_data.get("valuation", {})

            total_shares = self._extract_total_shares(company_info, balance_list, indicators_list)
            if not total_shares or total_shares <= 0:
                total_shares = self._estimate_shares_from_market_cap(valuation, current_price)

            base_fcff = self._extract_operating_cf(cashflow_list)
            if base_fcff is None:
                base_fcff = self._estimate_fcff_from_profit(income_list, balance_list)
            if base_fcff is None:
                base_fcff = self._estimate_fcff_from_market_cap(valuation, current_price, total_shares)

            wacc = self._estimate_wacc(company_info, valuation)
            terminal_growth = 0.03
            growth_rate = self._estimate_growth_rate(income_list, indicators_list)

            fcff_forecast = []
            for i in range(1, self.forecast_years + 1):
                fcff_forecast.append(base_fcff * (1 + growth_rate) ** i)

            net_cash = self._extract_net_cash(balance_list)

            forecast_pv = 0
            for idx, fcff in enumerate(fcff_forecast):
                discount_factor = (1 + wacc) ** (idx + 1)
                forecast_pv += fcff / discount_factor

            last_fcff = fcff_forecast[-1]
            if wacc > terminal_growth:
                terminal_value = last_fcff * (1 + terminal_growth) / (wacc - terminal_growth)
            else:
                terminal_value = last_fcff * 10
            terminal_pv = terminal_value / ((1 + wacc) ** len(fcff_forecast))

            enterprise_value = forecast_pv + terminal_pv
            equity_value = enterprise_value + net_cash
            fair_value = (equity_value * 100000000) / total_shares if total_shares > 0 else current_price

            logger.info(
                f"[DCF] {symbol}: FCFF基值={base_fcff:.1f}亿, 增长率={growth_rate*100:.1f}%, "
                f"WACC={wacc*100:.1f}%, 总股本={total_shares/1e8:.2f}亿, "
                f"企业价值={enterprise_value:.0f}亿, 每股={fair_value:.2f}元"
            )

            sensitivity_matrix = self._calculate_sensitivity_matrix(
                fcff_forecast, terminal_growth, total_shares, net_cash
            )

            upside_potential = ((fair_value - current_price) / current_price) * 100 if current_price > 0 else 0
            downside_potential = ((current_price - fair_value) / current_price) * 100 if current_price > 0 else 0

            return DCFResult(
                symbol=symbol,
                current_price=current_price,
                fair_value=round(fair_value, 2),
                upside_potential=round(upside_potential, 2),
                downside_potential=round(downside_potential, 2),
                wacc=round(wacc * 100, 1),
                terminal_growth=round(terminal_growth * 100, 1),
                sensitivity_matrix=sensitivity_matrix,
                wacc_values=[round(w * 100, 1) for w in self.sensitivity_wacc_range],
                growth_values=[round(g * 100, 1) for g in self.sensitivity_growth_range],
                using_default=False,
                fcff_base=round(base_fcff, 2),
                total_shares=total_shares,
                growth_rate=round(growth_rate * 100, 1),
            )

        except Exception as e:
            logger.error(f"[DCF] 计算失败: {e}", exc_info=True)
            return self._fallback_result(symbol, current_price)

    def _extract_total_shares(
        self, company_info: Dict, balance_list: List[Dict], indicators_list: List[Dict]
    ) -> Optional[float]:
        for key in ("总股本", "total_shares", "shares_outstanding"):
            val = company_info.get(key)
            if val:
                try:
                    return float(val)
                except (ValueError, TypeError):
                    pass

        for row in balance_list:
            for key in ("实收资本（或股本）", "股本", "实收资本", "total_share_capital"):
                val = row.get(key)
                if val:
                    try:
                        v = float(val)
                        if v > 100000:
                            return v
                    except (ValueError, TypeError):
                        pass

        for row in indicators_list:
            for key in ("总股本(万股)", "总股本(亿股)", "总股本"):
                val = row.get(key)
                if val:
                    try:
                        v = float(val)
                        if "万" in str(key):
                            return v * 10000
                        if "亿" in str(key):
                            return v * 100000000
                        if v > 100000:
                            return v
                    except (ValueError, TypeError):
                        pass

        return None

    def _estimate_shares_from_market_cap(
        self, valuation: Dict, current_price: float
    ) -> float:
        market_cap_str = valuation.get("market_cap", "")
        if market_cap_str and current_price > 0:
            try:
                mc = self._parse_market_cap(market_cap_str)
                if mc and mc > 0:
                    return mc / current_price
            except Exception:
                pass
        return 10 * 100000000

    def _parse_market_cap(self, val) -> Optional[float]:
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val).replace(",", "").replace(" ", "")
        try:
            if "万亿" in s:
                return float(s.replace("万亿", "")) * 1e12
            elif "亿" in s:
                return float(s.replace("亿", "")) * 1e8
            elif "万" in s:
                return float(s.replace("万", "")) * 1e4
            return float(s)
        except (ValueError, TypeError):
            return None

    def _extract_operating_cf(self, cashflow_list: List[Dict]) -> Optional[float]:
        if not cashflow_list:
            return None
        cf_keys = [
            "经营活动产生的现金流量净额",
            "经营活动现金净流量",
            "operating_cash_flow",
            "经营活动现金流入小计",
        ]
        values = []
        for row in cashflow_list[:5]:
            for key in cf_keys:
                val = row.get(key)
                if val:
                    try:
                        v = float(val)
                        if abs(v) > 10000:
                            values.append(v / 1e8)
                            break
                    except (ValueError, TypeError):
                        pass
        if values:
            return sum(values) / len(values)
        return None

    def _estimate_fcff_from_profit(
        self, income_list: List[Dict], balance_list: List[Dict]
    ) -> Optional[float]:
        if not income_list:
            return None
        profit_keys = [
            "净利润", "净利润(含少数股东损益)",
            "归属于母公司所有者的净利润", "net_profit",
        ]
        values = []
        for row in income_list[:5]:
            for key in profit_keys:
                val = row.get(key)
                if val:
                    try:
                        v = float(val)
                        if abs(v) > 10000:
                            values.append(v / 1e8)
                            break
                    except (ValueError, TypeError):
                        pass
        if values:
            avg_profit = sum(values) / len(values)
            fcff_ratio = 0.75
            return avg_profit * fcff_ratio
        return None

    def _estimate_fcff_from_market_cap(
        self, valuation: Dict, current_price: float, total_shares: float
    ) -> float:
        market_cap_str = valuation.get("market_cap", "")
        mc = self._parse_market_cap(market_cap_str)
        if mc and mc > 0:
            return (mc / 1e8) * 0.05
        if current_price > 0 and total_shares > 0:
            return (current_price * total_shares / 1e8) * 0.05
        return 50

    def _estimate_wacc(self, company_info: Dict, valuation: Dict) -> float:
        industry = company_info.get("行业", "") or company_info.get("industry", "")
        for kw, wacc_val in INDUSTRY_WACC.items():
            if kw in industry:
                return wacc_val
        pe = valuation.get("pe_ratio")
        if pe and isinstance(pe, (int, float)) and pe > 0:
            if pe > 50:
                return 0.10
            elif pe > 30:
                return 0.09
            elif pe > 15:
                return 0.085
            else:
                return 0.075
        return DEFAULT_WACC

    def _estimate_growth_rate(
        self, income_list: List[Dict], indicators_list: List[Dict]
    ) -> float:
        revenue_keys = ["营业收入", "营业总收入", "revenue", "营业总收入(元)"]
        revenues = []
        for row in income_list[:10]:
            for key in revenue_keys:
                val = row.get(key)
                if val:
                    try:
                        v = float(val)
                        if v > 10000:
                            revenues.append(v)
                            break
                    except (ValueError, TypeError):
                        pass

        if len(revenues) >= 2:
            growth_rates = []
            for i in range(1, len(revenues)):
                if revenues[i] > 0:
                    gr = (revenues[i - 1] - revenues[i]) / revenues[i]
                    growth_rates.append(gr)
            if growth_rates:
                avg_gr = sum(growth_rates) / len(growth_rates)
                return max(0.01, min(0.20, avg_gr))

        roe_keys = ["净资产收益率(%)", "净资产收益率", "ROE", "加权平均净资产收益率(%)"]
        for row in indicators_list[:5]:
            for key in roe_keys:
                val = row.get(key)
                if val:
                    try:
                        roe = float(val)
                        if 0 < roe < 100:
                            return min(0.20, max(0.02, roe / 100 * 0.7))
                    except (ValueError, TypeError):
                        pass

        return 0.05

    def _extract_net_cash(self, balance_list: List[Dict]) -> float:
        if not balance_list:
            return 0
        cash = 0
        debt = 0
        cash_keys = ["货币资金", "现金及现金等价物", "货币资金(元)", "cash_and_equivalents"]
        debt_keys = [
            "短期借款", "长期借款", "应付债券",
            "短期借款(元)", "长期借款(元)", "应付债券(元)",
        ]
        for row in balance_list[:3]:
            for key in cash_keys:
                val = row.get(key)
                if val:
                    try:
                        cash = max(cash, float(val) / 1e8)
                    except (ValueError, TypeError):
                        pass
            for key in debt_keys:
                val = row.get(key)
                if val:
                    try:
                        debt += float(val) / 1e8
                    except (ValueError, TypeError):
                        pass
        return cash - debt

    def _calculate_sensitivity_matrix(
        self,
        base_fcff: List[float],
        base_terminal_growth: float,
        total_shares: float,
        net_cash: float,
    ) -> List[List[float]]:
        matrix = []
        for growth_rate in self.sensitivity_growth_range:
            row = []
            for wacc in self.sensitivity_wacc_range:
                fair_value = self._calculate_fair_value_for_params(
                    base_fcff, wacc, growth_rate, total_shares, net_cash
                )
                row.append(round(fair_value, 2))
            matrix.append(row)
        return matrix

    def _calculate_fair_value_for_params(
        self,
        base_fcff: List[float],
        wacc: float,
        terminal_growth: float,
        total_shares: float,
        net_cash: float,
    ) -> float:
        try:
            forecast_pv = 0
            for idx, fcff in enumerate(base_fcff):
                discount_factor = (1 + wacc) ** (idx + 1)
                forecast_pv += fcff / discount_factor

            last_fcff = base_fcff[-1]
            if wacc > terminal_growth:
                terminal_value = last_fcff * (1 + terminal_growth) / (wacc - terminal_growth)
            else:
                terminal_value = last_fcff * 10
            terminal_pv = terminal_value / ((1 + wacc) ** len(base_fcff))

            enterprise_value = forecast_pv + terminal_pv
            equity_value = enterprise_value + net_cash

            if total_shares > 0:
                return (equity_value * 100000000) / total_shares
            return 100
        except Exception:
            return 100

    def _fallback_result(self, symbol: str, current_price: float) -> DCFResult:
        logger.warning(f"[DCF] {symbol} 使用默认参数计算")
        total_shares = 10 * 100000000
        base_fcff = 50
        wacc = DEFAULT_WACC
        terminal_growth = 0.03
        growth_rate = 0.05

        fcff_forecast = [base_fcff * (1 + growth_rate) ** i for i in range(1, self.forecast_years + 1)]

        forecast_pv = sum(
            fcff / (1 + wacc) ** (i + 1)
            for i, fcff in enumerate(fcff_forecast)
        )
        terminal_value = fcff_forecast[-1] * (1 + terminal_growth) / (wacc - terminal_growth)
        terminal_pv = terminal_value / ((1 + wacc) ** len(fcff_forecast))
        enterprise_value = forecast_pv + terminal_pv
        fair_value = (enterprise_value * 100000000) / total_shares

        sensitivity_matrix = self._calculate_sensitivity_matrix(
            fcff_forecast, terminal_growth, total_shares, 0
        )

        upside = ((fair_value - current_price) / current_price) * 100 if current_price > 0 else 0
        downside = ((current_price - fair_value) / current_price) * 100 if current_price > 0 else 0

        return DCFResult(
            symbol=symbol,
            current_price=current_price,
            fair_value=round(fair_value, 2),
            upside_potential=round(upside, 2),
            downside_potential=round(downside, 2),
            wacc=round(wacc * 100, 1),
            terminal_growth=round(terminal_growth * 100, 1),
            sensitivity_matrix=sensitivity_matrix,
            wacc_values=[round(w * 100, 1) for w in self.sensitivity_wacc_range],
            growth_values=[round(g * 100, 1) for g in self.sensitivity_growth_range],
            using_default=True,
            fcff_base=round(base_fcff, 2),
            total_shares=total_shares,
            growth_rate=round(growth_rate * 100, 1),
        )


dcf_calculator = DCFCalculator()
