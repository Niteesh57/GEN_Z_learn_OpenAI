import json
import os
from typing import Dict, Any, List
from langchain_core.prompts import PromptTemplate
from groq import AsyncGroq
from app.config import get_llm
from app.db.meme_db import query_memes
from app.graph.state import AgentState

MEME_PROMPT = """You are Grok, the rebellious, highly intelligent, and extremely sarcastic AI.
Your task is to explain the concept: "{concept}" in the most hilarious, witty, and slightly edgy way possible.

Here are {num_memes} highly relevant memes retrieved from our database:
{memes_context}

Write an engaging, funny, and educational article about "{concept}". 
You must structure your response as a JSON array of "blocks".
Each block can either be a "text" block or a "meme" block.

CRITICAL INSTRUCTIONS FOR MEMES:
1. You MUST NOT drop memes randomly. They must be deeply woven into the narrative.
2. Before displaying a "meme" block, the preceding "text" block MUST smoothly introduce it (e.g., "Here is {concept}... it's exactly like the meme below...").
3. After displaying a "meme" block, the following "text" block MUST refer back to the meme directly to explain the concept (e.g., "Now, notice how the guy in that meme is struggling? That's because...").
4. The context of your text MUST perfectly match the imagery or caption of the meme you are showing.

For "text" blocks, write the explanation/jokes. You can use HTML formatting like <b>, <i>, or <br> for emphasis.
For "meme" blocks, output the exact "url", "image_url", "title", and "image_caption" from the provided memes context.

Format your output EXACTLY as this JSON structure:
{{
    "title": "A funny title for this article",
    "blocks": [
        {{
            "type": "text",
            "content": "So you want to learn about {concept}? Oh boy, sit down and let me tell you a story..."
        }},
        {{
            "type": "meme",
            "title": "[Exact title from context]",
            "image_url": "[Exact image_url from context]",
            "url": "[Exact url from context]",
            "image_caption": "[Exact image_caption from context]"
        }},
        {{
            "type": "text",
            "content": "Because just when you thought you understood it..."
        }}
    ]
}}

Do NOT include any markdown code block ticks (```json). Return ONLY raw JSON.
"""

async def generate_meme_article(state: AgentState) -> Dict[str, Any]:
    concept = state["concept"]
    llm = get_llm()
    
    # Get 3-4 relevant memes
    memes = query_memes(concept, n_results=3)
    
    client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    
    # Format memes for the prompt
    memes_context = ""
    for i, m in enumerate(memes):
        image_url = m.get('image_url', '')
        image_description = ""
        
        if image_url:
            try:
                completion = await client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "What's in this image? Describe it briefly to help generate a story."
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": image_url
                                    }
                                }
                            ]
                        }
                    ],
                    temperature=1,
                    max_completion_tokens=1024,
                    top_p=1,
                    stream=False,
                    stop=None,
                )
                image_description = completion.choices[0].message.content
            except Exception as e:
                print(f"Failed to get image description: {e}")
                
        memes_context += f"Meme {i+1}:\n"
        memes_context += f"Title: {m.get('title')}\n"
        memes_context += f"Image URL: {image_url}\n"
        memes_context += f"URL: {m.get('url')}\n"
        memes_context += f"Caption: {m.get('image_caption', 'N/A')}\n"
        if image_description:
            memes_context += f"Visual Description: {image_description}\n"
        memes_context += f"Context: {' '.join(m.get('content', []))[:300]}...\n\n"
        
    prompt = PromptTemplate.from_template(MEME_PROMPT)
    chain = prompt | llm
    
    result = await chain.ainvoke({
        "concept": concept,
        "num_memes": len(memes),
        "memes_context": memes_context
    })
    
    content = result.content.strip()
    # Strip markdown if present
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        parsed_json = json.loads(content.strip())
    except Exception as e:
        print(f"Failed to parse Meme LLM output: {e}")
        print(f"Raw output: {content}")
        parsed_json = {
            "title": f"The Tragedy of {concept}",
            "blocks": [{"type": "text", "content": "The AI tried to be funny but broke the JSON parser instead."}]
        }
    
    return {
        "content": parsed_json
    }
