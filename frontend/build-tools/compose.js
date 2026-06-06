#!/usr/bin/env bun
/**
 * Static Partial Composition Tool
 *
 * Replaces <!-- INCLUDE partials/sidebar.html --> placeholders
 * with actual sidebar HTML content during build time.
 *
 * Usage: bun run build-tools/compose.js
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');
const PARTIALS_DIR = path.join(ROOT, 'src/partials');

console.log('🔧 Static Partial Composition Tool');
console.log('=====================================\n');

// Read sidebar partial
const sidebarPartialPath = path.join(PARTIALS_DIR, 'sidebar.html');
if (!fs.existsSync(sidebarPartialPath)) {
  console.error('❌ Sidebar partial not found:', sidebarPartialPath);
  process.exit(1);
}

const sidebarContent = fs.readFileSync(sidebarPartialPath, 'utf-8');
console.log('✅ Loaded sidebar partial:', sidebarPartialPath);
console.log('   Size:', sidebarContent.length, 'bytes\n');

// Find all HTML files in public/user/ directory
const userPages = fs.readdirSync(path.join(PUBLIC_DIR, 'user'))
  .filter(file => file.endsWith('.html'))
  .map(file => path.join(PUBLIC_DIR, 'user', file));

console.log('📄 Found', userPages.length, 'user pages to process\n');

let processedCount = 0;
let replacedCount = 0;

// Process each page
for (const pagePath of userPages) {
  const relativePath = path.relative(PUBLIC_DIR, pagePath);
  console.log('📝 Processing:', relativePath);

  let content = fs.readFileSync(pagePath, 'utf-8');
  const originalContent = content;

  // Replace sidebar placeholder with actual sidebar
  const placeholder = '<!-- INCLUDE partials/sidebar.html -->';
  if (content.includes(placeholder)) {
    content = content.replace(placeholder, sidebarContent);
    replacedCount++;
    console.log('   ✅ Replaced sidebar placeholder');
  } else {
    // Try to find existing <aside> tag and replace it
    const asideStart = content.indexOf('<aside');
    const asideEnd = content.indexOf('</aside>', asideStart) + '</aside>'.length;

    if (asideStart > 0 && asideEnd > asideStart) {
      // Preserve indentation
      const beforeAside = content.substring(0, asideStart);
      const afterAside = content.substring(asideEnd);
      const indentMatch = beforeAside.match(/([ \t]+)$/);
      const indent = indentMatch ? indentMatch[1] : '';

      // Adjust sidebar content indentation
      const indentedSidebar = sidebarContent.split('\n')
        .map(line => indent + '  ' + line)
        .join('\n');

      content = beforeAside + indentedSidebar + afterAside;
      replacedCount++;
      console.log('   ✅ Replaced existing <aside> tag');
    } else {
      console.log('   ⚠️  No sidebar found (skipped)');
    }
  }

  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(pagePath, content, 'utf-8');
    processedCount++;
  }

  console.log('');
}

// Also process dist/user/ directory (after build)
if (fs.existsSync(path.join(DIST_DIR, 'user'))) {
  const distPages = fs.readdirSync(path.join(DIST_DIR, 'user'))
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(DIST_DIR, 'user', file));

  console.log('📦 Found', distPages.length, 'dist pages to process\n');

  for (const pagePath of distPages) {
    const relativePath = path.relative(DIST_DIR, pagePath);
    console.log('📝 Processing:', relativePath);

    let content = fs.readFileSync(pagePath, 'utf-8');
    const originalContent = content;

    // Replace existing <aside> tag in dist files
    const asideStart = content.indexOf('<aside');
    const asideEnd = content.indexOf('</aside>', asideStart) + '</aside>'.length;

    if (asideStart > 0 && asideEnd > asideStart) {
      const beforeAside = content.substring(0, asideStart);
      const afterAside = content.substring(asideEnd);
      const indentMatch = beforeAside.match(/([ \t]+)$/);
      const indent = indentMatch ? indentMatch[1] : '';

      // Adjust sidebar content indentation
      const indentedSidebar = sidebarContent.split('\n')
        .map(line => indent + '  ' + line)
        .join('\n');

      content = beforeAside + indentedSidebar + afterAside;
      replacedCount++;
      console.log('   ✅ Replaced existing <aside> tag');
    }

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(pagePath, content, 'utf-8');
      processedCount++;
    }

    console.log('');
  }
}

// Summary
console.log('=====================================');
console.log('✅ Composition Complete!');
console.log('   Processed:', processedCount, 'files');
console.log('   Replaced:', replacedCount, 'sidebars');
console.log('\n📁 Sidebar partial:', path.relative(ROOT, sidebarPartialPath));
console.log('💡 Tip: Modify sidebar.html to update all pages!\n');
