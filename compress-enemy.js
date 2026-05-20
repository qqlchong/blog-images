//[AI-GEN-START]
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// enemy 图片压缩配置
const config = {
  inputDir: path.join(__dirname, 'images/cardGame/img/enemy'),
  maxSizeBytes: 1 * 1024 * 1024, // 1MB
  initialQuality: 95,
  minQuality: 50,
  qualityStep: 5,
  // 当质量降到最低仍超1MB时，尝试缩小尺寸
  resizeSteps: [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6]
};

// 13 张新增的 enemy 图片
const targetFiles = [
  'eliteIronward.png',
  'elite_eliteChaosborn.png',
  'elite_eliteLavacore.png',
  'elite_elitePhantom.png',
  'elite_eliteRiftlord.png',
  'elite_eliteSporemother.png',
  'enemy_chaosLarva.png',
  'enemy_curseBinder.png',
  'enemy_ironConstruct.png',
  'enemy_lavaLizard.png',
  'enemy_phantomWeaver.png',
  'enemy_toadstoolSpirit.png',
  'enemy_voidTentacle.png'
];

// 获取图片元数据
async function getImageMetadata(inputPath) {
  const metadata = await sharp(inputPath).metadata();
  return metadata;
}

// 压缩单张图片（可指定质量 + 缩放比例）
async function compressImage(inputPath, outputPath, quality, scale = 1.0) {
  let pipeline = sharp(inputPath);
  
  if (scale < 1.0) {
    const metadata = await getImageMetadata(inputPath);
    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);
    pipeline = pipeline.resize(newWidth, newHeight);
  }
  
  await pipeline.webp({ quality: quality }).toFile(outputPath);
  
  const stats = fs.statSync(outputPath);
  return stats.size;
}

// 智能压缩：自动调整质量 + 必要时缩小尺寸
async function smartCompress(filename) {
  const inputPath = path.join(config.inputDir, filename);
  const baseName = path.basename(filename, path.extname(filename));
  const outputPath = path.join(config.inputDir, `${baseName}.webp`);
  
  // 获取原始文件信息
  const originalStats = fs.statSync(inputPath);
  const originalSize = originalStats.size;
  const metadata = await getImageMetadata(inputPath);
  
  console.log(`\n📁 正在处理: ${filename}`);
  console.log(`   尺寸: ${metadata.width}x${metadata.height}`);
  console.log(`   原始大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  
  let quality = config.initialQuality;
  let scale = 1.0;
  let finalSize = originalSize;
  
  // 阶段1：尝试不同质量级别（保持原始尺寸）
  while (quality >= config.minQuality) {
    await compressImage(inputPath, outputPath, quality, scale);
    finalSize = fs.statSync(outputPath).size;
    
    console.log(`   质量 ${quality}%: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (finalSize <= config.maxSizeBytes) {
      console.log(`   ✅ 压缩成功！`);
      break;
    }
    
    quality -= config.qualityStep;
  }
  
  // 阶段2：如果最低质量仍超过1MB，尝试缩小尺寸
  if (finalSize > config.maxSizeBytes) {
    console.log(`   ⚠️ 最低质量仍超1MB，尝试缩小尺寸...`);
    quality = config.minQuality;
    
    for (let i = 0; i < config.resizeSteps.length; i++) {
      scale = config.resizeSteps[i];
      const newWidth = Math.round(metadata.width * scale);
      const newHeight = Math.round(metadata.height * scale);
      
      await compressImage(inputPath, outputPath, quality, scale);
      finalSize = fs.statSync(outputPath).size;
      
      console.log(`   缩放 ${(scale * 100).toFixed(0)}% (${newWidth}x${newHeight}), 质量 ${quality}%: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (finalSize <= config.maxSizeBytes) {
        console.log(`   ✅ 压缩成功！`);
        break;
      }
    }
  }
  
  // 最终检查
  if (finalSize > config.maxSizeBytes) {
    console.log(`   ❌ 无法压缩到1MB以下，当前: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
  }
  
  const compressionRatio = ((1 - finalSize / originalSize) * 100).toFixed(1);
  
  return {
    filename,
    originalSize,
    finalSize,
    compressionRatio,
    outputPath,
    quality,
    scale
  };
}

// 主函数
async function main() {
  console.log('🎮 Enemy 图片 WebP 压缩工具');
  console.log('='.repeat(50));
  console.log(`📂 输入目录: ${config.inputDir}`);
  console.log(`🎯 目标大小: ≤ ${config.maxSizeBytes / 1024 / 1024} MB`);
  console.log(`📝 待处理: ${targetFiles.length} 张图片`);
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const filename of targetFiles) {
    const inputPath = path.join(config.inputDir, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(inputPath)) {
      console.log(`\n⚠️ 跳过不存在的文件: ${filename}`);
      continue;
    }
    
    const result = await smartCompress(filename);
    results.push(result);
    
    // 压缩成功后，删除原 PNG
    if (result.finalSize <= config.maxSizeBytes) {
      fs.unlinkSync(inputPath);
      console.log(`   🗑️ 已删除原文件: ${filename}`);
    }
  }
  
  // 打印汇总
  console.log('\n' + '='.repeat(50));
  console.log('📋 压缩结果汇总');
  console.log('='.repeat(50));
  
  let totalOriginal = 0;
  let totalFinal = 0;
  let successCount = 0;
  let resizeCount = 0;
  
  for (const result of results) {
    console.log(`\n${result.filename}:`);
    console.log(`  原始大小: ${(result.originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  压缩后:   ${(result.finalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  压缩率:   ${result.compressionRatio}%`);
    console.log(`  最终质量: ${result.quality}%`);
    if (result.scale < 1.0) {
      console.log(`  缩放比例: ${(result.scale * 100).toFixed(0)}%`);
      resizeCount++;
    }
    console.log(`  输出文件: ${result.outputPath}`);
    
    if (result.finalSize <= config.maxSizeBytes) {
      successCount++;
    }
    
    totalOriginal += result.originalSize;
    totalFinal += result.finalSize;
  }
  
  console.log('\n' + '-'.repeat(50));
  console.log(`成功压缩: ${successCount}/${results.length} 张`);
  if (resizeCount > 0) {
    console.log(`需要缩放: ${resizeCount} 张`);
  }
  console.log(`总原始大小: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`总压缩后:   ${(totalFinal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`总压缩率:   ${((1 - totalFinal / totalOriginal) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  console.log('✨ 压缩完成！');
}

// 执行
main().catch(console.error);
//[AI-GEN-END]
