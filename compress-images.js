const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const MAX_SIZE = 1 * 1024 * 1024;
const BASE_DIR = path.join(__dirname, 'images', 'cardGame', 'img');
const OUTPUT_DIR = path.join(BASE_DIR, 'compressed');
const folders = ['boss', 'enemy', 'minion'];

async function fileExists(filepath) {
    try {
        await fs.access(filepath);
        return true;
    } catch {
        return false;
    }
}

async function compressImage(inputPath) {
    const filename = path.basename(inputPath);
    
    try {
        // 先尝试 PNG 压缩
        let buffer = await sharp(inputPath)
            .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
            .toBuffer();

        let format = 'png';
        
        // PNG 仍太大则转为 JPEG
        if (buffer.length > MAX_SIZE) {
            for (let quality = 85; quality >= 50; quality -= 5) {
                buffer = await sharp(inputPath).jpeg({ quality, mozjpeg: true }).toBuffer();
                if (buffer.length <= MAX_SIZE) {
                    format = 'jpg';
                    break;
                }
            }
            // 如果最低质量仍超过限制，直接用最低质量
            if (format !== 'jpg') {
                buffer = await sharp(inputPath).jpeg({ quality: 50, mozjpeg: true }).toBuffer();
                format = 'jpg';
            }
        }

        const ext = format === 'png' ? '.png' : '.jpg';
        const outputFilename = filename.replace(/\.[^.]+$/, '') + ext;
        const outputPath = path.join(OUTPUT_DIR, outputFilename);

        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        await fs.writeFile(outputPath, buffer);

        const originalSize = (await fs.stat(inputPath)).size;
        const saved = ((originalSize - buffer.length) / originalSize * 100).toFixed(1);
        
        return {
            success: true,
            original: originalSize,
            compressed: buffer.length,
            saved,
            format
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function processFolder(folder) {
    const folderPath = path.join(BASE_DIR, folder);
    const stats = { total: 0, success: 0, failed: 0, errors: [] };
    
    try {
        const files = await fs.readdir(folderPath);
        const images = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f));
        
        for (const file of images) {
            stats.total++;
            const inputPath = path.join(folderPath, file);
            const result = await compressImage(inputPath);
            
            if (result.success) {
                stats.success++;
                const originalMB = (result.original / 1024 / 1024).toFixed(2);
                const compressedMB = (result.compressed / 1024 / 1024).toFixed(2);
                console.log(`✓ ${folder}/${file}: ${originalMB}MB → ${compressedMB}MB (节省${result.saved}%) [${result.format.toUpperCase()}]`);
            } else {
                stats.failed++;
                stats.errors.push(`${folder}/${file}: ${result.error}`);
                console.log(`✗ ${folder}/${file}: ${result.error}`);
            }
        }
    } catch (err) {
        console.error(`文件夹处理错误 ${folder}:`, err.message);
    }
    
    return stats;
}

async function main() {
    console.log('🚀 开始压缩图片 (目标: <1MB)\n');
    console.log('=' .repeat(60));
    
    let totalStats = { total: 0, success: 0, failed: 0 };
    
    for (const folder of folders) {
        const stats = await processFolder(folder);
        totalStats.total += stats.total;
        totalStats.success += stats.success;
        totalStats.failed += stats.failed;
    }
    
    console.log('=' .repeat(60));
    console.log(`\n📊 汇总: 成功 ${totalStats.success}/${totalStats.total} 个`);
    console.log(`📁 压缩文件已保存至: ${OUTPUT_DIR}`);
}

main();
