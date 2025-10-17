#!/bin/bash
# Install AWS Bedrock AgentCore and all tools

echo "🚀 Installing AWS Bedrock AgentCore Tools..."
echo ""

# Core AgentCore
echo "📦 Installing AgentCore..."
pip install bedrock-agentcore bedrock-agentcore-starter-toolkit

# Browser tool
echo "🌐 Installing Browser Tool (Playwright)..."
pip install playwright
playwright install chromium

# Visualization tools
echo "📊 Installing Visualization Tools..."
pip install matplotlib folium pandas

# Web scraping (already installed but ensure)
echo "🕷️  Ensuring web scraping tools..."
pip install beautifulsoup4 lxml

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure AWS credentials (if not done):"
echo "   export AWS_REGION=us-west-2"
echo "   export AWS_ACCESS_KEY_ID=your_key"
echo "   export AWS_SECRET_ACCESS_KEY=your_secret"
echo ""
echo "2. Test installation:"
echo "   python -c 'from bedrock_agentcore.tools.browser_client import browser_session; print(\"✅ Ready\")'"
echo ""
echo ""
echo "3. Restart backend:"
echo "   python app.py"
