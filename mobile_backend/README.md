# EcoLafaek Mobile Backend API

<!-- Logo -->
<p align="center">
  <img src="image/app_logo.png" alt="EcoLafaek Logo" width="120" />
</p>

## Autonomous AI Agent Backend

**EcoLafaek Mobile Backend API** showcases **Amazon Bedrock AgentCore** with autonomous multi-tool orchestration, creating an intelligent environmental monitoring system that solves real-world waste management challenges in Timor-Leste.

### 🤖 Core AI Agent Innovation:

- **Amazon Bedrock Nova-Pro LLM**: Multi-modal reasoning engine (image + text analysis)
- **AgentCore Runtime**: Autonomous tool execution with Code Interpreter and Browser primitives
- **Multi-Round Tool Calling**: Agent chains 5+ tools autonomously (SQL → Chart → Map → Web Scrape)
- **Production Deployment**: Live on AWS Lightsail

---

## 🌱 Overview

This is a sophisticated **autonomous AI agent** backend that powers environmental waste reporting for Timor-Leste. This project demonstrates advanced AI agent capabilities using Amazon Bedrock AgentCore to autonomously analyze images, execute SQL queries, generate visualizations, create interactive maps, and scrape web content - all through natural language chat.

**Real-World Impact**: Helping Timor-Leste combat environmental challenges through AI-powered civic engagement.

---

## 🤖 AWS AI Agent Architecture

### Autonomous Agent Workflow

Our agent demonstrates true autonomy through multi-round tool calling:

```
User Query: "Show waste trends and create a map of hotspots"
    ↓
[Round 1] Nova-Pro Reasoning → execute_sql_query tool
    ↓
[Round 2] Receives data → generate_visualization tool (AgentCore Code Interpreter)
    ↓
[Round 3] Chart created → execute_sql_query tool (get hotspot locations)
    ↓
[Round 4] Receives locations → create_map_visualization tool (AgentCore Code Interpreter)
    ↓
[Round 5] Returns comprehensive response with chart + interactive map
```

### AWS Services Used

#### 1. **Amazon Bedrock**

**Service**: Amazon Bedrock Runtime API
**Region**: us-east-1

**Important**: All AI models (Nova-Pro, Titan Embed) are accessed **through Amazon Bedrock service**, not directly. FastAPI uses `bedrock_runtime` client to communicate with Bedrock, which then provides access to the models.

**Access Pattern**:

```python
# Initialize Bedrock client (app.py:132-138)
bedrock_runtime = boto3.client(
    'bedrock-runtime',  # ← Access Bedrock SERVICE
    region_name='us-east-1'
)

# Then call models through Bedrock
response = bedrock_runtime.invoke_model(
    modelId='amazon.nova-pro-v1:0'  # ← Model ID inside Bedrock
)
```

**Models Used via Bedrock**:

**Nova-Pro LLM** (`amazon.nova-pro-v1:0`)

- **Image Analysis**: Waste classification from mobile app photos (via `invoke_model()`)
- **Multi-Round Reasoning**: Autonomous task planning and execution (via `converse()`)
- **Tool Orchestration**: Decides which tools to call and in what sequence

```python
# Chat with tool calling (app.py:3709)
response = bedrock_runtime.converse(
    modelId='amazon.nova-pro-v1:0',
    messages=conversation_history,
    toolConfig={'tools': agentcore_tools},  # 5 custom tools
    inferenceConfig={'temperature': 0.2, 'maxTokens': 4096}
)
```

```python
# Image analysis (app.py:611)
response = bedrock_runtime.invoke_model(
    modelId='amazon.nova-pro-v1:0',
    body=json.dumps({
        'messages': [{
            'role': 'user',
            'content': [
                {'text': prompt},
                {'image': {'format': 'jpeg', 'source': {'bytes': image_base64}}}
            ]
        }]
    })
)
```

#### 2. **Amazon Bedrock AgentCore**

**ARN**: `arn:aws:bedrock-agentcore:us-east-1:my_aws_ID:runtime/ecolafaek_waste_agent-TGrtjyF5VC`

**Primitives Used**:

- ✅ **Code Interpreter**: Python runtime for data analysis and chart generation (matplotlib)
- ✅ **Browser Tool**: Playwright-powered web scraping and content extraction

