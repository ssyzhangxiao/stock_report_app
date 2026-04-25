import pandas as pd
import numpy as np


def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """添加技术指标"""
    if df.empty:
        return df
    
    df = df.copy()
    
    # 移动平均线
    df['ma5'] = df['close'].rolling(window=5).mean()
    df['ma10'] = df['close'].rolling(window=10).mean()
    df['ma20'] = df['close'].rolling(window=20).mean()
    df['ma60'] = df['close'].rolling(window=60).mean()
    
    # MACD
    ema_fast = df['close'].ewm(span=12, adjust=False).mean()
    ema_slow = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = ema_fast - ema_slow
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_hist'] = df['macd'] - df['macd_signal']
    
    # RSI
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # 布林带
    df['boll_middle'] = df['close'].rolling(window=20).mean()
    std = df['close'].rolling(window=20).std()
    df['boll_upper'] = df['boll_middle'] + (std * 2)
    df['boll_lower'] = df['boll_middle'] - (std * 2)
    
    return df


def extract_indicators(latest_row: pd.Series) -> dict:
    """提取最新技术指标"""
    indicators = {
        'close': float(latest_row.get('close', 0)),
        'pct_chg': float(latest_row.get('pct_chg', 0)),
        'turnover': float(latest_row.get('turnover', 0)),
        'volume': float(latest_row.get('volume', 0)),
        'amount': float(latest_row.get('amount', 0)),
    }
    
    for col in ['ma5', 'ma20', 'ma60', 'macd', 'rsi', 'boll_upper', 'boll_lower']:
        if col in latest_row.index and pd.notna(latest_row[col]):
            indicators[col] = float(latest_row[col])
    
    return indicators
