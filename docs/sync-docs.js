#!/usr/bin/env node

/**
 * Sync README.md files from project components to docs site
 * This script copies and transforms README files for VitePress
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Mapping of source README files to destination docs
const SYNC_MAP = {
  '../README.md': 'getting-started.md',
  '../Diagram/README.md': 'architecture.md',
  '../ecolafaek/README.md': 'mobile-app/index.md',
  '../ecolafaek/IOS.md': 'mobile-app/ios.md',
  '../ecolafaek/Android.md': 'mobile-app/android.md',
  '../mobile_backend/README.md': 'backend/index.md',
  '../ecolafaek_public_dahboard/README.md': 'dashboard/index.md',
  '../ecolafaek_admin_panel/README.md': 'admin/index.md',
  '../database/README.md': 'database/index.md',
};

/**
 * Transform README content for VitePress
 * - Fix relative image paths
 * - Add frontmatter
 */
function transformContent(content, sourceFile) {
  let transformed = content;

  // Fix relative paths for images
  // Convert relative paths like ../docs/image/foo.png to /image/foo.png
  transformed = transformed.replace(/]\(\.\.\/docs\//g, '](/');
  transformed = transformed.replace(/]\(docs\//g, '](/');

  // Fix "public/" prefix - VitePress serves public/ files from root
  transformed = transformed.replace(/src="public\//g, 'src="/');
  transformed = transformed.replace(/]\(public\//g, '](/');
  transformed = transformed.replace(/src="\/public\//g, 'src="/');
  transformed = transformed.replace(/]\(\/public\//g, '](/');

  // Fix image paths specific to each component
  if (sourceFile.includes('mobile_backend')) {
    transformed = transformed.replace(/]\(image\//g, '](/backend-images/');
    transformed = transformed.replace(/src="image\//g, 'src="/backend-images/');
    transformed = transformed.replace(/]\(\/image\//g, '](/backend-images/');
    transformed = transformed.replace(/src="\/image\//g, 'src="/backend-images/');
    // Fix absolute paths from mobile_backend to backend-images
    transformed = transformed.replace(/]\(\/mobile_backend\/image\//g, '](/backend-images/');
    transformed = transformed.replace(/src="\/mobile_backend\/image\//g, 'src="/backend-images/');
  } else if (sourceFile.includes('ecolafaek/')) {
    transformed = transformed.replace(/]\(assets\//g, '](/mobile-images/');
    transformed = transformed.replace(/src="assets\//g, 'src="/mobile-images/');
  } else if (sourceFile.includes('ecolafaek_admin_panel')) {
    // Fix admin panel screenshot paths
    transformed = transformed.replace(/]\(\/ecolafaek_admin_panel\/public\/ssc\//g, '](/ssc/');
    transformed = transformed.replace(/src="\/ecolafaek_admin_panel\/public\/ssc\//g, 'src="/ssc/');
    transformed = transformed.replace(/]\(public\/ssc\//g, '](/ssc/');
    transformed = transformed.replace(/src="public\/ssc\//g, 'src="/ssc/');
  } else if (sourceFile.includes('ecolafaek_public_dahboard')) {
    // Fix dashboard screenshot paths
    transformed = transformed.replace(/]\(\/ecolafaek_public_dahboard\/public\/scs\//g, '](/scs/');
    transformed = transformed.replace(/src="\/ecolafaek_public_dahboard\/public\/scs\//g, 'src="/scs/');
    transformed = transformed.replace(/]\(public\/scs\//g, '](/scs/');
    transformed = transformed.replace(/src="public\/scs\//g, 'src="/scs/');
  } else if (sourceFile.includes('Diagram')) {
    transformed = transformed.replace(/]\(Image\//g, '](/diagram-images/');
    transformed = transformed.replace(/src="Image\//g, 'src="/diagram-images/');
    // Fix relative paths in Diagram README
    transformed = transformed.replace(/]\(\.\//g, '](/diagram-images/');
    transformed = transformed.replace(/src="\.\//g, 'src="/diagram-images/');
    // Fix absolute paths pointing to Diagram/Image
    transformed = transformed.replace(/]\(\/Diagram\/Image\//g, '](/diagram-images/');
    transformed = transformed.replace(/src="\/Diagram\/Image\//g, 'src="/diagram-images/');
    // Fix plain image filenames (like Ecolafaek_arch_diagram.png) to /diagram-images/
    transformed = transformed.replace(/!\[([^\]]*)\]\(([^\/http][^)]*\.(png|jpg|jpeg|gif|svg|webp))\)/gi, '![$1](/diagram-images/$2)');
    transformed = transformed.replace(/src="([^\/http"][^"]*\.(png|jpg|jpeg|gif|svg|webp))"/gi, 'src="/diagram-images/$1"');
  } else if (sourceFile === '../README.md') {
    // Main README images - rewrite all component image paths
    transformed = transformed.replace(/src="app_logo\.webp"/g, 'src="/app_logo.png"');
    transformed = transformed.replace(/src="Diagram\/Image\//g, 'src="/diagram-images/');
    transformed = transformed.replace(/]\(Diagram\/Image\//g, '](/diagram-images/');
    transformed = transformed.replace(/src="Diagram\//g, 'src="/diagram-images/');
    transformed = transformed.replace(/]\(Diagram\//g, '](/diagram-images/');
    transformed = transformed.replace(/src="\.\/Diagram\//g, 'src="/diagram-images/');
    transformed = transformed.replace(/]\(\.\/Diagram\//g, '](/diagram-images/');
    transformed = transformed.replace(/src="\/mobile_backend\/image\//g, 'src="/backend-images/');
    transformed = transformed.replace(/]\(\/mobile_backend\/image\//g, '](/backend-images/');
    transformed = transformed.replace(/src="\/ecolafaek\/assets\//g, 'src="/mobile-images/');
    transformed = transformed.replace(/]\(\/ecolafaek\/assets\//g, '](/mobile-images/');
    transformed = transformed.replace(/src="\/docs\/image\//g, 'src="/image/');
    transformed = transformed.replace(/]\(\/docs\/image\//g, '](/image/');
  }

  // Fix cross-references between README files
  transformed = transformed.replace(/\[([^\]]+)\]\(\.\.\/README\.md\)/g, '[$1](/getting-started)');
  transformed = transformed.replace(/\[([^\]]+)\]\(\.\.\/Diagram\/README\.md\)/g, '[$1](/architecture)');
  transformed = transformed.replace(/\[([^\]]+)\]\(\.\.\/ecolafaek\/README\.md\)/g, '[$1](/mobile-app/)');
  transformed = transformed.replace(/\[([^\]]+)\]\(\.\.\/mobile_backend\/README\.md\)/g, '[$1](/backend/)');
  transformed = transformed.replace(/\[([^\]]+)\]\(\.\.\/ecolafaek_public_dahboard\/README\.md\)/g, '[$1](/dashboard/)');
  transformed = transformed.replace(/\[([^\]]+)\]\(\.\.\/ecolafaek_admin_panel\/README\.md\)/g, '[$1](/admin/)');
  transformed = transformed.replace(/\[([^\]]+)\]\(\.\.\/database\/README\.md\)/g, '[$1](/database/)');

  // Fix common HTML issues for VitePress/Vue
  // Remove empty <span> wrappers that have no closing tag or serve no purpose
  transformed = transformed.replace(/<span[^>]*>\s*<img/g, '<img');
  transformed = transformed.replace(/<\/span>\s*<\/div>/g, '</div>');

  // Fix unclosed span tags by removing them if they wrap single elements
  transformed = transformed.replace(/<span[^>]*>\s*(<img[^>]*>)\s*$/gm, '$1');

  return transformed;
}

/**
 * Copy image directories to VitePress public folder
 */
function copyImages() {
  const publicDir = path.join(__dirname, 'public');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Copy main docs images
  const docsImageSrc = path.join(ROOT_DIR, 'docs', 'image');
  const docsImageDest = path.join(publicDir, 'image');
  if (fs.existsSync(docsImageSrc)) {
    copyDirRecursive(docsImageSrc, docsImageDest);
    console.log('✓ Copied docs/image/');
  }

  // Copy backend images
  const backendImageSrc = path.join(ROOT_DIR, 'mobile_backend', 'image');
  const backendImageDest = path.join(publicDir, 'backend-images');
  if (fs.existsSync(backendImageSrc)) {
    copyDirRecursive(backendImageSrc, backendImageDest);
    console.log('✓ Copied mobile_backend/image/ → backend-images/');
  }

  // Copy mobile app screenshots
  const mobileImageSrc = path.join(ROOT_DIR, 'ecolafaek', 'assets', 'screens');
  const mobileImageDest = path.join(publicDir, 'mobile-images', 'screens');
  if (fs.existsSync(mobileImageSrc)) {
    copyDirRecursive(mobileImageSrc, mobileImageDest);
    console.log('✓ Copied ecolafaek/assets/screens/ → mobile-images/screens/');
  }

  // Copy diagram images from Diagram/Image/
  const diagramImageSrc = path.join(ROOT_DIR, 'Diagram', 'Image');
  const diagramImageDest = path.join(publicDir, 'diagram-images');
  if (fs.existsSync(diagramImageSrc)) {
    copyDirRecursive(diagramImageSrc, diagramImageDest);
    console.log('✓ Copied Diagram/Image/ → diagram-images/');
  }

  // Copy diagram images from Diagram root (like Ecolafaek_arch_diagram.png)
  const diagramRootFiles = fs.readdirSync(path.join(ROOT_DIR, 'Diagram'));
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
  diagramRootFiles.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (imageExtensions.includes(ext)) {
      const src = path.join(ROOT_DIR, 'Diagram', file);
      const dest = path.join(publicDir, 'diagram-images', file);
      fs.copyFileSync(src, dest);
    }
  });
  console.log('✓ Copied Diagram/*.png files → diagram-images/');


  // Copy app logo
  const appLogoSrc = path.join(ROOT_DIR, 'mobile_backend', 'image', 'app_logo.png');
  const appLogoDest = path.join(publicDir, 'app_logo.png');
  if (fs.existsSync(appLogoSrc)) {
    fs.copyFileSync(appLogoSrc, appLogoDest);
    console.log('✓ Copied app_logo.png');
  }

  // Copy dashboard screenshots
  const dashboardScsSrc = path.join(ROOT_DIR, 'ecolafaek_public_dahboard', 'public', 'scs');
  const dashboardScsDest = path.join(publicDir, 'scs');
  if (fs.existsSync(dashboardScsSrc)) {
    copyDirRecursive(dashboardScsSrc, dashboardScsDest);
    console.log('✓ Copied dashboard screenshots (scs/)');
  }

  // Copy admin panel screenshots
  const adminSscSrc = path.join(ROOT_DIR, 'ecolafaek_admin_panel', 'public', 'ssc');
  const adminSscDest = path.join(publicDir, 'ssc');
  if (fs.existsSync(adminSscSrc)) {
    copyDirRecursive(adminSscSrc, adminSscDest);
    console.log('✓ Copied admin panel screenshots (ssc/)');
  }
}

/**
 * Recursively copy directory
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Sync README files
 */
function syncDocs() {
  console.log('🔄 Syncing documentation files...\n');

  // Copy images first
  copyImages();
  console.log('');

  // Sync README files
  Object.entries(SYNC_MAP).forEach(([source, dest]) => {
    const sourcePath = path.join(__dirname, source);
    const destPath = path.join(__dirname, dest);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Read source file
    let content = fs.readFileSync(sourcePath, 'utf8');

    // Transform content
    content = transformContent(content, source);

    // Add frontmatter for VitePress
    const title = content.match(/^#\s+(.+)$/m)?.[1] || 'Documentation';
    const frontmatter = `---\ntitle: ${title}\n---\n\n`;

    // Write to destination
    fs.writeFileSync(destPath, frontmatter + content, 'utf8');
    console.log(`✓ Synced ${source} → ${dest}`);
  });

  console.log('\n✅ Documentation sync complete!');
}

// Run sync
syncDocs();
