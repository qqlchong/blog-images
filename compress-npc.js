const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// npc 图片压缩配置
const config = {
  inputDir: path.join(__dirname, 'images/cardGame/img/npc'),
  outputDir: path.join(__dirname, 'images/cardGame/img/npc/compressed'),
  maxSizeBytes: 1 * 1024 * 1024, // 1MB
  initialQuality: 95,
  minQuality: 50,
  qualityStep: 5
};

// 确保输出目录存在
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// 获取所有 PNG 和 JPG 图片
function getImageFiles(dir) {
  const files = fs.readdirSync(dir);
  return files.filter(file => /\.(png|jpg|jpeg)$/i.test(file));
}

// 压缩单张图片到指定质量
async function compressImage(inputPath, outputPath, quality) {
  await sharp(inputPath)
    .webp({ quality: quality })
    .toFile(outputPath);
  
  const stats = fs.statSync(outputPath);
  return stats.size;
}

// 智能压缩：自动调整质量直到文件小于1MB
async function smartCompress(inputPath, filename) {
  const baseName = path.basename(filename, path.extname(filename));
  const outputPath = path.join(config.outputDir, `${baseName}.webp`);
  
  // 获取原始文件信息
  const originalStats = fs.statSync(inputPath);
  const originalSize = originalStats.size;
  
  console.log(`\n📁 正在处理: ${filename}`);
  console.log(`   原始大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  
  let quality = config.initialQuality;
  let finalSize = originalSize;
  
  // 尝试不同质量级别
  while (quality >= config.minQuality) {
    await compressImage(inputPath, outputPath, quality);
    finalSize = fs.statSync(outputPath).size;
    
    console.log(`   质量 ${quality}%: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (finalSize <= config.maxSizeBytes) {
      console.log(`   ✅ 压缩成功！`);
      break;
    }
    
    quality -= config.qualityStep;
  }
  
  // 如果最低质量仍超过1MB，提示用户
  if (finalSize > config.maxSizeBytes) {
    console.log(`   ⚠️ 警告: 即使质量 ${config.minQuality}% 仍超过 1MB`);
    console.log(`   使用质量 ${quality + config.qualityStep}% 的结果: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
  }
  
  const compressionRatio = ((1 - finalSize / originalSize) * 100).toFixed(1);
  
  return {
    filename,
    originalSize,
    finalSize,
    compressionRatio,
    outputPath
  };
}

// 主函数
async function main() {
  console.log('🎮 NPC 图片 WebP 压缩工具');
  console.log('=' .repeat(50));
  console.log(`📂 输入目录: ${config.inputDir}`);
  console.log(`📂 输出目录: ${config.outputDir}`);
  console.log(`🎯 目标大小: ${config.maxSizeBytes / 1024 / 1024} MB`);
  console.log('=' .repeat(50));
  
  const imageFiles = getImageFiles(config.inputDir);
  
  if (imageFiles.length === 0) {
    console.log('❌ 未找到图片文件');
    return;
  }
  
  console.log(`\n📊 找到 ${imageFiles.length} 个图片文件\n`);
  
  const results = [];
  
  for (const filename of imageFiles) {
    const inputPath = path.join(config.inputDir, filename);
    const result = await smartCompress(inputPath, filename);
    results.push(result);
  }
  
  // 打印汇总
  console.log('\n' + '=' .repeat(50));
  console.log('📋 压缩结果汇总');
  console.log('=' .repeat(50));
  
  let totalOriginal = 0;
  let totalFinal = 0;
  
  for (const result of results) {
    console.log(`\n${result.filename}:`);
    console.log(`  原始大小: ${(result.originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  压缩后:   ${(result.finalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  压缩率:   ${result.compressionRatio}%`);
    console.log(`  输出文件: ${result.outputPath}`);
    
    totalOriginal += result.originalSize;
    totalFinal += result.finalSize;
  }
  
  console.log('\n' + '-'.repeat(50));
  console.log(`总原始大小: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`总压缩后:   ${(totalFinal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`总压缩率:   ${((1 - totalFinal / totalOriginal) * 100).toFixed(1)}%`);
  console.log('=' .repeat(50));
  console.log('✨ 压缩完成！');
}

// 执行
main().catch(console.error);
