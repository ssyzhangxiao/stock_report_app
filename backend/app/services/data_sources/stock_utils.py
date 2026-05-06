"""
股票代码工具函数 — 被所有数据源模块共享
"""


def to_sina_symbol(symbol: str) -> str:
    """转为新浪格式: sh600000 / sz000001"""
    if symbol.startswith(('600', '601', '603', '605', '688', '689')):
        return f"sh{symbol}"
    elif symbol.startswith(('000', '001', '002', '003', '300', '301')):
        return f"sz{symbol}"
    elif symbol.startswith(('4', '8')):
        return f"bj{symbol}"
    return f"sh{symbol}"


def to_mootdx_symbol(symbol: str) -> str:
    """转为 mootdx 格式: sh600000 / sz000001"""
    return to_sina_symbol(symbol)


def get_market(symbol: str) -> int:
    """mootdx 市场代码: 1=上海, 0=深圳"""
    if is_sse(symbol):
        return 1
    return 0


def is_sse(symbol: str) -> bool:
    """判断是否上交所股票"""
    return symbol.startswith(('600', '601', '603', '605', '688', '689'))


def is_szse(symbol: str) -> bool:
    """判断是否深交所股票"""
    return symbol.startswith(('000', '001', '002', '003', '300', '301'))
