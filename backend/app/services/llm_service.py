"""
LLM Service - 多供应商 AI 服务层
借鉴 QuantDinger 的 LLMService 架构：
- 多供应商支持 (通义千问/DeepSeek/OpenAI/OpenRouter)
- JSON mode 结构化输出
- 自动故障转移 (provider chain)
- 统一的 prompt 构建
"""
import json
import os
import logging
import requests
from typing import Dict, Any, Optional, List
from enum import Enum
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    QWEN = "qwen"
    DEEPSEEK = "deepseek"
    OPENAI = "openai"
    OPENROUTER = "openrouter"


PROVIDER_CONFIGS = {
    LLMProvider.QWEN: {
        "base_url": "https://dashscope.aliyuncs.com/api/v1",
        "default_model": "qwen-max",
        "fallback_model": "qwen-plus",
        "api_key_env": "DASHSCOPE_API_KEY",
    },
    LLMProvider.DEEPSEEK: {
        "base_url": "https://api.deepseek.com/v1",
        "default_model": "deepseek-chat",
        "fallback_model": "deepseek-chat",
        "api_key_env": "DEEPSEEK_API_KEY",
    },
    LLMProvider.OPENAI: {
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o",
        "fallback_model": "gpt-4o-mini",
        "api_key_env": "OPENAI_API_KEY",
    },
    LLMProvider.OPENROUTER: {
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "openai/gpt-4o",
        "fallback_model": "anthropic/claude-3-haiku",
        "api_key_env": "OPENROUTER_API_KEY",
    },
}


