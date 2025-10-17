# EcoLafaek Documentation Site

Modern documentation site for EcoLafaek built with [VitePress](https://vitepress.dev/).

## 🌐 Live Site

**Documentation**: [https://ajitonelsonn.github.io/EcoLafaek/](https://ajitonelsonn.github.io/EcoLafaek/)

## ✨ Features

- **Automatic Syncing**: Documentation automatically syncs from README.md files across the project
- **Modern UI**: Beautiful, responsive design with dark mode support
- **Fast Search**: Local search powered by VitePress
- **Auto-deploy**: GitHub Actions automatically deploys to GitHub Pages on push
- **Easy Navigation**: Organized sidebar with all documentation sections

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Sync README files and start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The site will be available at http://localhost:5173

## 📁 How It Works

### Automatic README Syncing

The `sync-docs.js` script automatically:

1. **Copies README.md files** from all project components:

   - Main README.md → getting-started.md
   - Diagram/README.md → architecture.md
   - ecolafaek/README.md → mobile-app/index.md
   - mobile_backend/README.md → backend/index.md
   - ecolafaek_public_dahboard/README.md → dashboard/index.md
   - ecolafaek_admin_panel/README.md → admin/index.md
   - database/README.md → database/index.md

2. **Transforms content** for VitePress:

   - Fixes relative image paths
   - Updates cross-references between docs
   - Adds VitePress frontmatter

3. **Copies images** to public folder:
   - docs/image/ → public/image/
   - mobile_backend/image/ → public/backend-images/
   - ecolafaek/assets/screens/ → public/mobile-images/screens/
   - Diagram/Image/ → public/diagram-images/

### Making Changes

When you update any README.md file in the project:

1. **Locally**: Run `npm run dev` - sync happens automatically
2. **Production**: Push to GitHub - Actions will sync and deploy automatically

You can also manually sync without starting the dev server:

```bash
npm run sync
```

## 🎨 Customization

### Theme

Edit `.vitepress/theme/style.css` to customize colors, fonts, and styling.

### Navigation

Edit `.vitepress/config.mjs` to update:

- Sidebar navigation
- Top navigation
- Social links
- Site metadata

### Homepage

Edit `index.md` to customize the landing page hero, features, and content.

## 📦 Project Structure

```
docs/
├── .vitepress/
│   ├── config.mjs              # VitePress configuration
│   └── theme/
│       ├── index.js            # Theme customization
│       └── style.css           # Custom styles
├── public/                     # Static assets (auto-generated)
│   ├── image/                  # Main project images
│   ├── backend-images/         # Backend screenshots
│   ├── mobile-images/          # Mobile app screenshots
│   ├── diagram-images/         # Architecture diagrams
│   └── app_logo.png           # App logo
├── index.md                    # Homepage
├── getting-started.md          # Synced from ../README.md
├── architecture.md             # Synced from ../Diagram/README.md
├── mobile-app/
│   └── index.md               # Synced from ../ecolafaek/README.md
├── backend/
│   └── index.md               # Synced from ../mobile_backend/README.md
├── dashboard/
│   └── index.md               # Synced from ../ecolafaek_public_dahboard/README.md
├── admin/
│   └── index.md               # Synced from ../ecolafaek_admin_panel/README.md
├── database/
│   └── index.md               # Synced from ../database/README.md
├── sync-docs.js               # Sync script
└── package.json               # Dependencies and scripts
```

## 🚀 Deployment

### GitHub Pages

The site automatically deploys to GitHub Pages via GitHub Actions when:

- You push to the `main` branch
- Any README.md file changes
- You manually trigger the workflow

### Deployment Workflow

See `.github/workflows/deploy-docs.yml` for the complete deployment configuration.

**Steps**:

1. Checkout code
2. Setup Node.js and install dependencies
3. Run sync script to copy README files
4. Build VitePress site
5. Deploy to GitHub Pages

### Manual Deployment

```bash
# Build the site
npm run build

# The built site is in .vitepress/dist/
# Upload this folder to any static hosting service
```

## 📝 Adding New Documentation

To add a new documentation page:

1. **Option A: Add to existing component README**

   - Update the relevant README.md file (e.g., mobile_backend/README.md)
   - Run `npm run sync` to sync changes

2. **Option B: Create new standalone page**
   - Create a new .md file in the docs/ folder
   - Update `.vitepress/config.mjs` sidebar to include it
   - The page will be included in the build automatically

## 🛠️ Technologies

- **VitePress**: Modern static site generator powered by Vue & Vite
- **Vue 3**: Reactive framework for the UI
- **Vite**: Fast build tool and dev server
- **GitHub Actions**: CI/CD for automatic deployment
- **GitHub Pages**: Free hosting for the documentation site

## 📞 Need Help?

- **VitePress Docs**: https://vitepress.dev/
- **Project Issues**: https://github.com/ajitonelsonn/EcoLafaek/issues

---

<div align="center">
  <p>Built with ❤️ for Timor-Leste | AWS AI Agent Global Hackathon</p>
  <p>Powered by VitePress</p>
</div>
# Documentation Site
