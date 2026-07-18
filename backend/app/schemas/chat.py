from pydantic import BaseModel
from typing import Optional

class GenerateRequest(BaseModel):
    concept: str
    medium: Optional[str] = None