```python
# AgentCore Code Interpreter generates charts autonomously
with code_session(region='us-east-1') as client:
    result = client.invoke('executeCode', {
        'language': 'python',
        'code': chart_generation_code  # matplotlib visualization
    })
    # Returns base64 PNG chart
```

#### 3. **External Tools Integration**

Our agent integrates multiple external tools:

- **Database**: SQL query execution against production database
- **Code Execution**: Python code interpreter via AgentCore
- **Web Search**: Browser automation via AgentCore Playwright
- **S3 Storage**: Chart and map uploads to Amazon S3

---

## 🧠 AI Agent Capabilities

### Tool Suite (5 Custom Tools)

| Tool Name                  | Purpose            | AWS Service                | Example Use                     |
| -------------------------- | ------------------ | -------------------------- | ------------------------------- |
| `execute_sql_query`        | Query database     | Database                   | "How many reports this week?"   |
| `generate_visualization`   | Create charts      | AgentCore Code Interpreter | "Show waste distribution chart" |
| `create_map_visualization` | Generate maps      | AgentCore Code Interpreter | "Map hotspots"                  |
| `scrape_webpage`           | Web scraping       | AgentCore Browser Tool     | "What is EcoLafaek?"            |
| `get_ecolafaek_info`       | Fetch project info | AgentCore Browser Tool     | "Tell me about this platform"   |

**Example Chat**
![Example Output](/image/output_chat.png)

### Autonomous Reasoning Example

**User**: "Generate charts for waste categories"

**Agent Reasoning**:

```
Round 1: "I need waste category data. I'll use execute_sql_query"
    → Executes: SELECT waste_type, COUNT(*) FROM reports GROUP BY waste_type

Round 2: "I have the data. Now I'll create a bar chart using generate_visualization"
    → Generates Python matplotlib code
    → AgentCore executes code in sandbox
    → Returns chart image URL

Round 3: "Chart is ready. I'll format the response with insights"
    → Returns markdown with embedded chart and analysis
```

**Example chat Log**
![Example Output](/image/chat_log.png)

---

## 🏗️ Technical Architecture

### Core Stack

- **Framework**: FastAPI 0.104+ (async, auto-docs)
- **AI/ML**: Amazon Bedrock Nova-Pro + AgentCore
- **Deployment**: AWS Lightsail (Ubuntu 22.04, 1GB RAM, 2 vCPUs)
- **Storage**: Amazon S3 (images + generated charts)
- **Database**: Distributed SQL database (connection pooling)
- **Web Server**: Nginx reverse proxy + Let's Encrypt SSL
- **Process Manager**: systemd service (auto-restart)

### Key Endpoints

| Endpoint             | Method | Purpose                         | Used By    | Rate Limit |
| -------------------- | ------ | ------------------------------- | ---------- | ---------- |
| `/api/reports`       | POST   | Submit waste report + image     | Mobile App | 60/min     |
| `/api/chat`          | POST   | AI agent chat with tool calling | Dashboard  | 30/min     |
| `/api/reports/{id}`  | GET    | Get report details              | Mobile App | 120/min    |
| `/api/auth/login`    | POST   | JWT authentication              | Mobile App | 10/min     |
| `/api/auth/register` | POST   | User registration               | Mobile App | 5/min      |
| `/health`            | GET    | Health check                    | All        | Unlimited  |

---

## 🚀 Amazon Bedrock AgentCore Implementation

### AgentCore Configuration

**File**: `.bedrock_agentcore.yaml`

```yaml
agents:
  ecolafaek_waste_agent:
    name: ecolafaek_waste_agent
    entrypoint: app.py
    platform: linux/arm64
    container_runtime: docker
    aws:
      account: "Your_AWS_ID"
      region: us-east-1
      execution_role: arn:aws:iam::Your_AWS_ID:role/AmazonBedrockAgentCoreSDKRuntime-us-east-1
      ecr_repository: Your_AWS_ID.dkr.ecr.us-east-1.amazonaws.com/bedrock-agentcore-ecolafaek_waste_agent
    codebuild:
      project_name: bedrock-agentcore-ecolafaek_waste_agent-builder
```

### Deployment Process

To execute agentcore launch make sure you're iam like bellow:
![Iam](/image/iam.png)

