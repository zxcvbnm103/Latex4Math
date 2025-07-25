/**
 * 中文数学术语到LaTeX的训练数据集生成器
 */

class MathTermDatasetGenerator {
    constructor() {
        this.baseTerms = this.initializeBaseTerms();
        this.contextPatterns = this.initializeContextPatterns();
        this.augmentationRules = this.initializeAugmentationRules();
    }

    initializeBaseTerms() {
        return {
            // 基础运算
            basic_operations: [
                { chinese: "加法", latex: "+", variants: ["相加", "求和", "加起来"] },
                { chinese: "减法", latex: "-", variants: ["相减", "减去", "差"] },
                { chinese: "乘法", latex: "\\times", variants: ["相乘", "乘以", "积"] },
                { chinese: "除法", latex: "\\div", variants: ["相除", "除以", "商"] },
                { chinese: "等于", latex: "=", variants: ["等同于", "相等"] },
                { chinese: "不等于", latex: "\\neq", variants: ["不等", "不相等"] },
                { chinese: "大于", latex: ">", variants: ["超过", "多于"] },
                { chinese: "小于", latex: "<", variants: ["少于", "低于"] },
                { chinese: "大于等于", latex: "\\geq", variants: ["不小于", "至少"] },
                { chinese: "小于等于", latex: "\\leq", variants: ["不大于", "至多"] }
            ],

            // 微积分
            calculus: [
                { chinese: "导数", latex: "\\frac{d}{dx}", variants: ["求导", "微分", "导函数"] },
                { chinese: "偏导数", latex: "\\frac{\\partial}{\\partial x}", variants: ["偏微分"] },
                { chinese: "二阶导数", latex: "\\frac{d^2}{dx^2}", variants: ["二次导数"] },
                { chinese: "积分", latex: "\\int", variants: ["求积分", "积分运算"] },
                { chinese: "定积分", latex: "\\int_{a}^{b}", variants: ["有限积分"] },
                { chinese: "不定积分", latex: "\\int", variants: ["原函数"] },
                { chinese: "二重积分", latex: "\\iint", variants: ["双重积分"] },
                { chinese: "三重积分", latex: "\\iiint", variants: ["三元积分"] },
                { chinese: "曲线积分", latex: "\\oint", variants: ["环积分"] },
                { chinese: "极限", latex: "\\lim", variants: ["趋向", "逼近"] },
                { chinese: "无穷大", latex: "\\infty", variants: ["无限大", "无穷"] },
                { chinese: "梯度", latex: "\\nabla", variants: ["grad"] },
                { chinese: "散度", latex: "\\nabla \\cdot", variants: ["div"] },
                { chinese: "旋度", latex: "\\nabla \\times", variants: ["curl"] }
            ],

            // 线性代数
            linear_algebra: [
                { chinese: "矩阵", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", variants: ["方阵"] },
                { chinese: "行列式", latex: "\\det", variants: ["determinant"] },
                { chinese: "向量", latex: "\\vec{v}", variants: ["矢量"] },
                { chinese: "单位向量", latex: "\\hat{u}", variants: ["标准向量"] },
                { chinese: "点积", latex: "\\cdot", variants: ["内积", "数量积"] },
                { chinese: "叉积", latex: "\\times", variants: ["外积", "向量积"] },
                { chinese: "转置", latex: "^T", variants: ["transpose"] },
                { chinese: "逆矩阵", latex: "^{-1}", variants: ["inverse"] },
                { chinese: "特征值", latex: "\\lambda", variants: ["eigenvalue"] },
                { chinese: "特征向量", latex: "\\vec{v}", variants: ["eigenvector"] },
                { chinese: "矩阵的秩", latex: "\\text{rank}", variants: ["rank"] },
                { chinese: "矩阵的迹", latex: "\\text{tr}", variants: ["trace"] }
            ],

            // 概率统计
            probability: [
                { chinese: "概率", latex: "P", variants: ["几率", "可能性"] },
                { chinese: "条件概率", latex: "P(A|B)", variants: ["给定条件下的概率"] },
                { chinese: "期望", latex: "E[X]", variants: ["数学期望", "均值"] },
                { chinese: "方差", latex: "\\text{Var}(X)", variants: ["variance"] },
                { chinese: "标准差", latex: "\\sigma", variants: ["标准偏差"] },
                { chinese: "协方差", latex: "\\text{Cov}(X,Y)", variants: ["covariance"] },
                { chinese: "相关系数", latex: "\\rho", variants: ["correlation"] },
                { chinese: "正态分布", latex: "N(\\mu, \\sigma^2)", variants: ["高斯分布"] },
                { chinese: "二项分布", latex: "B(n,p)", variants: ["binomial"] },
                { chinese: "泊松分布", latex: "P(\\lambda)", variants: ["Poisson"] },
                { chinese: "指数分布", latex: "\\text{Exp}(\\lambda)", variants: ["exponential"] }
            ],

            // 几何
            geometry: [
                { chinese: "角度", latex: "\\angle", variants: ["夹角"] },
                { chinese: "直角", latex: "\\perp", variants: ["90度角"] },
                { chinese: "平行", latex: "\\parallel", variants: ["平行线"] },
                { chinese: "垂直", latex: "\\perp", variants: ["垂直线"] },
                { chinese: "三角形", latex: "\\triangle", variants: ["三角"] },
                { chinese: "圆", latex: "\\circ", variants: ["圆形"] },
                { chinese: "椭圆", latex: "\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1", variants: ["椭圆形"] },
                { chinese: "抛物线", latex: "y = ax^2 + bx + c", variants: ["parabola"] },
                { chinese: "双曲线", latex: "\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1", variants: ["hyperbola"] },
                { chinese: "相似", latex: "\\sim", variants: ["相似于"] },
                { chinese: "全等", latex: "\\cong", variants: ["全等于"] }
            ],

            // 集合论
            set_theory: [
                { chinese: "属于", latex: "\\in", variants: ["包含于", "是...的元素"] },
                { chinese: "不属于", latex: "\\notin", variants: ["不包含于"] },
                { chinese: "子集", latex: "\\subset", variants: ["包含"] },
                { chinese: "真子集", latex: "\\subsetneq", variants: ["真包含"] },
                { chinese: "并集", latex: "\\cup", variants: ["联合", "合并"] },
                { chinese: "交集", latex: "\\cap", variants: ["相交"] },
                { chinese: "差集", latex: "\\setminus", variants: ["相减"] },
                { chinese: "补集", latex: "^c", variants: ["complement"] },
                { chinese: "空集", latex: "\\emptyset", variants: ["空的集合"] },
                { chinese: "全集", latex: "U", variants: ["universe"] },
                { chinese: "幂集", latex: "\\mathcal{P}", variants: ["power set"] }
            ],

            // 逻辑
            logic: [
                { chinese: "且", latex: "\\land", variants: ["并且", "和"] },
                { chinese: "或", latex: "\\lor", variants: ["或者"] },
                { chinese: "非", latex: "\\neg", variants: ["不", "否定"] },
                { chinese: "蕴含", latex: "\\Rightarrow", variants: ["推出", "导致"] },
                { chinese: "等价", latex: "\\Leftrightarrow", variants: ["当且仅当", "充要条件"] },
                { chinese: "存在", latex: "\\exists", variants: ["有", "存在着"] },
                { chinese: "任意", latex: "\\forall", variants: ["对于所有", "对任意"] },
                { chinese: "唯一存在", latex: "\\exists!", variants: ["存在唯一"] }
            ],

            // 数论
            number_theory: [
                { chinese: "整除", latex: "\\mid", variants: ["能被整除"] },
                { chinese: "不整除", latex: "\\nmid", variants: ["不能被整除"] },
                { chinese: "同余", latex: "\\equiv", variants: ["模同余"] },
                { chinese: "最大公约数", latex: "\\gcd", variants: ["最大公因数"] },
                { chinese: "最小公倍数", latex: "\\text{lcm}", variants: ["最小公倍数"] },
                { chinese: "素数", latex: "p", variants: ["质数", "prime"] },
                { chinese: "合数", latex: "n", variants: ["composite"] },
                { chinese: "欧拉函数", latex: "\\varphi", variants: ["phi函数"] }
            ],

            // 希腊字母
            greek_letters: [
                { chinese: "阿尔法", latex: "\\alpha", variants: ["α"] },
                { chinese: "贝塔", latex: "\\beta", variants: ["β"] },
                { chinese: "伽马", latex: "\\gamma", variants: ["γ"] },
                { chinese: "德尔塔", latex: "\\delta", variants: ["δ"] },
                { chinese: "艾普西龙", latex: "\\epsilon", variants: ["ε"] },
                { chinese: "西塔", latex: "\\theta", variants: ["θ"] },
                { chinese: "拉姆达", latex: "\\lambda", variants: ["λ"] },
                { chinese: "缪", latex: "\\mu", variants: ["μ"] },
                { chinese: "派", latex: "\\pi", variants: ["π"] },
                { chinese: "西格玛", latex: "\\sigma", variants: ["σ"] },
                { chinese: "欧米伽", latex: "\\omega", variants: ["ω"] }
            ],

            // 特殊符号
            special_symbols: [
                { chinese: "分数", latex: "\\frac{a}{b}", variants: ["比值", "除法"] },
                { chinese: "根号", latex: "\\sqrt{x}", variants: ["平方根", "开方"] },
                { chinese: "立方根", latex: "\\sqrt[3]{x}", variants: ["三次方根"] },
                { chinese: "上标", latex: "x^{n}", variants: ["指数", "幂"] },
                { chinese: "下标", latex: "x_{i}", variants: ["索引"] },
                { chinese: "求和符号", latex: "\\sum", variants: ["sigma求和"] },
                { chinese: "乘积符号", latex: "\\prod", variants: ["连乘"] },
                { chinese: "约等于", latex: "\\approx", variants: ["近似等于"] },
                { chinese: "正比于", latex: "\\propto", variants: ["成正比"] },
                { chinese: "因此", latex: "\\therefore", variants: ["所以"] },
                { chinese: "因为", latex: "\\because", variants: ["由于"] }
            ]
        };
    }

    initializeContextPatterns() {
        return [
            // 函数相关
            "函数{term}的值",
            "计算{term}",
            "求{term}",
            "{term}运算",
            "使用{term}",
            
            // 方程相关
            "解{term}方程",
            "{term}等式",
            "建立{term}",
            
            // 几何相关
            "画{term}",
            "{term}的性质",
            "证明{term}",
            
            // 一般数学表达
            "这里的{term}表示",
            "其中{term}是",
            "设{term}为",
            "令{term}等于"
        ];
    }

    initializeAugmentationRules() {
        return {
            // 添加噪声
            noise: [
                "呃", "嗯", "那个", "这个", "就是"
            ],
            
            // 同义词替换
            synonyms: {
                "计算": ["求解", "算出", "得到"],
                "函数": ["方程", "表达式"],
                "值": ["结果", "答案"],
                "等于": ["是", "为"]
            },
            
            // 语法变化
            grammar_variations: [
                "{term}怎么算",
                "如何计算{term}",
                "{term}的计算方法",
                "求{term}的公式"
            ]
        };
    }

    generateTrainingData(numSamples = 10000) {
        const dataset = [];
        const allTerms = this.flattenTerms();
        
        for (let i = 0; i < numSamples; i++) {
            const sample = this.generateSample(allTerms);
            dataset.push(sample);
        }
        
        return dataset;
    }

    flattenTerms() {
        const flattened = [];
        
        Object.values(this.baseTerms).forEach(category => {
            category.forEach(term => {
                // 主要术语
                flattened.push({
                    chinese: term.chinese,
                    latex: term.latex,
                    category: this.getCategoryName(term)
                });
                
                // 变体
                term.variants.forEach(variant => {
                    flattened.push({
                        chinese: variant,
                        latex: term.latex,
                        category: this.getCategoryName(term)
                    });
                });
            });
        });
        
        return flattened;
    }

    generateSample(allTerms) {
        const term = allTerms[Math.floor(Math.random() * allTerms.length)];
        
        // 对于单术语转换，直接使用术语本身作为输入
        let input = term.chinese;
        
        // 添加轻微的数据增强（保持术语完整性）
        input = this.applyLightAugmentation(input);
        
        // 生成输出LaTeX
        const output = term.latex;
        
        return {
            input: input,
            output: output,
            category: term.category,
            confidence: this.calculateConfidence(term, input)
        };
    }

    // 轻量级数据增强，专门用于单术语
    applyLightAugmentation(term) {
        const augmentations = [];
        
        // 原始术语
        augmentations.push(term);
        
        // 添加标点符号变化
        if (Math.random() < 0.2) {
            augmentations.push(term + '。');
        }
        
        // 添加空格变化
        if (Math.random() < 0.1) {
            augmentations.push(term.split('').join(' '));
        }
        
        // 添加简单的前后缀
        const prefixes = ['求', '计算', '这个'];
        const suffixes = ['是什么', '怎么写', '的符号'];
        
        if (Math.random() < 0.3) {
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            augmentations.push(prefix + term);
        }
        
        if (Math.random() < 0.3) {
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            augmentations.push(term + suffix);
        }
        
        return augmentations[Math.floor(Math.random() * augmentations.length)];
    }

    applyAugmentation(text) {
        // 随机添加噪声词
        if (Math.random() < 0.1) {
            const noise = this.augmentationRules.noise[Math.floor(Math.random() * this.augmentationRules.noise.length)];
            text = noise + text;
        }
        
        // 同义词替换
        Object.entries(this.augmentationRules.synonyms).forEach(([original, synonyms]) => {
            if (text.includes(original) && Math.random() < 0.3) {
                const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
                text = text.replace(original, synonym);
            }
        });
        
        return text;
    }

    calculateConfidence(term, input) {
        // 基于术语复杂度和上下文匹配度计算置信度
        let confidence = 0.8;
        
        // LaTeX复杂度调整
        if (term.latex.length > 20) confidence -= 0.1;
        if (term.latex.includes('\\begin{')) confidence -= 0.1;
        
        // 上下文匹配度调整
        if (input.includes('计算') || input.includes('求')) confidence += 0.1;
        
        return Math.max(0.1, Math.min(1.0, confidence));
    }

    getCategoryName(term) {
        // 根据术语确定类别
        for (const [categoryName, terms] of Object.entries(this.baseTerms)) {
            if (terms.includes(term)) {
                return categoryName;
            }
        }
        return 'unknown';
    }

    exportDataset(dataset, format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(dataset, null, 2);
            
            case 'csv':
                const headers = 'input,output,category,confidence\n';
                const rows = dataset.map(item => 
                    `"${item.input}","${item.output}","${item.category}",${item.confidence}`
                ).join('\n');
                return headers + rows;
            
            case 'jsonl':
                return dataset.map(item => JSON.stringify(item)).join('\n');
            
            default:
                return dataset;
        }
    }

