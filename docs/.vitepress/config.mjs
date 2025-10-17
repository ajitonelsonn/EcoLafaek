import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EcoLafaek Documentation",
  description: "AI-Powered Waste Management System for Timor-Leste - AWS AI Agent Global Hackathon 2025",
  base: '/',
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: '/app_logo.png' }],
    ['meta', { name: 'theme-color', content: '#10b981' }],
    ['meta', { property: 'og:title', content: 'EcoLafaek Documentation' }],
    ['meta', { property: 'og:description', content: 'AI-Powered Waste Management System powered by Amazon Bedrock AgentCore' }],
  ],

  themeConfig: {
    logo: '/app_logo.png',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Live Demo', link: 'https://www.ecolafaek.com' },
      { text: 'Download App', link: 'https://www.ecolafaek.com/download' }
    ],

    sidebar: [
      {
        text: '📖 Introduction',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Architecture', link: '/architecture' }
        ]
      },
      {
        text: '📱 Mobile App',
        items: [
          { text: 'Overview', link: '/mobile-app/' },
          { text: 'Features', link: '/mobile-app/features' },
          { text: 'Installation', link: '/mobile-app/installation' }
        ]
      },
      {
        text: '⚡ Backend API',
        items: [
          { text: 'Overview', link: '/backend/' },
          { text: 'AgentCore Integration', link: '/backend/agentcore' },
          { text: 'AI Tools', link: '/backend/tools' },
          { text: 'Deployment', link: '/backend/deployment' }
        ]
      },
      {
        text: '🌐 Public Dashboard',
        items: [
          { text: 'Overview', link: '/dashboard/' },
          { text: 'AI Chat', link: '/dashboard/ai-chat' },
          { text: 'Vector Search', link: '/dashboard/vector-search' }
        ]
      },
      {
        text: '👨‍💼 Admin Panel',
        items: [
          { text: 'Overview', link: '/admin/' },
          { text: 'User Management', link: '/admin/users' },
          { text: 'Analytics', link: '/admin/analytics' }
        ]
      },
      {
        text: '🗄️ Database',
        items: [
          { text: 'Schema Overview', link: '/database/' },
          { text: 'Vector Search', link: '/database/vector-search' },
          { text: 'Tables', link: '/database/tables' }
        ]
      },
      {
        text: '🚀 Deployment',
        items: [
          { text: 'AWS Services', link: '/deployment/aws' },
          { text: 'GitHub Pages', link: '/deployment/github-pages' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ajitonelsonn/EcoLafaek' }
    ],

    footer: {
      message: 'Built with ❤️ for Timor-Leste | AWS AI Agent Global Hackathon 2025',
      copyright: 'Powered by Amazon Bedrock AgentCore'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/ajitonelsonn/EcoLafaek/edit/main/docs/:path'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    }
  }
})