```bash
# 1. Deploy AgentCore runtime (ARM64 via CodeBuild)
agentcore launch

# CodeBuild automatically:
# - Uploads source to S3
# - Builds ARM64 container
# - Pushes to Amazon ECR
# - Deploys to Bedrock AgentCore
# - Creates runtime endpoint (~60 seconds)
```

My Aws Agentcore:
![Aws AgentCore that already Deployed](/image/aws_bed_agentcore.png)

### AgentCore Tools Implementation

**Code Interpreter** (`agentcore_tools.py`):

```python
from bedrock_agentcore.tools.code_interpreter_client import code_session

def generate_visualization(data: dict, chart_type: str):
    """Generate chart using AgentCore Code Interpreter"""
    with code_session(region='us-east-1') as client:
        # Generate matplotlib code
        code = f"""
        import matplotlib.pyplot as plt
        data = {data}
        plt.{chart_type}(data['labels'], data['values'])
        plt.title(data['title'])
        plt.savefig('chart.png')
        """

        # Execute in AgentCore sandbox
        result = client.invoke('executeCode', {
            'language': 'python',
            'code': code
        })

        # Upload to S3 and return URL
        return upload_chart_to_s3(result['output'])
```

**Browser Tool** (`web_scraper_tool.py`):

```python
from bedrock_agentcore.tools.browser_client import browser_session
from playwright.sync_api import sync_playwright

def scrape_webpage_with_browser(url: str):
    """Scrape webpage using AgentCore Browser Tool"""
    with sync_playwright() as playwright:
        with browser_session(region='us-east-1') as client:
            ws_url, headers = client.generate_ws_headers()
            browser = playwright.chromium.connect_over_cdp(ws_url, headers=headers)

            page = browser.contexts[0].pages[0]
            page.goto(url, wait_until='domcontentloaded')

            return {
                'title': page.title(),
                'content': page.content()[:3000],
                'text': page.evaluate("() => document.body.innerText")
            }
```

---

## 📸 Image Analysis with Nova-Pro

### Multi-Modal AI Processing

**Model**: `amazon.nova-pro-v1:0`
**Capability**: Image + Text multi-modal analysis

```python
def analyze_image_with_bedrock(image_url: str):
    """Analyze waste image using Nova-Pro multi-modal LLM"""
    # Download image and convert to base64
    image_data = download_and_encode_image(image_url)

    # Call Nova-Pro with image + structured prompt
    response = bedrock_runtime.invoke_model(
        modelId='amazon.nova-pro-v1:0',
        body=json.dumps({
            'messages': [{
                'role': 'user',
                'content': [
                    {'text': WASTE_ANALYSIS_PROMPT},
                    {'image': {'format': 'jpeg', 'source': {'bytes': image_data}}}
                ]
            }],
            'inferenceConfig': {'temperature': 0.2, 'maxTokens': 2048}
        })
    )

    # Returns structured analysis:
    # - waste_type, severity_score, priority_level
    # - environmental_impact, safety_concerns
    # - estimated_volume, confidence_score
```

### Analysis Output

```json
{
  "waste_type": "Mixed (predominantly plastic)",
  "severity_score": 8,
  "priority_level": "high",
  "environmental_impact": "High pollution risk, potential harm to wildlife",
  "estimated_volume": "Approximately 10 cubic meters",
  "safety_concerns": "Sharp objects, fire hazard risk",
  "confidence_score": 95,
  "full_description": "Large accumulation of mixed waste including plastic bottles..."
}
```

### Example Output

**No have Image**
![No have Image](/image/nohave.png)

**Have Image**
![have Image](/image/have.png)

---

## 🛠️ Setup & Installation

### Prerequisites

- Python 3.10+
- AWS Account with Bedrock access
- AWS CLI configured
- AgentCore CLI installed (`pip install bedrock-agentcore`)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/ajitonelsonn/ecolafaek.git
cd ecolafaek/mobile_backend

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment template
cp .env.example .env

# 5. Configure .env file (see Configuration section)
nano .env

# 6. Deploy AgentCore runtime
agentcore launch

# 7. Run locally
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Configuration

Edit `.env` file with your credentials:

