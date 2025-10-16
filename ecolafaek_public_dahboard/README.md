# EcoLafaek Public Dashboard

<p align="center">
  <img src="public/app_logo.png" alt="EcoLafaek Logo" width="120" style="margin-right: 20px;" />
</p>

<div align="center">
  <img src="https://img.shields.io/badge/AWS_AI_Agent_Global_Hackathon-🏆_PUBLIC_DASHBOARD-FF9900?style=for-the-badge&logoColor=white" alt="AWS AI Agent Hackathon" />
</div>

<p align="center" style="margin-top: 10px;">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.0+-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Amazon_Bedrock-AgentCore-FF9900?style=for-the-badge&logo=amazonwebservices" alt="Amazon Bedrock AgentCore" />
</p>

## 🏆 AWS AI Agent Global Hackathon 2025

A comprehensive public web dashboard showcasing **Amazon Bedrock AgentCore** autonomous AI agent capabilities for waste management in Timor-Leste. This dashboard demonstrates real-time AI chat with multi-round tool calling, semantic vector search, and interactive data visualization.

### 🤖 AI Agent Integration:

- **AgentCore AI Chat**: Natural language interface with autonomous tool execution
- **Multi-Round Tool Calling**: Agent chains SQL queries → Chart generation → Map creation
- **Vector Search**: Amazon Titan Embed powered semantic similarity search
- **Real-time Analytics**: Interactive data visualization and reporting

For detailed AI agent architecture, see [Backend README](../mobile_backend/README.md) and [Architecture Diagram](../Diagram/README.md).

## 🌟 Key Features

- **🤖 AI Chat Helper**: Interact with AgentCore autonomous agent for data insights and chart generation
- **🔍 Vector Search**: Semantic search powered by Amazon Titan Embed (1024-dimensional embeddings)
- **🗺️ Interactive Maps**: Geospatial visualization of waste reports and hotspots
- **📊 Real-time Analytics**: Monitor waste management metrics with customizable date ranges
- **📈 Data Visualization**: Charts, graphs, and trends powered by AgentCore Code Interpreter
- **🏆 Community Leaderboard**: Recognize top contributors

## 🖥️ Live Demo

Visit: [https://www.ecolafaek.com](https://www.ecolafaek.com)

## 🏗️ Technical Stack

### Frontend
- **Framework**: Next.js 15 (React 18)
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS 3.0+
- **Maps**: Leaflet.js
- **Charts**: Chart.js, Tremor Charts

### Backend Integration
- **API**: Next.js API Routes (Serverless)
- **AI Agent**: Amazon Bedrock AgentCore (via FastAPI backend proxy)
- **Vector Search**: Amazon Titan Embed + SQL database
- **Authentication**: API Key-based
- **Deployment**: Vercel Edge Functions

### AI Services (via Backend)
- **Amazon Bedrock Nova-Pro**: Multi-modal reasoning and tool orchestration
- **Amazon Bedrock AgentCore**: Autonomous code execution and browser automation
- **Amazon Titan Embed**: Vector embeddings for semantic search

## 📁 Project Structure

```
ecolafaek_public_dashboard/
├── pages/
│   ├── index.js                      # Dashboard homepage
│   ├── agentcore-chat.js             # AI Agent chat interface
│   ├── vector-search.js              # Semantic search page
│   ├── reports.js                    # Reports listing
│   ├── map.js                        # Interactive map view
│   └── api/
│       ├── chat.js                   # Proxy to FastAPI AgentCore chat
│       ├── contact.js                # Contact form handler
│       └── proxy-image.js            # Image proxy for CORS
├── components/
│   ├── Dashboard/                    # Dashboard widgets
│   ├── Maps/                         # Map components
│   ├── Charts/                       # Chart components
│   └── Layout/                       # Layout components
├── lib/
│   ├── db.js                         # Database connection
│   ├── bedrock.js                    # Amazon Bedrock client
│   └── utils.js                      # Helper functions
└── public/
    └── scs/                          # Screenshots
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Access to backend API (www.ecolafaek.xyz)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ajitonelsonn/EcoLafaek.git
cd EcoLafaek/ecolafaek_public_dahboard
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
# Backend API
NEXT_PUBLIC_API_URL=https://www.ecolafaek.xyz

# Database (for direct queries from Next.js API routes)
DB_HOST=your-database-host
DB_PORT=4000
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

# AWS Bedrock (for vector search API route)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1

# Google reCAPTCHA (for chat protection)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key
```

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 🔑 Key Pages

### 1. **AgentCore AI Chat** (`/agentcore-chat`)
- Natural language queries to autonomous AI agent
- Multi-round tool calling (SQL → Charts → Maps → Web Scraping)
- Real-time chart/map generation via AgentCore Code Interpreter
- PDF export of conversation history
- reCAPTCHA protection

**Example Queries**:
- "Show me waste trends over the last month"
- "Create a map of high-severity hotspots"
- "Generate a pie chart of waste types"

### 2. **Vector Search** (`/vector-search`)
- Semantic similarity search using Amazon Titan Embed embeddings
- Find similar waste reports based on image/text content
- Cosine similarity matching

### 3. **Reports** (`/reports`)
- Browse all waste reports with filtering
- Direct database queries from Next.js API routes
- Pagination and search

### 4. **Interactive Map** (`/map`)
- Geospatial visualization
- Hotspot clustering
- Real-time updates

## 📊 API Routes

| Endpoint | Purpose | Integration |
|----------|---------|-------------|
| `/api/chat` | Proxy AgentCore chat to backend | FastAPI + Bedrock AgentCore |
| `/api/contact` | Contact form submissions | Email service |
| `/api/proxy-image` | CORS-safe image proxy | S3 images |

## 🔒 Security Features

- **reCAPTCHA v2**: Bot protection for AI chat
- **Rate Limiting**: 30 requests/minute per IP
- **API Key Authentication**: Secure backend communication
- **CORS Configuration**: Restricted origins
- **Session Management**: 5-minute chat token validity

## 🚢 Deployment (Vercel)

This dashboard is deployed on **Vercel** with automatic deployments from Git:

```bash
# Automatic deployment on push to main branch
git push origin main
```

**Live URL**: https://www.ecolafaek.com

### Environment Variables (Vercel)
Configure all `.env.local` variables in Vercel dashboard under Project Settings → Environment Variables.

## 📖 For Judges

### Testing the Dashboard:

1. **Visit**: https://www.ecolafaek.com
2. **Try AI Chat**: Navigate to "Agent Chat" and ask questions like:
   - "Show waste type distribution chart"
   - "Create a map of hotspots"
   - "How many reports were submitted this month?"
3. **Vector Search**: Try semantic search for similar waste reports
4. **Explore Maps**: Interactive geospatial visualization

### Key Features to Review:
✅ Autonomous AI agent with multi-round tool calling
✅ Real-time chart generation via AgentCore Code Interpreter
✅ Semantic vector search with Amazon Titan Embed
✅ Clean, responsive UI with real production data

---

<div align="center">
  <p>Built with ❤️ for Timor-Leste | AWS AI Agent Global Hackathon 2025</p>
  <p>Powered by Amazon Bedrock AgentCore</p>
</div>
