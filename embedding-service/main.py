"""
Local Embedding Service
Fast, cost-effective embedding generation using sentence-transformers
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List, Optional
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ProjectHub Embedding Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model on startup (stays in memory)
model: Optional[SentenceTransformer] = None
MODEL_NAME = "all-MiniLM-L6-v2"  # 384 dimensions, fast, good quality

@app.on_event("startup")
async def load_model():
    """Load the embedding model into memory"""
    global model
    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        model = SentenceTransformer(MODEL_NAME)
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

class EmbeddingRequest(BaseModel):
    texts: List[str]
    normalize: bool = True

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimensions: int

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "model_loaded": model is not None
    }

@app.post("/embed", response_model=EmbeddingResponse)
async def generate_embeddings(request: EmbeddingRequest):
    """
    Generate embeddings for a list of texts
    
    Args:
        texts: List of strings to embed
        normalize: Whether to normalize embeddings (recommended for similarity)
    
    Returns:
        embeddings: List of embedding vectors
        model: Model name used
        dimensions: Embedding dimensions
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")
    
    if len(request.texts) > 100:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 100 texts per request"
        )
    
    try:
        # Generate embeddings
        embeddings = model.encode(
            request.texts,
            normalize_embeddings=request.normalize,
            show_progress_bar=False
        )
        
        # Convert to list for JSON serialization
        embeddings_list = embeddings.tolist()
        
        logger.info(f"Generated {len(embeddings_list)} embeddings")
        
        return EmbeddingResponse(
            embeddings=embeddings_list,
            model=MODEL_NAME,
            dimensions=len(embeddings_list[0]) if embeddings_list else 0
        )
    
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "ProjectHub Embedding Service",
        "model": MODEL_NAME,
        "dimensions": 384,
        "endpoints": {
            "health": "/health",
            "embed": "/embed (POST)",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
