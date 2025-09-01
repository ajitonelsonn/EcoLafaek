# EcoLafaek API

<!-- Logo Pairing -->
<p align="center">
  <img src="image/app_logo.png" alt="EcoLafaek Logo" width="120" style="margin-right: 20px;" />
  <span style="font-size: 36px; font-weight: bold; margin: 0 20px;">
</p>

<!-- Technology Stack Badges -->
<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Amazon_Nova_Pro-FF9900?style=for-the-badge&logo=amazonwebservices" alt="Amazon Nova Pro" />
  <img src="https://img.shields.io/badge/Titan_Embed_Image-FF9900?style=for-the-badge&logo=amazonwebservices" alt="Titan Embed Image" />
  <img src="https://img.shields.io/badge/Python-3,8+-blue?style=for-the-badge&logo=python" alt="Python 3.8+" />
  <img src="https://img.shields.io/badge/TiDB_Vector-FF6B35?style=for-the-badge&logo=tidb" alt="TiDB Vector" />
  <img src="https://img.shields.io/badge/AWS_S3-569A31?style=for-the-badge&logo=amazons3" alt="AWS S3" />
</p>

## 🌱 Project Overview

This is a powerful backend service for an environmental waste monitoring system in Timor-Leste. Named after the crocodile ("Lafaek") which is considered sacred in Timorese culture, this project aims to protect the natural environment through community-driven waste reporting and AI-powered analysis using Amazon Nova Pro.

