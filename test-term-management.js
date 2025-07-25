// 测试术语管理界面的简单脚本
// 这个脚本可以在Obsidian开发者控制台中运行来测试功能

console.log('开始测试术语管理界面...');

// 获取插件实例
const plugin = app.plugins.plugins['obsidian-math-memory-graph'];
if (!plugin) {
    console.error('插件未找到或未启用');
} else {
    console.log('插件已找到:', plugin);
    
    // 获取数据库管理器
    const databaseManager = plugin.getServiceManager()?.getDatabaseManager();
    if (!databaseManager) {
        console.error('数据库管理器未初始化');
    } else {
        console.log('数据库管理器已找到');
        
        // 添加一些测试术语
        const testTerms = [
            {
                id: 'test_derivative_001',
                chineseName: '导数',
                englishName: 'Derivative',
                category: '微积分',
                latexCode: '\\frac{d}{dx}',
                definition: '函数在某点的变化率，表示函数图像在该点的切线斜率',
                aliases: ['微分', '求导'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'test_integral_001',
                chineseName: '积分',
                englishName: 'Integral',
                category: '微积分',
                latexCode: '\\int',
                definition: '求函数图像与坐标轴围成的面积，是导数的逆运算',
                aliases: ['求积', '积分运算'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'test_matrix_001',
                chineseName: '矩阵',
                englishName: 'Matrix',
                category: '线性代数',
                latexCode: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
                definition: '由数字排列成的矩形阵列，是线性代数的基本概念',
                aliases: ['方阵', '矩阵表'],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        // 异步添加测试术语
        (async () => {
            try {
                for (const term of testTerms) {
                    await databaseManager.saveTerm(term);
                    console.log(`已添加测试术语: ${term.chineseName}`);
                }
                
                // 获取所有术语验证
                const allTerms = await databaseManager.getAllTerms();
                console.log(`数据库中共有 ${allTerms.length} 个术语`);
                
                // 获取统计信息
                const stats = await databaseManager.getTermStatistics();
                console.log('术语统计:', stats);
                
                console.log('测试数据添加完成！现在可以打开术语管理界面查看效果。');
                console.log('使用命令: Ctrl+P -> "打开术语管理"');
                
            } catch (error) {
                console.error('添加测试数据失败:', error);
            }
        })();
    }
}