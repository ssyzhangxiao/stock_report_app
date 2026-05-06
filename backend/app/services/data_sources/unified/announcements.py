"""
公告 + 资本运作层 — 覆盖
  11.事件驱动(公告) + 资本运作(分红/回购/增减持/质押)

数据源: 巨潮cninfo (爬虫) + akshare (多源聚合)
"""

import logging
from typing import Dict, Any, Optional, List

import pandas as pd

from ..stock_utils import is_szse
from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class AnnouncementProvider:

    def __init__(self):
        self._rate_limiter = RateLimiter(min_interval=1.0, max_per_minute=10)
        self._slow_limiter = RateLimiter(min_interval=1.0, max_per_minute=10)

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_cninfo_announcements(self, symbol: str, limit: int = 20) -> Optional[List[Dict]]:
        try:
            import requests
            self._rate_limiter.wait()
            market = 'sz' if is_szse(symbol) else 'sh'
            org_id = f"gssz{symbol}" if market == 'sz' else f"gssh{symbol}"
            url = "http://www.cninfo.com.cn/new/hisAnnouncement/query"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "http://www.cninfo.com.cn/",
            }
            params = {
                "pageNum": 1, "pageSize": limit,
                "column": market, "tabName": "fulltext",
                "plate": "", "stock": f"{symbol},{org_id}",
                "searchkey": "", "secid": "", "category": "",
                "trade": "", "seDate": "",
            }
            resp = requests.post(url, data=params, headers=headers, timeout=15)
            if resp.status_code != 200:
                return None
            data = resp.json()
            if not data or not isinstance(data, dict):
                return None
            announcements = []
            for item in (data.get("announcements") or [])[:limit]:
                if not item:
                    continue
                announcements.append({
                    "id": str(item.get("id", "")),
                    "title": str(item.get("announcementTitle", "")),
                    "date": str(item.get("announcementTime", ""))[:10],
                    "url": f"http://www.cninfo.com.cn/{item.get('adjunctUrl', '')}",
                    "type": "cninfo",
                })
            return announcements
        except Exception as e:
            logger.warning(f"[公告] 巨潮cninfo失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_akshare_notices(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_notice_report(symbol=symbol)
            if df is None or df.empty:
                return None
            notices = []
            for _, row in df.head(15).iterrows():
                notices.append({
                    "title": str(row.get('公告标题', row.get('title', ''))),
                    "date": str(row.get('公告日期', row.get('date', ''))),
                    "url": str(row.get('网址', row.get('url', ''))),
                    "type": "akshare_notice",
                })
            return notices
        except Exception as e:
            logger.warning(f"[公告] akshare公告失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_dividend_detail(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_history_dividend_detail(symbol=symbol)
            if df is None or df.empty:
                return None
            items = []
            for _, row in df.head(20).iterrows():
                dividend_val = row.get('派息', 0)
                bonus_val = row.get('送股', 0)
                transfer_val = row.get('转增', 0)
                progress = str(row.get('进度', ''))
                ex_date = row.get('除权除息日', '')
                record_date = row.get('股权登记日', '')
                items.append({
                    "announcement_date": str(row.get('公告日期', '')),
                    "issue_type": "分红" if bonus_val == 0 and transfer_val == 0 else "送转分红",
                    "start_date": str(ex_date) if pd.notna(ex_date) else '',
                    "net_raised": f"每股派息{float(dividend_val):.2f}元" if pd.notna(dividend_val) and float(dividend_val) > 0 else '-',
                    "remaining_end_date": str(record_date) if pd.notna(record_date) else '',
                    "remaining": '-',
                    "utilization_rate": '100%' if progress == '实施' else progress,
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 历史分红详情失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_fhps_em(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            df = ak.stock_fhps_em()
            if df is None or df.empty:
                return None
            code_col = '代码' if '代码' in df.columns else 'code'
            filtered = df[df[code_col].astype(str) == symbol]
            if filtered.empty:
                return None
            items = []
            for _, row in filtered.head(10).iterrows():
                cash_div = row.get('现金分红-现金分红比例', '')
                stock_div = row.get('送转股份-送转总比例', '')
                progress = str(row.get('方案进度', ''))
                ex_date = row.get('除权除息日', '')
                announce_date = row.get('预案公告日', row.get('最新公告日期', ''))
                issue_type = "分红"
                if pd.notna(stock_div) and stock_div and float(stock_div) > 0:
                    issue_type = "送转分红"
                items.append({
                    "announcement_date": str(announce_date) if pd.notna(announce_date) else '',
                    "issue_type": issue_type,
                    "start_date": str(ex_date) if pd.notna(ex_date) else '',
                    "net_raised": f"每股{float(cash_div):.2f}元" if pd.notna(cash_div) and cash_div else '-',
                    "remaining_end_date": '',
                    "remaining": '-',
                    "utilization_rate": '100%' if '实施' in progress else progress,
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 分红配送全表失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_shareholder_change(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_shareholder_change_ths(symbol=symbol)
            if df is None or df.empty:
                return None
            items = []
            for _, row in df.head(20).iterrows():
                change_num = row.get('变动数量', 0)
                avg_price = row.get('交易均价', 0)
                remaining = row.get('剩余股份总数', 0)
                period = row.get('变动期间', '')
                items.append({
                    "announcement_date": str(row.get('公告日期', '')),
                    "shareholder": str(row.get('变动股东', '')),
                    "change_number": str(change_num) if pd.notna(change_num) else '-',
                    "avg_price": str(avg_price) if pd.notna(avg_price) else '-',
                    "remaining_shares": str(remaining) if pd.notna(remaining) else '-',
                    "change_period": str(period) if pd.notna(period) else '-',
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 股东增减持失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_fund_holders(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_fund_stock_holder(symbol=symbol)
            if df is None or df.empty:
                return None
            items = []
            for _, row in df.head(20).iterrows():
                hold_num = row.get('持仓数量', 0)
                hold_ratio = row.get('占流通股比例', 0)
                hold_value = row.get('持股市值', 0)
                net_ratio = row.get('占净值比例', 0)
                items.append({
                    "fund_name": str(row.get('基金名称', '')),
                    "fund_code": str(row.get('基金代码', '')),
                    "hold_number": str(hold_num) if pd.notna(hold_num) else '-',
                    "hold_ratio": f"{float(hold_ratio):.2f}%" if pd.notna(hold_ratio) and hold_ratio else '-',
                    "hold_value": str(hold_value) if pd.notna(hold_value) else '-',
                    "net_ratio": f"{float(net_ratio):.2f}%" if pd.notna(net_ratio) and net_ratio else '-',
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 基金持股失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_repurchase(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            df = ak.stock_repurchase_em()
            if df is None or df.empty:
                return None
            code_col = '股票代码' if '股票代码' in df.columns else 'code'
            filtered = df[df[code_col].astype(str) == symbol]
            if filtered.empty:
                return None
            items = []
            for _, row in filtered.head(10).iterrows():
                items.append({
                    "announcement_date": str(row.get('最新公告日期', '')),
                    "project_name": f"{row.get('股票简称', '')}回购计划",
                    "promised_funds": str(row.get('计划回购金额区间-下限', '-')) if pd.notna(row.get('计划回购金额区间-下限')) else '-',
                    "invested_funds": str(row.get('已回购金额', '-')) if pd.notna(row.get('已回购金额')) else '-',
                    "construction_period": '-',
                    "after_tax_return": '-',
                    "predicted_net_profit": '-',
                    "project_desc": f"回购价格区间: {row.get('计划回购价格区间', '-')}, 实施进度: {row.get('实施进度', '-')}",
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 回购数据失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_inner_trade(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            df = ak.stock_inner_trade_xq()
            if df is None or df.empty:
                return None
            code_col = '股票代码' if '股票代码' in df.columns else 'code'
            filtered = df[df[code_col].astype(str) == symbol]
            if filtered.empty:
                return None
            items = []
            for _, row in filtered.head(20).iterrows():
                change_num = row.get('变动股数', 0)
                avg_price = row.get('成交均价', 0)
                amount = float(change_num) * float(avg_price) if pd.notna(change_num) and pd.notna(avg_price) and change_num and avg_price else 0
                items.append({
                    "announcement_date": str(row.get('变动日期', '')),
                    "transaction_amount": f"{amount:.2f}" if amount else '-',
                    "payment_method": '证券交易',
                    "counterparty": str(row.get('变动人', '')),
                    "transaction_type": '内部人交易',
                    "related_relation": str(row.get('与董监高关系', '')) + ' / ' + str(row.get('董监高职务', '')),
                    "description": f"变动{change_num}股, 均价{avg_price}元, 变动后持股{row.get('变动后持股数', '-')}",
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 内部人交易失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_pledge_detail(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            df = ak.stock_gpzy_pledge_ratio_detail_em()
            if df is None or df.empty:
                return None
            code_col = '股票代码' if '股票代码' in df.columns else 'code'
            filtered = df[df[code_col].astype(str) == symbol]
            if filtered.empty:
                return None
            items = []
            for _, row in filtered.head(10).iterrows():
                hold_ratio = row.get('占所持股份比例', 0)
                total_ratio = row.get('占总股本比例', 0)
                items.append({
                    "announcement_date": str(row.get('公告日期', '')),
                    "transaction_amount": '-',
                    "transfer_ratio": f"{float(total_ratio):.2f}%" if pd.notna(total_ratio) and total_ratio else '-',
                    "transferor": str(row.get('股东名称', '')),
                    "target": f"{row.get('股票简称', '')}股份质押",
                    "transferee": str(row.get('质押机构', '')),
                    "overview": f"质押{row.get('质押股份数量', '-')}股, 占所持股份{hold_ratio}%, 质押开始日期{row.get('质押开始日期', '-')}",
                    "impact": '-',
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 质押明细失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_profit_forecast(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_profit_forecast_ths(symbol=symbol)
            if df is None or df.empty:
                return None
            items = []
            for _, row in df.iterrows():
                avg_eps = row.get('均值', 0)
                org_count = row.get('预测机构数', 0)
                items.append({
                    "year": str(row.get('年度', '')),
                    "avg_eps": float(avg_eps) if pd.notna(avg_eps) else None,
                    "org_count": int(org_count) if pd.notna(org_count) else None,
                    "min_eps": float(row.get('最小值', 0)) if pd.notna(row.get('最小值')) else None,
                    "max_eps": float(row.get('最大值', 0)) if pd.notna(row.get('最大值')) else None,
                    "industry_avg": float(row.get('行业平均数', 0)) if pd.notna(row.get('行业平均数')) else None,
                })
            return items
        except Exception as e:
            logger.warning(f"[资本运作] 盈利预测失败: {e}")
            return None

    def get_announcements(self, symbol: str) -> DataResult:
        result = {"announcements": [], "notices": []}
        try:
            announcements = self._get_cninfo_announcements(symbol)
            if announcements:
                result["announcements"] = announcements
        except Exception as e:
            logger.warning(f"[公告] 巨潮异常: {e}")
        try:
            notices = self._get_akshare_notices(symbol)
            if notices:
                result["notices"] = notices
        except Exception as e:
            logger.warning(f"[公告] akshare异常: {e}")
        total = len(result["announcements"]) + len(result["notices"])
        status = SourceStatus.OK if total > 0 else SourceStatus.DEGRADED
        return DataResult(
            success=total > 0, data=result, source="cninfo+akshare",
            status=status, metadata={"total": total},
        )

    def get_capital_operation(self, symbol: str) -> DataResult:
        result = {
            "fund_raising": [],
            "project_investment": [],
            "acquisition": [],
            "equity_investment": [],
            "equity_transfer": [],
            "related_transactions": [],
            "company_info": None,
            "profit_forecast": [],
        }

        dividend_detail = None
        fhps_data = None
        shareholder_change = None
        fund_holders = None
        repurchase = None
        inner_trade = None
        pledge_detail = None
        profit_forecast = None

        for name, method in [
            ("dividend_detail", self._get_dividend_detail),
            ("fhps_data", self._get_fhps_em),
            ("shareholder_change", self._get_shareholder_change),
            ("fund_holders", self._get_fund_holders),
            ("repurchase", self._get_repurchase),
            ("inner_trade", self._get_inner_trade),
            ("pledge_detail", self._get_pledge_detail),
            ("profit_forecast", self._get_profit_forecast),
        ]:
            try:
                locals()[name] = method(symbol)
            except Exception as e:
                logger.warning(f"[资本运作] {name}异常: {e}")

        if dividend_detail:
            result["fund_raising"].extend(dividend_detail)
        if fhps_data:
            existing_dates = {item["announcement_date"] for item in result["fund_raising"]}
            for item in fhps_data:
                if item["announcement_date"] not in existing_dates:
                    result["fund_raising"].append(item)

        if repurchase:
            result["project_investment"].extend(repurchase)
        if profit_forecast:
            result["profit_forecast"] = profit_forecast

        if shareholder_change:
            for item in shareholder_change:
                change_num = item.get("change_number", "0")
                try:
                    num = float(str(change_num).replace(',', '').replace('-', '0'))
                except (ValueError, TypeError):
                    num = 0
                if num > 0:
                    result["acquisition"].append({
                        "year": item["announcement_date"][:4] if item["announcement_date"] else '',
                        "announcement_date": item["announcement_date"],
                        "transaction_amount": '-',
                        "progress": '完成',
                        "target": f"{item['shareholder']}增持",
                        "buyer": item["shareholder"],
                        "seller": '-',
                        "overview": f"增持{change_num}股, 均价{item['avg_price']}元, 变动期间{item['change_period']}",
                    })
                else:
                    result["equity_transfer"].append({
                        "year": item["announcement_date"][:4] if item["announcement_date"] else '',
                        "announcement_date": item["announcement_date"],
                        "transaction_amount": '-',
                        "transfer_ratio": '-',
                        "transferor": item["shareholder"],
                        "target": f"{item['shareholder']}减持",
                        "transferee": '-',
                        "overview": f"减持{abs(num)}股, 均价{item['avg_price']}元, 变动期间{item['change_period']}",
                        "impact": '-',
                    })

        if fund_holders:
            result["equity_investment"].extend(fund_holders)

        if inner_trade:
            result["related_transactions"].extend(inner_trade)

        if pledge_detail:
            for item in pledge_detail:
                result["equity_transfer"].append(item)

        has_data = any([
            result["fund_raising"], result["project_investment"],
            result["acquisition"], result["equity_investment"],
            result["equity_transfer"], result["related_transactions"],
        ])
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="akshare_multi",
            status=status,
            metadata={
                "fund_raising_count": len(result["fund_raising"]),
                "project_investment_count": len(result["project_investment"]),
                "acquisition_count": len(result["acquisition"]),
                "equity_investment_count": len(result["equity_investment"]),
                "equity_transfer_count": len(result["equity_transfer"]),
                "related_transactions_count": len(result["related_transactions"]),
            },
        )