    // 生成验证集
    generateValidationData(numSamples = 1000) {
        return this.generateTrainingData(numSamples);
    }

    // 生成测试集
    generateTestData(numSamples = 500) {
        const testCases = [
            // 边界情况
            { input: "这个导数怎么求", expected_output: "\\frac{d}{dx}" },
            { input: "计算积分", expected_output: "\\int" },
            { input: "矩阵的行列式", expected_output: "\\det" },
            
            // 复杂表达
            { input: "求函数f(x)对x的导数", expected_output: "\\frac{d}{dx}" },
            { input: "计算从a到b的定积分", expected_output: "\\int_{a}^{b}" },
            
            // 多术语
            { input: "导数和积分的关系", expected_output: "\\frac{d}{dx}" }, // 应该识别主要术语
        ];
        
        return testCases;
    }
}

// 使用示例
const generator = new MathTermDatasetGenerator();

// 生成训练数据
const trainingData = generator.generateTrainingData(5000);
const validationData = generator.generateValidationData(1000);
const testData = generator.generateTestData(200);

console.log('📊 数据集生成完成:');
console.log(`训练集: ${trainingData.length} 样本`);
console.log(`验证集: ${validationData.length} 样本`);
console.log(`测试集: ${testData.length} 样本`);

// 显示样本
console.log('\n📝 训练样本示例:');
trainingData.slice(0, 5).forEach((sample, index) => {
    console.log(`${index + 1}. 输入: "${sample.input}"`);
    console.log(`   输出: "${sample.output}"`);
    console.log(`   类别: ${sample.category}`);
    console.log(`   置信度: ${sample.confidence}`);
    console.log('');
});

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MathTermDatasetGenerator,
        trainingData,
        validationData,
        testData
    };
}