class LLMService:
    """多供应商 LLM 服务 - 支持自动检测、故障转移、JSON mode"""

    def __init__(self, provider_override: str = None):
        self._provider_override = provider_override

    @property
    def provider(self) -> LLMProvider:
        if self._provider_override:
            try:
                return LLMProvider(self._provider_override.lower())
            except ValueError:
                pass

        # 从环境变量读取
        provider_name = os.getenv("LLM_PROVIDER", "").strip().lower()
        if provider_name:
            try:
                return LLMProvider(provider_name)
            except ValueError:
                pass

        # 自动检测：按优先级找第一个有 API Key 的供应商
        priority = [
            LLMProvider.DEEPSEEK,
            LLMProvider.QWEN,
            LLMProvider.OPENAI,
            LLMProvider.OPENROUTER,
        ]
        for p in priority:
            if self._get_api_key(p):
                logger.info(f"[LLMService] 自动检测供应商: {p.value}")
                return p

        logger.warning("[LLMService] 未检测到任何 LLM 供应商配置")
        return LLMProvider.QWEN  # 默认

    def _get_api_key(self, provider: LLMProvider = None) -> str:
        p = provider or self.provider
        env_key = PROVIDER_CONFIGS[p]["api_key_env"]
        return os.getenv(env_key, "").strip()

    def _get_config(self, provider: LLMProvider = None) -> dict:
        p = provider or self.provider
        return PROVIDER_CONFIGS[p]

    def is_available(self, provider: LLMProvider = None) -> bool:
        return bool(self._get_api_key(provider))

    def list_available_providers(self) -> List[Dict[str, Any]]:
        """列出所有可用的供应商"""
        result = []
        for p in LLMProvider:
            cfg = PROVIDER_CONFIGS[p]
            key = os.getenv(cfg["api_key_env"], "").strip()
            result.append({
                "id": p.value,
                "name": p.value.title(),
                "configured": bool(key),
                "default_model": cfg["default_model"],
            })
        return result

    def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = None,
        temperature: float = 0.3,
        use_json_mode: bool = True,
        provider: LLMProvider = None,
        max_tokens: int = 4096,
    ) -> Optional[str]:
        """
        调用 LLM，返回原始文本。
        支持自动故障转移：当前供应商失败后尝试下一个可用供应商。
        """
        p = provider or self.provider
        api_key = self._get_api_key(p)

        if not api_key:
            logger.warning(f"[LLMService] {p.value} 未配置 API Key，尝试其他供应商")
            return self._try_alternative_providers(
                system_prompt, user_prompt, model, temperature, use_json_mode, max_tokens
            )

        cfg = self._get_config(p)
        base_url = cfg["base_url"]
        model_name = model or cfg["default_model"]
        fallback_model = cfg["fallback_model"]

        for attempt_model in [model_name, fallback_model]:
            try:
                if p == LLMProvider.QWEN:
                    return self._call_qwen(
                        api_key, base_url, attempt_model, system_prompt, user_prompt,
                        temperature, use_json_mode, max_tokens
                    )
                else:
                    return self._call_openai_compatible(
                        api_key, base_url, attempt_model, system_prompt, user_prompt,
                        temperature, use_json_mode, max_tokens, p
                    )
            except Exception as e:
                logger.warning(f"[LLMService] {p.value}/{attempt_model} 失败: {e}")
                if attempt_model == fallback_model:
                    # 供应商所有模型都失败了，尝试其他供应商
                    logger.warning(f"[LLMService] {p.value} 全部模型失败，尝试其他供应商")
                    return self._try_alternative_providers(
                        system_prompt, user_prompt, model, temperature, use_json_mode, max_tokens, excluded=p
                    )

        return None

    def _try_alternative_providers(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = None,
        temperature: float = 0.3,
        use_json_mode: bool = True,
        max_tokens: int = 4096,
        excluded: LLMProvider = None,
    ) -> Optional[str]:
        """按优先级链尝试其他供应商"""
        priority = [
            LLMProvider.DEEPSEEK,
            LLMProvider.QWEN,
            LLMProvider.OPENAI,
            LLMProvider.OPENROUTER,
        ]
        for alt in priority:
            if alt == excluded:
                continue
            if self.is_available(alt):
                logger.info(f"[LLMService] 尝试备用供应商: {alt.value}")
                try:
                    return self.call_llm(
                        system_prompt, user_prompt, model, temperature,
                        use_json_mode, provider=alt, max_tokens=max_tokens
                    )
                except Exception as e:
                    logger.warning(f"[LLMService] 备用 {alt.value} 也失败: {e}")
                    continue
        logger.error("[LLMService] 所有供应商均不可用")
        return None

    def call_llm_json(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = None,
        temperature: float = 0.3,
        provider: LLMProvider = None,
        max_tokens: int = 4096,
    ) -> Optional[Dict[str, Any]]:
        """
        调用 LLM 并解析 JSON 输出。
        一次性完成：prompt → LLM → JSON parse → return dict
        """
        text = self.call_llm(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
            temperature=temperature,
            use_json_mode=True,
            provider=provider,
            max_tokens=max_tokens,
        )
        if not text:
            return None

        # 解析 JSON（兼容 markdown fence 包裹）
        return self._parse_json_response(text)

    @staticmethod
    def _parse_json_response(text: str) -> Optional[Dict[str, Any]]:
        """从 LLM 返回文本中提取 JSON"""
        # 去掉 markdown fence
        clean = text.strip()
        if clean.startswith("```"):
            first_nl = clean.find("\n")
            if first_nl != -1:
                clean = clean[first_nl + 1:]
            if clean.endswith("```"):
                clean = clean[:-3]
        clean = clean.strip()

        # 直接解析
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            pass

        # 尝试找到 JSON 子串
        try:
            start = clean.find("{")
            end = clean.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(clean[start:end])
        except (json.JSONDecodeError, ValueError):
            pass

        logger.error(f"[LLMService] JSON 解析失败: {clean[:200]}")
        return None

    def _call_openai_compatible(
        self, api_key: str, base_url: str, model: str,
        system_prompt: str, user_prompt: str,
        temperature: float, use_json_mode: bool, max_tokens: int,
        provider: LLMProvider = None,
    ) -> str:
        """调用 OpenAI 兼容 API (DeepSeek/OpenAI/OpenRouter)"""
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        if provider == LLMProvider.OPENROUTER:
            headers["HTTP-Referer"] = "https://stock-report.app"
            headers["X-Title"] = "Stock Analysis Report"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        data = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if use_json_mode:
            data["response_format"] = {"type": "json_object"}

        logger.info(f"[LLMService] 调用 {provider.value if provider else 'openai-compat'} {model}")
        resp = requests.post(url, headers=headers, json=data, timeout=120)

        if resp.status_code >= 400:
            error_msg = f"API {resp.status_code}"
            try:
                err_data = resp.json()
                err_detail = err_data.get("error", {}).get("message", resp.text[:200])
                error_msg += f": {err_detail}"
            except Exception:
                error_msg += f": {resp.text[:200]}"
            raise ValueError(error_msg)

        result = resp.json()
        choices = result.get("choices", [])
        if not choices:
            raise ValueError("API 返回为空")
        content = choices[0].get("message", {}).get("content", "")
        if not content:
            raise ValueError("API 返回内容为空")
        return content

    def _call_qwen(
        self, api_key: str, base_url: str, model: str,
        system_prompt: str, user_prompt: str,
        temperature: float, use_json_mode: bool, max_tokens: int,
    ) -> str:
        """调用通义千问 API"""
        url = f"{base_url.rstrip('/')}/services/aigc/text-generation/generation"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        payload = {
            "model": model,
            "input": {"messages": messages},
            "parameters": {
                "result_format": "message",
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        }

        logger.info(f"[LLMService] 调用通义千问 {model}")
        resp = requests.post(url, headers=headers, json=payload, timeout=120)

        if resp.status_code >= 400:
            raise ValueError(f"通义千问 API {resp.status_code}: {resp.text[:200]}")

        result = resp.json()
        choices = result.get("output", {}).get("choices", [])
        if not choices:
            raise ValueError("通义千问返回为空")
        content = choices[0].get("message", {}).get("content", "")
        if not content:
            raise ValueError("通义千问返回内容为空")
        return content


# 全局单例
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
