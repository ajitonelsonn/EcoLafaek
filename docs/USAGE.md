# EcoLafaek Documentation Site - Quick Start Guide

## ✅ What's Been Set Up

Your modern documentation site is now fully configured with:

- ✅ **VitePress** - Fast, modern static site generator
- ✅ **Automatic Syncing** - README files sync automatically from all project components
- ✅ **GitHub Pages Deployment** - Auto-deploys on push to main branch
- ✅ **Beautiful Theme** - EcoLafaek green theme with dark mode support
- ✅ **Search** - Local search powered by VitePress
- ✅ **Responsive Design** - Works on all devices

## 🚀 Using the Documentation Site

### Development (Local Preview)

```bash
cd docs
npm run dev
```

The site will be available at **http://localhost:5173**

This command automatically:
1. Syncs all README.md files from project components
2. Copies all images to the public folder
3. Starts the development server with hot reload

### Building for Production

```bash
cd docs
npm run build
```

Output will be in `docs/.vitepress/dist/`

### Preview Production Build

```bash
cd docs
npm run preview
```

### Manual Sync (Without Starting Server)

```bash
cd docs
npm run sync
```

## 📝 Making Changes

### When You Update ANY README.md File

The documentation site will **automatically** pick up changes:

1. **During Development**:
   ```bash
   npm run dev
   ```
   The sync happens automatically before starting the server

2. **For Production (GitHub Pages)**:
   - Just push your changes to GitHub
   - GitHub Actions will automatically sync and deploy

###Files That Sync Automatically:

| Source File                               | Destination in Docs        |
| ----------------------------------------- | -------------------------- |
| `/README.md`                              | `/getting-started.md`      |
| `/Diagram/README.md`                      | `/architecture.md`         |
| `/ecolafaek/README.md`                    | `/mobile-app/index.md`     |
| `/mobile_backend/README.md`               | `/backend/index.md`        |
| `/ecolafaek_public_dahboard/README.md`    | `/dashboard/index.md`      |
| `/ecolafaek_admin_panel/README.md`        | `/admin/index.md`          |
| `/database/README.md`                     | `/database/index.md`       |

### Images Are Automatically Copied:

- `docs/image/` → `public/image/`
- `mobile_backend/image/` → `public/backend-images/`
- `ecolafaek/assets/screens/` → `public/mobile-images/screens/`
- `Diagram/Image/` → `public/diagram-images/`
- `Diagram/*.png` → `public/diagram-images/`
- `ecolafaek_public_dahboard/public/scs/` → `public/scs/`
- `ecolafaek_admin_panel/public/ssc/` → `public/ssc/`

## 🌐 GitHub Pages Deployment

### Automatic Deployment

The site automatically deploys to GitHub Pages when:
- You push to the `main` branch
- Any README.md file changes in the project
- Changes in the `docs/` folder

**Live URL** (after first deployment):
`https://ajitonelsonn.github.io/EcoLafaek/`

### Setting Up GitHub Pages (First Time)

1. **Push the docs folder to GitHub**:
   ```bash
   git add docs/
   git add .github/workflows/deploy-docs.yml
   git commit -m "Add VitePress documentation site"
   git push origin main
   ```

2. **Enable GitHub Pages** in your repository:
   - Go to Settings → Pages
   - Source: "GitHub Actions"
   - The workflow will automatically deploy

3. **First Deployment**:
   - GitHub Actions will build and deploy automatically
   - Check "Actions" tab to see deployment progress
   - Site will be live at: `https://ajitonelsonn.github.io/EcoLafaek/`

## 🎨 Customizing the Site

### Update Theme Colors

Edit `docs/.vitepress/theme/style.css`:
```css
--vp-c-brand-1: #10b981;  /* Primary green */
--vp-c-brand-2: #059669;  /* Hover green */
--vp-c-brand-3: #047857;  /* Active green */
```

### Update Navigation

Edit `docs/.vitepress/config.mjs`:
- **Top Navigation**: Edit the `nav` array
- **Sidebar**: Edit the `sidebar` array
- **Site Title**: Change `title` property
- **Description**: Change `description` property

### Update Homepage

Edit `docs/index.md` to customize:
- Hero section (title, tagline, actions)
- Feature cards
- Custom content

## 📊 Features

### Search

Press `/` or `Ctrl+K` to open search

### Dark Mode

Click the moon icon in the top right

### Mobile Responsive

Automatically adapts to mobile screens with hamburger menu

### Code Syntax Highlighting

Supports all major languages including:
- JavaScript/TypeScript
- Python
- Bash/Shell
- JSON/YAML
- Dart (Flutter)
- SQL

## 🔧 Troubleshooting

### Build Fails

```bash
cd docs
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Images Not Showing

1. Check if images exist in source folders
2. Run `npm run sync` manually
3. Check `docs/public/` folder to verify images were copied

### Dev Server Not Starting

```bash
cd docs
npm install
npm run dev
```

### GitHub Pages Not Deploying

1. Check "Actions" tab for error messages
2. Verify GitHub Pages is enabled (Settings → Pages)
3. Ensure workflow file exists: `.github/workflows/deploy-docs.yml`
4. Check that `base: '/EcoLafaek/'` matches your repo name in `config.mjs`

## 📚 Resources

- **VitePress Docs**: https://vitepress.dev/
- **Markdown Guide**: https://vitepress.dev/guide/markdown
- **Theme Customization**: https://vitepress.dev/guide/extending-default-theme

## 🎯 Next Steps

1. **Test Locally**:
   ```bash
   cd docs && npm run dev
   ```

2. **Push to GitHub**:
   ```bash
   git add docs/ .github/
   git commit -m "Add VitePress documentation site"
   git push origin main
   ```

3. **Enable GitHub Pages** (Settings → Pages → Source: GitHub Actions)

4. **Share Your Docs**: `https://ajitonelsonn.github.io/EcoLafaek/`

---

<div align="center">
  <p>✨ Your documentation site is ready! ✨</p>
  <p>Built with VitePress | Powered by Vue & Vite</p>
</div>
