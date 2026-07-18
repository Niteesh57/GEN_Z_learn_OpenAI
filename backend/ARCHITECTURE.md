# KnowledgeForge Backend: Architecture & Techniques

This document outlines the core technical methodologies, design patterns, and AI architectures implemented in the KnowledgeForge backend.

## 1. Asynchronous ASGI Execution
The core server is built on **FastAPI**, fully utilizing Python's `asyncio` event loop. All API endpoints, database queries, and LLM network requests are implemented using `async/await`. This guarantees high throughput and prevents blocking I/O during concurrent generation requests.

## 2. Foundry IQ: Stateful Multi-Agent Orchestration
At the heart of the backend is the **Foundry IQ** semantic router, powered by **LangGraph** and **LangChain**:
*   **Stateful Graph:** A centralized `AgentState` schema tracks the concept, medium, routing decisions, and context.
*   **Format-Aware Routing:** The orchestrator node intercepts the user's concept and dynamically routes the execution flow to the correct specialized agent (e.g., `codebook_agent.py`, `comic_agent.py`, `meme_agent.py`, `game_agent.py`).

## 3. High-Speed Inference (Groq & Llama)
The backend utilizes the **Groq API** to perform lightning-fast inference using Llama architectures (e.g., `meta-llama/llama-4-scout-17b-16e-instruct`). This speed allows the LangGraph state machine to perform multi-step verifications and generation loops in sub-second timelines.

## 4. Multi-Modal Vision Processing
To generate highly accurate narratives for visual mediums (like Memes), the backend integrates **Vision AI**. The meme agent dynamically queries the Groq Vision API, passing the image URL to extract visual descriptions. This visual context is injected directly into the LLM prompt, ensuring the generated story perfectly matches the image.

## 5. Hybrid RAG & Query Cascades
Data structures like the Comic Storyboard Canvases and Meme templates are queried via a **Hybrid RAG approach**:
*   **Azure AI Search / In-Memory Store:** Employs vector lookups combined with exact metadata filtering.
*   **Multi-Tier Cascading Fallbacks:** If a specific constraint (e.g., character + background + pose) fails to find a match, the query engine automatically relaxes constraints iteratively until an asset is found, guaranteeing 100% system availability.

## 6. Robust Structured Outputs (JSON Constraints)
Rather than relying on fragile regex string cleaning, the backend enforces **strict structured output constraints** (JSON mode) coupled with **Pydantic validation schemas**. LLM outputs are processed using resilient partial decoders, ensuring that truncated delimiters or unescaped newlines do not crash the React frontend.

## 7. Zero-RCE Security Sandboxing
To simulate interactive environments like terminals and browser consoles, the backend utilizes an abstract **Data-Renderer Pattern**. The AI does *not* execute code, nor does it return HTML/CSS. It generates abstract, strongly-typed JSON trees representing the safe *expected output state* of a terminal command. This completely eliminates Remote Code Execution (RCE) vectors while providing a fully immersive simulation.

## 8. Warm Indexing & Static Serving
*   **Pre-Warming:** During the FastAPI `@app.on_event("startup")` lifecycle, the backend pre-loads and indexes datasets (memes and canvases) into memory to eliminate runtime lag.
*   **Unified Serving:** Utilizing Starlette's `StaticFiles`, the compiled React production bundle is served directly from the Python memory space, minimizing deployment complexity to a single unified Docker container.
