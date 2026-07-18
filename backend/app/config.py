import os
from langchain_groq import ChatGroq

def get_llm(temperature: float = 0.7, max_tokens: int = 8192):
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set. Check your .env file.")
    return ChatGroq(
        temperature=temperature,
        model_name="openai/gpt-oss-20b",
        groq_api_key=groq_api_key,
        max_tokens=max_tokens
    )
