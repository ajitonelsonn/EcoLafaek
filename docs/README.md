# EcoLafaek Documentation

**Status**: 🚧 Documentation Coming Soon  
**Live AI Assistant**: ✅ Available Now at [docs.ecolafaek.com](https://docs.ecolafaek.com/)

## 📚 About Our Documentation

We are currently developing comprehensive documentation for EcoLafaek. While the full documentation is in progress, we've implemented an **AI-powered assistant** to provide immediate help and guidance to users.

## 🤖 AI Assistant - Available Now

Instead of waiting for complete documentation, users can interact with our intelligent AI assistant that provides instant answers about:

- **EcoLafaek Features**: How to use the mobile app, dashboard, and admin panel
- **Waste Management**: Best practices and environmental guidelines for Timor-Leste
- **Getting Started**: Onboarding assistance for new users

### 🔧 Technical Implementation

Our AI assistant is powered by **Moonshot AI's Kimi K2** model integrated through **Dify.ai**, providing a sophisticated conversational experience with domain-specific knowledge.

![Dify Configuration](image/dify_conf.png)
_Configuration showing Kimi K2 integration with Dify.ai platform for enhanced AI capabilities_

### 🎨 User Interface

The AI assistant features a modern, responsive chat interface embedded directly into our documentation site, providing seamless user experience across all devices.

![Chat Interface](image/chat_interface.png)
_Clean, modern chat interface allowing users to get instant help while documentation is being prepared_

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Documentation Site"
        DOCS[📚 docs.ecolafaek.com]
        UI[🎨 Modern Chat Interface]
    end

    subgraph "AI Processing"
        DIFY[🔧 Dify.ai Platform]
        KIMI[🧠 Moonshot Kimi K2]
        KB[📖 Knowledge Base]
    end

    subgraph "EcoLafaek Knowledge"
        FAQ[❓ FAQ Data]
        FEATURES[⚡ Feature Guides]
        GUIDES[📋 User Guides]
    end

    DOCS --> UI
    UI --> DIFY
    DIFY --> KIMI
    DIFY --> KB
    KB --> FAQ
    KB --> FEATURES
    KB --> GUIDES

    style DOCS fill:#10b981,stroke:#059669,stroke-width:2px,color:white
    style DIFY fill:#ff6b35,stroke:#e55a2b,stroke-width:2px,color:white
    style KIMI fill:#4f46e5,stroke:#4338ca,stroke-width:2px,color:white
```

---

**Built for Timor-Leste** 🇹🇱 • **Powered by Advanced AI** 🤖 • **Environmental Impact** 🌱
