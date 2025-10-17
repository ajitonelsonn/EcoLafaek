import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EcoLafaek Documentation",
  description:
    "AI-Powered Waste Management System for Timor-Leste - AWS AI Agent Global Hackathon",
  base: "/",
  ignoreDeadLinks: true,

  head: [
    ["link", { rel: "icon", href: "/app_logo.png" }],
    ["meta", { name: "theme-color", content: "#10b981" }],
    ["meta", { property: "og:title", content: "EcoLafaek Documentation" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "AI-Powered Waste Management System powered by Amazon Bedrock AgentCore",
      },
    ],
  ],

  themeConfig: {
    logo: "/app_logo.png",

    nav: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "Live Demo", link: "https://www.ecolafaek.com" },
      { text: "Download App", link: "https://www.ecolafaek.com/download" },
    ],

    sidebar: [
      {
        text: "📖 Introduction",
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting Started", link: "/getting-started" },
          { text: "Architecture", link: "/architecture" },
          { text: "About This Docs Site", link: "/about-docs" },
        ],
      },
      {
        text: "📱 Mobile App",
        items: [{ text: "Overview", link: "/mobile-app/" }],
      },
      {
        text: "⚡ Backend API",
        items: [{ text: "Overview", link: "/backend/" }],
      },
      {
        text: "🌐 Public Dashboard",
        items: [{ text: "Overview", link: "/dashboard/" }],
      },
      {
        text: "👨‍💼 Admin Panel",
        items: [{ text: "Overview", link: "/admin/" }],
      },
      {
        text: "🗄️ Database",
        items: [{ text: "Overview", link: "/database/" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/ajitonelsonn/EcoLafaek" },
    ],

    footer: {
      message: "Built with ❤️ for Timor-Leste | AWS AI Agent Global Hackathon",
      copyright: "Powered by Amazon Bedrock AgentCore",
    },

    search: {
      provider: "local",
    },

    editLink: {
      pattern: "https://github.com/ajitonelsonn/EcoLafaek/edit/main/docs/:path",
    },

    lastUpdated: {
      text: "Updated at",
      formatOptions: {
        dateStyle: "full",
        timeStyle: "medium",
      },
    },
  },
});
