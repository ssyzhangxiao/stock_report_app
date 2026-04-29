"""
数据验证工具 - 验证股票代码、输入参数等
"""

import re
from typing import Optional, List
from ..utils.exceptions import ValidationError


class StockValidator:
    """股票数据验证器"""
    
    @staticmethod
    def validate_stock_symbol(symbol: str) -> bool:
        """
        验证股票代码格式
        
        Args:
            symbol: 股票代码，如 '600519', '000001'
            
        Returns:
            bool: 是否有效
        """
        if not symbol or not isinstance(symbol, str):
            return False
        
        # 验证格式：6位数字
        pattern = r'^[0-9]{6}$'
        return bool(re.match(pattern, symbol))
    
    @staticmethod
    def validate_and_clean_symbol(symbol: str) -> str:
        """
        验证并清理股票代码
        
        Args:
            symbol: 股票代码
            
        Returns:
            str: 清理后的股票代码
            
        Raises:
            ValidationError: 如果股票代码无效
        """
        if not symbol:
            raise ValidationError("股票代码不能为空", field="symbol")
        
        # 清理空格
        cleaned_symbol = symbol.strip()
        
        if not StockValidator.validate_stock_symbol(cleaned_symbol):
            raise ValidationError(
                f"股票代码格式无效: {symbol}",
                field="symbol",
                value=symbol
            )
        
        return cleaned_symbol
    
    @staticmethod
    def validate_years_param(years: int) -> int:
        """
        验证年份参数
        
        Args:
            years: 年份数
            
        Returns:
            int: 验证后的年份数
            
        Raises:
            ValidationError: 如果年份参数无效
        """
        if not isinstance(years, int):
            raise ValidationError("年份参数必须是整数", field="years")
        
        if years < 1:
            raise ValidationError("年份参数必须大于0", field="years")
        
        if years > 10:
            raise ValidationError("年份参数不能超过10年", field="years")
        
        return years
    
    @staticmethod
    def validate_date_format(date_str: str, date_format: str = "%Y%m%d") -> bool:
        """
        验证日期格式
        
        Args:
            date_str: 日期字符串
            date_format: 日期格式
            
        Returns:
            bool: 是否有效
        """
        try:
            from datetime import datetime
            datetime.strptime(date_str, date_format)
            return True
        except (ValueError, TypeError):
            return False


class FinancialDataValidator:
    """财务数据验证器"""
    
    @staticmethod
    def validate_financial_dataframe(df, required_columns: Optional[List[str]] = None) -> bool:
        """
        验证财务DataFrame
        
        Args:
            df: pandas DataFrame
            required_columns: 必需的列名列表
            
        Returns:
            bool: 是否有效
        """
        import pandas as pd
        
        if not isinstance(df, pd.DataFrame):
            return False
        
        if df.empty:
            return False
        
        if required_columns:
            for col in required_columns:
                if col not in df.columns:
                    return False
        
        return True
    
    @staticmethod
    def validate_numeric_value(value, field_name: str, min_value: Optional[float] = None, 
                              max_value: Optional[float] = None) -> float:
        """
        验证数值
        
        Args:
            value: 数值
            field_name: 字段名
            min_value: 最小值
            max_value: 最大值
            
        Returns:
            float: 验证后的数值
            
        Raises:
            ValidationError: 如果数值无效
        """
        try:
            numeric_value = float(value)
        except (ValueError, TypeError):
            raise ValidationError(
                f"{field_name} 必须是有效数值",
                field=field_name,
                value=str(value)
            )
        
        if min_value is not None and numeric_value < min_value:
            raise ValidationError(
                f"{field_name} 不能小于 {min_value}",
                field=field_name,
                value=str(value)
            )
        
        if max_value is not None and numeric_value > max_value:
            raise ValidationError(
                f"{field_name} 不能大于 {max_value}",
                field=field_name,
                value=str(value)
            )
        
        return numeric_value


def validate_api_input(symbol: str, years: int = 2) -> dict:
    """
    验证API输入参数
    
    Args:
        symbol: 股票代码
        years: 年份数
        
    Returns:
        dict: 验证后的参数
        
    Raises:
        ValidationError: 如果参数无效
    """
    validator = StockValidator()
    
    # 验证股票代码
    cleaned_symbol = validator.validate_and_clean_symbol(symbol)
    
    # 验证年份参数
    validated_years = validator.validate_years_param(years)
    
    return {
        "symbol": cleaned_symbol,
        "years": validated_years
    }