**Live API Documentation:** [https://ecolafaek.com/docs](https://ecolafaek.com/docs)  
**Public Dashboard:** [https://www.ecolafaek.xyz/](https://www.ecolafaek.xyz/)  
**Mobile App Download:** [https://www.ecolafaek.xyz/download](https://www.ecolafaek.xyz/download)

This repository is part of a larger ecosystem:

1. [EcoLafaek](https://github.com/ajitonelsonn/EcoLafaek) - Project overview
2. [EcoLafaek_Mobile_Backend](https://github.com/ajitonelsonn/mobile_backend) - API backend (this repo)
3. [EcoLafaek_Mobileapp](https://github.com/ajitonelsonn/EcoLafaek_Mobileapp) - Flutter mobile app
4. [Ecolafaek_webpublic](https://github.com/ajitonelsonn/Ecolafaek_webpublic) - Next.js public dashboard

## 🤖 AI-Powered Environmental Monitoring

EcoLafaek demonstrates the transformative potential of Amazon Nova Pro for environmental monitoring and civic engagement in developing regions.

**Experience our complete ecosystem:**

- **API Documentation:** [https://ecolafaek.com/docs](https://ecolafaek.com/docs)
- **Public Dashboard:** [https://www.ecolafaek.xyz/](https://www.ecolafaek.xyz/)
- **Mobile App:** [https://www.ecolafaek.xyz/download](https://www.ecolafaek.xyz/download)

**Test Credentials for Judges:**

```
Username: usertest
Password: 1234abcd
```

## 🧠 Amazon Nova Pro Implementation

### How We Use Amazon Nova Pro

The core intelligence of EcoLafaek is powered by Amazon Nova Pro, which provides sophisticated multimodal analysis for waste images. Our implementation uses a comprehensive analysis approach:

#### Waste Detection with Nova Pro

We use **Amazon Nova Pro** to perform comprehensive analysis of images:

```python
payload = {
    "model": "amazon.nova-pro-v1:0",
    "messages": messages,
    "temperature": 0.1,
}
```

Nova Pro provides comprehensive analysis including:

- Waste type classification (Plastic, Metal, Paper, Organic, etc.)
- Severity assessment (1-10 scale)
- Priority level (low, medium, high, critical)
- Environmental impact evaluation
- Volume estimation
- Safety concern identification
- Detailed analysis notes and recommendations

### Resilient Processing Implementation

Our implementation includes a sophisticated retry mechanism to ensure robustness:

```python
max_attempts = 3  # Maximum number of retry attempts
current_attempt = 0

while current_attempt < max_attempts:
    try:
        current_attempt += 1
        logger.info(f"Attempt {current_attempt} - Analyzing image from: {image_url}")

        # Analysis code here...

    except Exception as e:
        logger.error(f"Error in analysis (Attempt {current_attempt}/{max_attempts}): {e}")
        if current_attempt < max_attempts:
            logger.info(f"Retrying... ({current_attempt}/{max_attempts})")
            time.sleep(2)  # Add a short delay before retrying
            continue
        return None
```

This approach ensures:

- Multiple attempts for API calls in case of temporary failures
- Proper error logging for debugging
- Fallback options when parsing fails
- Graceful degradation of service

## 🔍 Vector Search & Semantic Similarity

### Amazon Titan Embed Image v1 Integration

EcoLafaek implements advanced vector search capabilities using **Amazon Titan Embed Image v1** model for both image and text embeddings. This enables powerful semantic similarity matching and intelligent pattern recognition.

#### Multimodal Embeddings

We use Titan Embed Image v1 for creating embeddings from:

1. **Image Content**: Visual analysis results from Nova Pro converted to text descriptions
2. **Location Context**: Geographic coordinates enhanced with regional information
3. **Combined Features**: Semantic understanding of waste patterns and environmental context

```python
def invoke_titan_embed_text(text: str) -> Optional[List[float]]:
    """Create embedding for text using Amazon Titan Embed Image (multimodal)"""
    payload = {
        "inputText": text,
        "embeddingConfig": {
            "outputEmbeddingLength": 1024
        }
    }
    
    response = requests.post(
        f"{BEDROCK_ENDPOINT}/model/amazon.titan-embed-image-v1/invoke",
        headers=headers,
        json=payload,
        timeout=30
    )
    return response.json().get('embedding', [])
```

#### TiDB Vector Storage

All embeddings are stored in TiDB using VECTOR(1024) columns:

```sql
CREATE TABLE analysis_results (
    -- ... other columns ...
    image_embedding VECTOR(1024),     -- Content-based embeddings
    location_embedding VECTOR(1024),  -- Location-based embeddings
    -- ... other columns ...
);
```

### Vector Search Capabilities

#### 1. Semantic Search API

Find reports based on natural language descriptions:

```bash
curl -X GET "https://ecolafaek.com/api/vector-search/semantic?query=plastic bottles near water&limit=10" \
  -H "Authorization: Bearer your_token_here"
```

Example implementation:

```python
@app.get("/api/vector-search/semantic")
async def semantic_search_reports(
    query: str,
    limit: int = 10,
    user_id: int = Depends(get_current_user_id)
):
    # Create embedding for search query
    query_embedding = invoke_titan_embed_text(query)
    
    # Search using cosine similarity
    cursor.execute("""
        SELECT r.*, ar.*, 
               VEC_COSINE_DISTANCE(ar.image_embedding, %s) as similarity_score
        FROM reports r
        JOIN analysis_results ar ON r.report_id = ar.report_id
        WHERE ar.image_embedding IS NOT NULL
        ORDER BY similarity_score ASC
        LIMIT %s
    """, [json.dumps(query_embedding), limit])
    
    return {"results": cursor.fetchall()}
```

#### 2. Similar Reports API

Find visually and contextually similar waste reports:

```bash
curl -X GET "https://ecolafaek.com/api/vector-search/similar/123?limit=5" \
  -H "Authorization: Bearer your_token_here"
```

#### 3. Location-Based Patterns API

Discover waste patterns in specific geographic areas:

```bash
curl -X GET "https://ecolafaek.com/api/vector-search/location-patterns?lat=-8.55&lon=125.58&radius=1000&limit=10" \
  -H "Authorization: Bearer your_token_here"
```

### Advanced Vector Features

#### Location-Enhanced Embeddings

We create rich location embeddings that include:

```python
def create_location_embedding(latitude: float, longitude: float) -> List[float]:
    location_text = f"latitude {latitude:.6f} longitude {longitude:.6f}"
    
    # Add Timor-Leste geographic context
    if -8.3 <= latitude <= -8.1 and 125.5 <= longitude <= 125.7:
        location_text += " Dili capital city urban area high population density"
    elif -8.5 <= latitude <= -8.0 and 125.0 <= longitude <= 127.0:
        location_text += " northern Timor-Leste coastal region moderate population"
    elif latitude < -8.5:
        location_text += " southern Timor-Leste mountainous rural area"
    
    return invoke_titan_embed_text(location_text)
```

#### Content-Based Embeddings

Image analysis results are converted to rich text descriptions for embedding:

```python
def create_image_content_embedding(analysis_result: dict) -> List[float]:
    content_parts = [
        f"Waste type: {analysis_result.get('waste_type', 'unknown')}",
        f"Severity level {analysis_result.get('severity_score', 1)} out of 10",
        f"Priority: {analysis_result.get('priority_level', 'low')}",
        f"Environmental impact: {analysis_result.get('environmental_impact', '')}",
        f"Safety concerns: {analysis_result.get('safety_concerns', '')}",
        f"Volume: {analysis_result.get('estimated_volume', '0')} cubic meters",
        f"Description: {analysis_result.get('analysis_notes', '')}"
    ]
    
    content_text = " ".join([part for part in content_parts if part.split(': ')[1]])
    return invoke_titan_embed_text(content_text)
```

### Vector Search Benefits

1. **Pattern Recognition**: Identify similar waste accumulation patterns across different locations
2. **Hotspot Prediction**: Use semantic similarity to predict potential problem areas
3. **Resource Optimization**: Find clusters of similar waste types for efficient cleanup routing
4. **Community Insights**: Understand waste composition trends through semantic analysis
5. **Automated Categorization**: Group reports automatically based on content similarity

### Performance Optimizations

- **Parallel Processing**: Embeddings generated concurrently with Nova Pro analysis
- **Caching Strategy**: Frequently accessed embeddings cached for faster retrieval
- **Index Optimization**: TiDB vector indexes for sub-second search performance
- **Batch Processing**: Multiple similarity calculations in single database queries

### Actual Analysis Example

```
Processing report 240001 with image URL: [...].jpg
Attempt 1 - Analyzing image from: [...].jpg
Successfully downloaded image: Type=image/jpeg, Size=209610 bytes
Converted image to base64 format (length: 279480 chars)
Sending multimodal request with image to Nova Pro API
Received response from Nova Pro API: Status=200
Detailed analysis attempt 1 for image containing waste
Sending multimodal request for detailed analysis to Nova Pro
Received detailed response from Nova Pro API: Status=200
Nova Pro analysis complete:
{
    'waste_type': 'Mixed (predominantly Plastic)',
    'severity_score': 8,
    'priority_level': 'high',
    'environmental_impact': 'Significant risk of plastic pollution contaminating soil and potentially entering nearby water systems. Most visible waste consists of non-biodegradable plastics that can persist in the environment for decades, threatening ecosystems and wildlife.',
    'estimated_volume': 7.5,
    'safety_concerns': 'Breeding ground for disease vectors (rodents, insects), potential leachate formation following rainfall, physical hazard to pedestrians, possible blockage of drainage systems',
    'analysis_notes': 'The scene shows mismanaged waste that has overflowed from designated collection containers. Immediate waste removal and improved waste management practices are urgently needed. Consider implementing separated collection bins, increasing collection frequency, and conducting community education on proper waste disposal to prevent recurrence.',
    'full_description': 'The image displays a severe case of mismanaged municipal solid waste with primarily plastic materials (bottles, wrappers, containers) and paper/cardboard items spilling outside designated green dumpsters. The waste has accumulated in a significant pile across a wide area, creating both environmental hazards and community health risks in what appears to be an urban setting with nearby buildings.',
    'waste_detection_confidence': 100,
    'short_description': 'Overflowing garbage around waste containers'
}
```

### Nova Pro Prompting Strategy

Our prompts are carefully engineered for consistent, structured responses:

1. **Context-Rich Instructions**: We provide detailed context about environmental waste classification
2. **Clear Classification Criteria**: We define what should and should not be classified as waste
3. **Structured Output Format**: We specify the exact JSON structure for responses
4. **Evaluation Guidelines**: We include specific factors to consider for severity and priority
5. **Rubric-Based Assessment**: We use numerical scales (1-10) for quantifiable metrics

Example prompt structure:

```python
initial_prompt = """
Carefully examine this image and determine if it shows improper waste disposal, garbage, trash, or discarded materials in the environment.

Only classify as waste/garbage if:
1. The items are clearly disposed of improperly in an outdoor environment (on streets, in water bodies, forests, etc.)
2. The items are trash/waste accumulated in trash cans, landfills, or garbage dumps
3. The items are clearly abandoned, broken, or dumped illegally

Do NOT classify as waste/garbage if:
1. The items are in normal use in their intended environment (e.g., electronics on a desk)
2. The items appear to be organized, clean, and in use
3. The items are products being displayed or used normally
4. The image shows an indoor setting with normal household/office items
5. The items are properly stored or displayed

Return your answer as a JSON object with the following structure:
{
  "contains_waste": true/false,
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "short_description": "concise description (max 8 words)",
  "full_description": "detailed description of what you see in the image (2-3 sentences)"
}
"""
```

## 🚀 Key Features

- **FastAPI Backend**: High-performance, easy-to-use, and built for production
- **Amazon Nova Pro Integration**: Advanced multimodal AI for waste image analysis
- **Titan Vector Embeddings**: Amazon Titan Embed Image v1 for semantic search and similarity matching
- **TiDB Vector Search**: Advanced vector storage and search capabilities with 1024-dimensional embeddings
- **Semantic Search**: Find similar waste patterns and locations using AI-powered embeddings
- **Secure Authentication**: JWT-based auth with email verification
- **Comprehensive Reporting**: End-to-end waste report lifecycle management
- **Hotspot Detection**: Automatic identification of waste problem areas
- **AWS S3 Integration**: Scalable image storage solution
- **Detailed Analytics**: Community and personal waste contribution statistics

## 🔝 Advantages of Amazon Nova Pro

Amazon Nova Pro offers several advantages for our environmental monitoring application:

1. **Superior Multimodal Understanding**: Nova Pro accurately distinguishes between garbage/waste and regular objects, reducing false positives
2. **Context-Aware Analysis**: Understands environmental context (proximity to water, public spaces, hazards)
3. **Nuanced Classification**: More granular waste type identification and severity assessment
4. **Structured Outputs**: Returns well-formatted JSON objects that integrate seamlessly with our database
5. **Enterprise-Grade Processing**: AWS-powered infrastructure ensures reliability and scalability
6. **Fast Response Times**: Low latency suitable for mobile app integration
7. **Robust Error Handling**: Reliable performance even with varied image quality

## 📱 Application Workflow

## 🏭 Environmental Impact Classification

Amazon Nova Pro helps us classify waste into priority levels:

- **Critical** - Immediate hazard, harmful chemicals/materials
- **High** - Significant waste accumulation, potential contamination
- **Medium** - Moderate waste requiring attention
- **Low** - Minor waste issues with limited impact

Each report includes:

- Severity score (1-10)
- Detailed environmental impact assessment
- Safety concerns
- Estimated volume
- Analysis notes with recommended actions

## 🌍 Real-World Impact

EcoLafaek addresses critical waste management challenges in Timor-Leste:

1. **Limited Municipal Resources**: AI-powered prioritization helps focus cleanup efforts
2. **Civic Engagement**: Community participation through accessible mobile reporting
3. **Data-Driven Policy**: Aggregated statistics inform government decisions
4. **Environmental Protection**: Early identification of hazardous waste
5. **Public Health**: Identification of disease vector breeding grounds
6. **Education**: Raising awareness through accessible information

## 🔧 Technical Implementation

Our backend system is built with:

1. **FastAPI** with asynchronous support for high performance
2. **TiDB Vector Database** for structured data storage and vector search
3. **Amazon Titan Embed Image v1** for multimodal embeddings (1024 dimensions)
4. **AWS S3** for scalable image storage
5. **JWT Authentication** for secure access
6. **Amazon Nova Pro** for intelligent image analysis
7. **Vector Search APIs** for semantic similarity and pattern recognition
8. **Gunicorn/Uvicorn** for production deployment

### Database Schema

We've designed a comprehensive database schema to support environmental waste monitoring. View our complete [database structure and SQL schema](https://github.com/ajitonelsonn/EcoLafaek_Perplexity/tree/main/database) to understand how we store and organize:

- User accounts and authentication
- Waste reports with geolocation data
- AI analysis results from Amazon Nova Pro
- **Vector embeddings (1024-dimensional)** for semantic search
- **TiDB vector indexes** for fast similarity queries
- Waste type classifications
- Environmental hotspot detection
- Image processing queue

## 🚀 Setup and Deployment

The application is deployed on AWS Lightsail with:

1. **NGINX** as a reverse proxy
2. **Gunicorn** with extended timeout for Nova Pro processing
3. **SSL/TLS** encryption via Let's Encrypt
4. **Systemd** service for automatic restarts
5. **Proper error handling** with retry mechanisms

## 🌟 Future Enhancements

With continued development of Amazon Nova Pro, we plan to:

1. Implement **multi-stage reasoning** for complex waste analysis
2. Add **temporal analysis** to track changes in waste sites over time
3. Develop **predictive models** for waste accumulation patterns
4. Create **automated cleanup recommendations** based on waste types
5. Integrate with **government systems** for coordinated response

## 🚀 Live Demo

Our complete EcoLafaek ecosystem is publicly accessible for demonstration purposes:

- **Interactive API Documentation:** [https://ecolafaek.xyz/docs](https://ecolafaek.com/docs)
- **Health Check Endpoint:** [https://ecolafaek.xyz/health](https://ecolafaek.com/health)
- **Public Dashboard:** [https://www.ecolafaek.com/](https://www.ecolafaek.xyz/)
- **Mobile App Download:** [https://www.ecolafaek.com/download](https://www.ecolafaek.xyz/download)

### 🧪 Test Credentials

For hackathon judges and testers, use these credentials:

```
Username: usertest
Password: 1234abcd
```

You can use these credentials in:

- The Swagger UI authorization form at [https://ecolafaek.xyz/docs](https://ecolafaek.com/docs)
- The mobile app to create and submit waste reports
- Direct API calls as shown below

### 🔍 Example API Calls

**Authentication:**

```bash
curl -X POST https://ecolafaek.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usertest","password":"1234abcd"}'
```

**Test Nova Pro Analysis:**

```bash
curl -X GET "https://ecolafaek.xyz/api/test/nova?image_url=https://liberty-society.xyz/cdn/shop/articles/sampah_organik.jpg" \
  -H "Authorization: Bearer your_token_here"
```

**Vector Search - Semantic Search:**

```bash
curl -X GET "https://ecolafaek.xyz/api/vector-search/semantic?query=plastic bottles scattered on ground&limit=5" \
  -H "Authorization: Bearer your_token_here"
```

**Vector Search - Find Similar Reports:**

```bash
curl -X GET "https://ecolafaek.xyz/api/vector-search/similar/12345?limit=5" \
  -H "Authorization: Bearer your_token_here"
```

**Vector Search - Location Patterns:**

```bash
curl -X GET "https://ecolafaek.xyz/api/vector-search/location-patterns?lat=-8.55&lon=125.58&radius=1000&limit=10" \
  -H "Authorization: Bearer your_token_here"
```

**Test Vector Embeddings:**

```bash
curl -X GET "https://ecolafaek.xyz/api/test/embeddings?text=plastic waste near river&image_url=test_image.jpg" \
  -H "Authorization: Bearer your_token_here"
```

Replace `your_token_here` with the token received from the login response.

---

<div align="center">
  <p>Built with ❤️ for a cleaner Timor-Leste</p>
</div>
