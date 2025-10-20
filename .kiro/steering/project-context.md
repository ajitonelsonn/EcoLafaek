# EcoLafaek Project Context

This is an AWS AI Agent Global Hackathon 2025 submission showcasing Amazon Bedrock AgentCore.

## Project Overview
- **Name**: EcoLafaek
- **Purpose**: Environmental waste monitoring system for Timor-Leste
- **Technology**: Amazon Bedrock AgentCore, Nova-Pro, Titan Embed
- **Architecture**: Multi-tier system (Mobile App + Dashboard + Backend API)

## Key Components
- **Mobile Backend**: FastAPI with AgentCore runtime
- **Public Dashboard**: Next.js on Vercel
- **Mobile App**: Flutter cross-platform
- **Database**: Distributed SQL with vector embeddings
- **Admin Panel**: Next.js (local only)

## Development Guidelines
- Follow AWS best practices for Bedrock integration
- Maintain security standards (JWT, rate limiting, HTTPS)
- Document all AgentCore tool implementations
- Test multi-round tool calling workflows
- Ensure production readiness

## AgentCore Specifics
- Agent ID: `ecolafaek_waste_agent-TGrtjyF5VC`
- Tools: SQL queries, chart generation, map creation, web scraping
- Models: Nova-Pro (reasoning), Titan Embed (vectors)
- Deployment: AWS Lightsail + ECR + CodeBuild