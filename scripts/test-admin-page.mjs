#!/usr/bin/env node

/**
 * Admin页面功能测试脚本
 * 测试admin页面加载和标签切换功能
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('  SPanel Admin页面功能测试');
console.log('========================================\n');

// 测试1: 检查admin HTML文件
console.log('[测试1] 检查admin/index.html文件结构...');
const adminHtmlPath = path.join(__dirname, '../frontend/dist/admin/index.html');
if (!fs.existsSync(adminHtmlPath)) {
  console.error('❌ 失败: admin/index.html 不存在');
  process.exit(1);
}

const adminHtml = fs.readFileSync(adminHtmlPath, 'utf-8');

// 检查是否是Vue应用
if (!adminHtml.includes('<div id="app">')) {
  console.error('❌ 失败: 不是Vue应用结构');
  process.exit(1);
}
console.log('✓ 通过: 是Vue应用结构');

// 检查script标签
if (!adminHtml.includes('/assets/admin/index-')) {
  console.error('❌ 失败: admin JS文件路径不正确');
  process.exit(1);
}
console.log('✓ 通过: admin JS文件路径正确');

// 检查Element Plus依赖
if (!adminHtml.includes('element-plus')) {
  console.warn('⚠ 警告: Element Plus依赖未找到');
} else {
  console.log('✓ 通过: Element Plus依赖已加载');
}

console.log('\n[测试2] 检查admin JS文件...');
const adminJsPath = path.join(__dirname, '../frontend/dist/assets');
const jsFiles = fs.readdirSync(adminJsPath).filter(f => f.startsWith('admin/index-'));
if (jsFiles.length === 0) {
  console.error('❌ 失败: admin JS文件不存在');
  process.exit(1);
}
console.log(`✓ 找到: ${jsFiles[0]}`);

const adminJsContent = fs.readFileSync(path.join(adminJsPath, jsFiles[0]), 'utf-8');
const jsSize = (fs.statSync(path.join(adminJsPath, jsFiles[0])).size / 1024).toFixed(2);
console.log(`  大小: ${jsSize} KB`);

// 检查关键组件
console.log('\n[测试3] 检查关键组件...');
const components = [
  'Dashboard',
  'User',
  'Node',
  'Shop',
  'Ticket',
  'Announcement',
  'AdminLayout'
];

const componentsFound = [];
const componentsMissing = [];

// 检查所有生成的JS文件
const allJsFiles = fs.readdirSync(adminJsPath).filter(f => f.endsWith('.js'));
let allJsContent = '';
allJsFiles.forEach(file => {
  try {
    allJsContent += fs.readFileSync(path.join(adminJsPath, file), 'utf-8') + '\n';
  } catch (e) {
    // 忽略读取错误
  }
});

components.forEach(comp => {
  if (allJsContent.includes(comp)) {
    componentsFound.push(comp);
    console.log(`✓ ${comp}组件已构建`);
  } else {
    componentsMissing.push(comp);
    console.log(`❌ ${comp}组件未找到`);
  }
});

console.log('\n[测试4] 检查Vue Router...');
if (allJsContent.includes('createRouter') || allJsContent.includes('vue-router')) {
  console.log('✓ Vue Router已配置');
} else {
  console.log('⚠ Vue Router配置未找到');
}

console.log('\n[测试5] 检查Element Plus...');
if (allJsContent.includes('element-plus')) {
  console.log('✓ Element Plus已打包');
} else {
  console.log('❌ Element Plus未找到');
}

console.log('\n========================================');
console.log('  测试总结');
console.log('========================================');
console.log(`✓ 组件找到: ${componentsFound.length}/${components.length}`);
if (componentsMissing.length > 0) {
  console.log(`❌ 组件缺失: ${componentsMissing.join(', ')}`);
}
console.log('\n部署信息:');
console.log(`  部署目录: /var/www/test-spanel.freessr.bid/`);
console.log(`  访问URL: https://test-spanel-bun.freessr.bid/admin/`);
console.log('\n下一步:');
console.log('  1. 清除浏览器缓存');
console.log('  2. 访问 https://test-spanel-bun.freessr.bid/admin/');
console.log('  3. 使用提供的账号登录');
console.log('  4. 测试标签切换功能\n');

if (componentsMissing.length > 0) {
  process.exit(1);
}
