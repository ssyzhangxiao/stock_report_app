from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
import pandas as pd
from ..services.data_fetcher import DataFetcher
from ..services.indicators import add_technical_indicators, extract_indicators
from ..services.news_analyzer import classify_news

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
fetcher = DataFetcher()


def get_valuation_data(symbol: str, financial_df: pd.DataFrame) -> Dict[str, Any]:
    """估值数据分析"""
    try:
        company_info = fetcher.get_company_info(symbol)
        valuation = {
            'pe_ratio': None,
            'pb_ratio': None,
            'market_cap': company_info.get('总市值'),
            'circulating_market_cap': company_info.get('流通市值')
        }
        
        if not financial_df.empty:
            latest = financial_df.iloc[-1]
            if '市盈率-动态' in latest.index:
                valuation['pe_ratio'] = float(latest['市盈率-动态']) if pd.notna(latest['市盈率-动态']) else None
            if '市净率' in latest.index:
                valuation['pb_ratio'] = float(latest['市净率']) if pd.notna(latest['市净率']) else None
        
        return valuation
    except Exception as e:
        return {'error': str(e)}


def deep_financial_analysis(symbol: str) -> Dict[str, Any]:
    """深度财务分析"""
    try:
        indicators = fetcher.get_financial_indicators(symbol)
        balance_sheet = fetcher.get_balance_sheet(symbol)
        cashflow = fetcher.get_cashflow(symbol)
        
        return {
            'financial_indicators': indicators.tail(5).to_dict(orient='records') if not indicators.empty else [],
            'balance_sheet': balance_sheet.head(3).to_dict(orient='records') if not balance_sheet.empty else [],
            'cashflow': cashflow.head(3).to_dict(orient='records') if not cashflow.empty else [],
        }
    except Exception as e:
        return {'error': str(e)}


@router.get("/stock/{symbol}")
async def full_analysis(symbol: str, years: int = Query(2, ge=1, le=10)):
    """完整股票分析接口"""
    try:
        # 1. 历史行情 + 技术指标
        df = fetcher.get_daily(symbol, years, adjust="qfq")
        if df.empty:
            raise HTTPException(status_code=404, detail="无法获取行情数据")

        df_tech = add_technical_indicators(df)
        latest = df_tech.iloc[-1]

        # 2. 公司信息
        company_info = fetcher.get_company_info(symbol)

        # 3. 财务分析
        financial = fetcher.get_financial_indicators(symbol)
        valuation = get_valuation_data(symbol, financial)
        deep_fin = deep_financial_analysis(symbol)

        # 4. 风险指标
        pledge_ratio = fetcher.get_pledge_ratio(symbol)
        margin = fetcher.get_margin_balance(symbol)
        cyq = fetcher.get_cyq(symbol)
        insider = fetcher.get_insider_holdings(symbol)

        # 5. 新闻与舆情
        news = fetcher.get_news(symbol)
        news_classified = classify_news(news)

        # 6. 分析师评级
        analyst = fetcher.get_analyst_rating(symbol)

        # 7. 资金流向
        fund_flow = fetcher.get_fund_flow(symbol)

        # 8. 组装返回
        return {
            "symbol": symbol,
            "company_info": company_info,
            "latest_price": float(latest['close']),
            "technical": extract_indicators(latest),
            "valuation": valuation,
            "deep_financial": deep_fin,
            "news_analysis": news_classified,
            "analyst_consensus": analyst,
            "risk_indicators": {
                "pledge_ratio": pledge_ratio.to_dict(orient='records') if not pledge_ratio.empty else [],
                "cyq": cyq.tail(10).to_dict(orient='records') if not cyq.empty else [],
                "insider_holdings": insider.to_dict(orient='records') if not insider.empty else [],
                "margin_balance": margin.tail(10).to_dict(orient='records') if not margin.empty else []
            },
            "fund_flow": fund_flow.head(10).to_dict(orient='records') if not fund_flow.empty else [],
            "history": df_tech.tail(120).to_dict(orient='records')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/health")
async def health_check():
    return {"status": "ok"}