```bash
# API Configuration
PORT=8000
API_SECRET_KEY=your_secret_key_here
ENVIRONMENT=production
ALLOWED_ORIGINS=https://yourdomain.com

# AWS Bedrock Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0

# Amazon S3 Configuration
S3_BUCKET_NAME=your-bucket-name

# Database Configuration
DB_HOST=your_database_host
DB_NAME=db_ecolafaek
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_PORT=4000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION_HOURS=24

# Email Configuration (optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_SERVER=smtp.gmail.com
EMAIL_PORT=587
```

---

## 🚀 AWS Lightsail Deployment

### Deployment Scripts

**Initial Deployment**: `deploy_lightsail.sh`

```bash
# Automated deployment script:
# 1. Creates Lightsail instance (micro_3_0 bundle)
# 2. Configures firewall (ports 22, 80, 443, 8000)
# 3. Uploads application code via SCP
# 4. Installs Python 3.10 + dependencies
# 5. Sets up systemd service (ecolafaek-api.service)
# 6. Configures Nginx reverse proxy
# 7. Sets up Let's Encrypt SSL with auto-renewal

./deploy_lightsail.sh
```

**Code Updates**: `update_lightsail.sh`

```bash
# Quick update script:
# 1. Packages latest code
# 2. Uploads to existing instance
# 3. Restarts systemd service
# 4. Zero downtime deployment

./update_lightsail.sh
```

### Monitoring

```bash
# View real-time logs
sudo journalctl -u ecolafaek-api -f

# Check service status
sudo systemctl status ecolafaek-api

# Restart service
sudo systemctl restart ecolafaek-api

# View AgentCore logs
aws logs tail /aws/bedrock-agentcore/runtimes/ecolafaek_waste_agent-TGrtjyF5VC-DEFAULT --follow
```

---

## 🌐 Live Demo

Our complete EcoLafaek ecosystem is publicly accessible:

- **API Health Check**: [https://www.ecolafaek.xyz/health](https://www.ecolafaek.xyz/health)
- **Public Dashboard**: [https://www.ecolafaek.com/](https://www.ecolafaek.com/)
- **AI Chat Interface**: [https://www.ecolafaek.com/agentcore-chat](https://www.ecolafaek.com/agentcore-chat)
- **Mobile App Download**: [https://www.ecolafaek.com/download](https://www.ecolafaek.com/download)

### Test Credentials

- **Username**: `usertest`
- **Password**: `1234abcd`

---

## 📝 Project Structure

```
mobile_backend/
├── app.py                          # Main FastAPI application
├── agentcore_tools.py              # AgentCore tool implementations
├── schema_based_chat.py            # Chat schema definitions
├── web_scraper_tool.py             # Web scraping tool
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment template
├── .bedrock_agentcore.yaml         # AgentCore configuration
├── .dockerignore                   # Docker ignore file
├── Dockerfile                      # AgentCore container
├── deploy_lightsail.sh             # Deployment script
├── update_lightsail.sh             # Update script
└── install_agentcore.sh            # AgentCore setup script
```

---

## 🔒 Security Features

- **Rate Limiting**: slowapi middleware (per-IP tracking)
- **JWT Authentication**: HS256 with 24-hour expiration
- **Password Hashing**: PBKDF2-HMAC-SHA256 (100,000 iterations)
- **HTTPS**: Let's Encrypt SSL with TLS 1.3
- **CORS**: Whitelist allowed origins
- **SQL Injection Prevention**: Parameterized queries only

---

For detailed AI agent architecture, see [Architecture Diagram](../Diagram/README.md).

---

## 📞 Additional Documentation

- **📱 Mobile App**: [../ecolafaek/README.md](../ecolafaek/README.md)
- **🌐 Public Dashboard**: [../ecolafaek_public_dahboard/README.md](../ecolafaek_public_dahboard/README.md)
- **👨‍💼 Admin Panel**: [../ecolafaek_admin_panel/README.md](../ecolafaek_admin_panel/README.md)
- **🗄️ Database Schema**: [../database/README.md](../database/README.md)
- **📊 System architecture**: [../Diagram/README.md](../Diagram/README.md)
- **📄 Main Project**: [../README.md](../README.md)

---

<div align="center">
  <p><strong>Built with ❤️ for Timor-Leste</strong></p>
  <p>AWS AI Agent Global Hackathon</p>
  <p>Powered by Amazon Bedrock AgentCore</p>
</div>
