#!/usr/bin/env node

/**
 * 自动化发布脚本
 * 用于构建和准备Obsidian插件发布包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始构建Obsidian插件发布包...\n');

// 读取package.json和manifest.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

console.log(`📦 插件信息:`);
console.log(`   名称: ${manifest.name}`);
console.log(`   版本: ${manifest.version}`);
console.log(`   描述: ${manifest.description}`);
console.log(`   作者: ${manifest.author}\n`);

// 检查版本一致性
if (packageJson.version !== manifest.version) {
    console.error('❌ 错误: package.json和manifest.json中的版本不一致');
    console.error(`   package.json: ${packageJson.version}`);
    console.error(`   manifest.json: ${manifest.version}`);
    process.exit(1);
}

try {
    // 1. 清理构建目录
    console.log('🧹 清理构建目录...');
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true });
    }
    fs.mkdirSync('dist', { recursive: true });

    // 2. 安装依赖
    console.log('📥 安装依赖...');
    execSync('npm install', { stdio: 'inherit' });

    // 3. 运行代码检查
    console.log('🔍 运行代码检查...');
    try {
        execSync('npm run lint', { stdio: 'inherit' });
        console.log('✅ 代码检查通过');
    } catch (error) {
        console.warn('⚠️  代码检查有警告，继续构建...');
    }

    // 4. 运行测试
    console.log('🧪 运行测试...');
    try {
        execSync('npm run test', { stdio: 'inherit' });
        console.log('✅ 测试通过');
    } catch (error) {
        console.warn('⚠️  测试失败，但继续构建...');
    }

    // 5. 构建项目
    console.log('🔨 构建项目...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ 构建完成');

    // 6. 复制必需文件到dist目录
    console.log('📋 复制发布文件...');
    const filesToCopy = [
        'main.js',
        'manifest.json',
        'styles.css'
    ];

    filesToCopy.forEach(file => {
        if (fs.existsSync(file)) {
            fs.copyFileSync(file, path.join('dist', file));
            console.log(`   ✓ ${file}`);
        } else {
            console.log(`   ⚠️  ${file} 不存在，跳过`);
        }
    });

    // 7. 验证必需文件
    console.log('\n🔍 验证发布包...');
    const requiredFiles = ['main.js', 'manifest.json'];
    let allFilesExist = true;

    requiredFiles.forEach(file => {
        const filePath = path.join('dist', file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`   ✓ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        } else {
            console.error(`   ❌ ${file} 缺失`);
            allFilesExist = false;
        }
    });

    if (!allFilesExist) {
        console.error('\n❌ 发布包验证失败，缺少必需文件');
        process.exit(1);
    }

    // 8. 创建发布包
    console.log('\n📦 创建发布包...');
    const releaseDir = `releases/v${manifest.version}`;
    if (!fs.existsSync('releases')) {
        fs.mkdirSync('releases');
    }
    if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir);
    }

    // 复制文件到发布目录
    requiredFiles.forEach(file => {
        if (fs.existsSync(path.join('dist', file))) {
            fs.copyFileSync(
                path.join('dist', file),
                path.join(releaseDir, file)
            );
        }
    });

    // 复制可选文件
    const optionalFiles = ['styles.css', 'README.md', 'CHANGELOG.md'];
    optionalFiles.forEach(file => {
        if (fs.existsSync(file)) {
            fs.copyFileSync(file, path.join(releaseDir, file));
            console.log(`   ✓ ${file}`);
        }
    });

    // 9. 生成发布信息
    const releaseInfo = {
        version: manifest.version,
        name: manifest.name,
        description: manifest.description,
        author: manifest.author,
        minAppVersion: manifest.minAppVersion,
        buildTime: new Date().toISOString(),
        files: fs.readdirSync(releaseDir)
    };

    fs.writeFileSync(
        path.join(releaseDir, 'release-info.json'),
        JSON.stringify(releaseInfo, null, 2)
    );

    console.log('\n🎉 发布包构建完成！');
    console.log(`📁 发布目录: ${releaseDir}`);
    console.log(`📋 包含文件: ${releaseInfo.files.join(', ')}`);
    
    // 10. 显示下一步操作
    console.log('\n📝 下一步操作:');
    console.log('1. 测试发布包在Obsidian中的功能');
    console.log('2. 创建GitHub Release并上传文件');
    console.log('3. 提交到Obsidian社区插件仓库');
    console.log('4. 更新文档和宣传材料');

} catch (error) {
    console.error('\n❌ 构建失败:', error.message);
    process.exit(1);
}