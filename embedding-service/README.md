# Local Embedding Service

Fast, cost-effective embedding generation using sentence-transformers.

## Features

- **Cost-effective**: No API costs, runs locally
- **Fast**: ~1000 embeddings/second on CPU
- **Scalable**: Constant RAM usage regardless of users
- **Quality**: Good semantic understanding with all-MiniLM-L6-v2

## Resource Requirements

- **RAM**: ~500 MB - 1 GB
- **CPU**: Any modern CPU (GPU optional for faster processing)
- **Storage**: ~100 MB for model

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

Service will be available at `http://localhost:8001`

### Docker

```bash
# Build image
docker build -t projecthub-embeddings .

# Run container
docker run -p 8001:8001 projecthub-embeddings
```

### Docker Compose (with main app)

Add to your `docker-compose.yml`:

```yaml
embedding-service:
  build: ./embedding-service
  ports:
    - "8001:8001"
  environment:
    - LOG_LEVEL=INFO
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

## API Usage

### Generate Embeddings

```bash
curl -X POST http://localhost:8001/embed \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Machine learning project", "Web development"],
    "normalize": true
  }'
```

Response:
```json
{
  "embeddings": [[0.123, -0.456, ...], [0.789, -0.012, ...]],
  "model": "all-MiniLM-L6-v2",
  "dimensions": 384
}
```

### Health Check

```bash
curl http://localhost:8001/health
```

## Integration with NestJS

Update your `.env`:
```
LOCAL_EMBEDDING_SERVICE_URL=http://localhost:8001
USE_LOCAL_EMBEDDINGS=true
```

The backend will automatically use the local service when available.

## Performance

- **Batch size**: Up to 100 texts per request
- **Speed**: ~1000 embeddings/second (CPU)
- **Latency**: <100ms for typical requests

## Cost Comparison

| Approach | 1,000 users | 10,000 users |
|----------|-------------|--------------|
| HuggingFace API | $50-100/mo | $500-1000/mo |
| Local Service | $5-10/mo | $10-15/mo |

**Savings: 10-50x cheaper!**
