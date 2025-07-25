// 简单的术语识别测试脚本
// 注意：这是一个简化的测试，实际使用需要在Obsidian环境中

const fs = require('fs');

// 模拟基本的数据结构
class MockMathTerm {
    constructor(chineseName, category, latexCode, aliases = []) {
        this.id = `term_${chineseName}_${Date.now()}`;
        this.chineseName = chineseName;
        this.category = category;
        this.latexCode = latexCode;
        this.aliases = aliases;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

// 模拟词典
class MockDictionary {
    constructor() {
        this.terms = new Map();
        this.initializeTerms();
    }

    initializeTerms() {
        const terms = [
            new MockMathTerm('函数', '代数', 'f(x)', ['映射']),
            new MockMathTerm('方程', '代数', 'ax + b = 0', ['等式']),
            new MockMathTerm('导数', '微积分', "f'(x)", ['微分']),
            new MockMathTerm('积分', '微积分', '\\int f(x) dx'),
            new MockMathTerm('极限', '微积分', '\\lim_{x \\to a} f(x)'),
            new MockMathTerm('三角形', '几何', '\\triangle ABC'),
            new MockMathTerm('矩阵', '线性代数', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'),
            new MockMathTerm('向量', '线性代数', '\\vec{v}', ['矢量']),
            new MockMathTerm('平均数', '统计', '\\bar{x}', ['均值']),
            new MockMathTerm('质数', '数论', 'p', ['素数']),
        ];

        for (const term of terms) {
            this.terms.set(term.chineseName, term);
            // 添加别名映射
            for (const alias of term.aliases) {
                this.terms.set(alias, term);
            }
        }
    }

    getAllTerms() {
        const uniqueTerms = new Map();
        for (const term of this.terms.values()) {
            uniqueTerms.set(term.id, term);
        }
        return Array.from(uniqueTerms.values());
    }
}

// 模拟文本扫描器
class MockTextScanner {
    constructor(dictionary) {
        this.dictionary = dictionary;
    }

    async scanText(text) {
        const recognizedTerms = [];
        const allTerms = this.dictionary.getAllTerms();
        
        // 按长度降序排列，优先匹配长术语
        const sortedTerms = allTerms.sort((a, b) => b.chineseName.length - a.chineseName.length);
        
        const matchedPositions = new Set();
        
        for (const term of sortedTerms) {
            const matches = this.findTermMatches(text, term.chineseName, matchedPositions);
            
            for (const match of matches) {
                const recognizedTerm = {
                    text: term.chineseName,
                    startIndex: match.start,
                    endIndex: match.end,
                    confidence: 0.8, // 简化的置信度
                    category: term.category,
                    suggestedLatex: term.latexCode
                };
                
                recognizedTerms.push(recognizedTerm);
                
                // 标记已匹配的位置
                for (let i = match.start; i < match.end; i++) {
                    matchedPositions.add(i);
                }
            }
            
            // 检查别名
            for (const alias of term.aliases) {
                const aliasMatches = this.findTermMatches(text, alias, matchedPositions);
                
                for (const match of aliasMatches) {
                    const recognizedTerm = {
                        text: alias,
                        startIndex: match.start,
                        endIndex: match.end,
                        confidence: 0.7, // 别名置信度稍低
                        category: term.category,
                        suggestedLatex: term.latexCode
                    };
                    
                    recognizedTerms.push(recognizedTerm);
                    
                    // 标记已匹配的位置
                    for (let i = match.start; i < match.end; i++) {
                        matchedPositions.add(i);
                    }
                }
            }
        }
        
        // 按位置排序
        recognizedTerms.sort((a, b) => a.startIndex - b.startIndex);
        
        return recognizedTerms;
    }

    findTermMatches(text, termName, excludePositions) {
        const matches = [];
        let searchIndex = 0;
        
        while (searchIndex < text.length) {
            const index = text.indexOf(termName, searchIndex);
            if (index === -1) break;
            
            const endIndex = index + termName.length;
            
            // 检查是否与已匹配位置重叠
            let hasOverlap = false;
            for (let i = index; i < endIndex; i++) {
                if (excludePositions.has(i)) {
                    hasOverlap = true;
                    break;
                }
            }
            
            if (!hasOverlap) {
                matches.push({ start: index, end: endIndex });
            }
            
            searchIndex = index + 1;
        }
        
        return matches;
    }
}

// 运行测试
async function runTest() {
    console.log('=== 数学术语识别引擎测试 ===\n');
    
    try {
        // 读取测试文件
        const testContent = fs.readFileSync('test-recognition.md', 'utf8');
        console.log('测试文档内容长度:', testContent.length, '字符\n');
        
        // 初始化模拟组件
        const dictionary = new MockDictionary();
        const scanner = new MockTextScanner(dictionary);
        
        console.log('词典中的术语数量:', dictionary.getAllTerms().length, '\n');
        
        // 执行术语识别
        console.log('开始识别术语...');
        const startTime = Date.now();
        const recognizedTerms = await scanner.scanText(testContent);
        const endTime = Date.now();
        
        console.log(`识别完成，耗时: ${endTime - startTime}ms`);
        console.log(`识别到 ${recognizedTerms.length} 个术语:\n`);
        
        // 按类别分组显示结果
        const termsByCategory = {};
        for (const term of recognizedTerms) {
            if (!termsByCategory[term.category]) {
                termsByCategory[term.category] = [];
            }
            termsByCategory[term.category].push(term);
        }
        
        for (const [category, terms] of Object.entries(termsByCategory)) {
            console.log(`【${category}】 (${terms.length}个):`);
            for (const term of terms) {
                console.log(`  - ${term.text} (置信度: ${(term.confidence * 100).toFixed(1)}%, LaTeX: ${term.suggestedLatex})`);
            }
            console.log('');
        }
        
        // 显示统计信息
        console.log('=== 统计信息 ===');
        console.log('总识别术语数:', recognizedTerms.length);
        console.log('平均置信度:', (recognizedTerms.reduce((sum, term) => sum + term.confidence, 0) / recognizedTerms.length * 100).toFixed(1) + '%');
        console.log('类别分布:', Object.keys(termsByCategory).map(cat => `${cat}(${termsByCategory[cat].length})`).join(', '));
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 运行测试
runTest();