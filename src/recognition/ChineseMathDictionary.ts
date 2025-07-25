import { MathTerm, MathCategory } from '../types';

/**
 * 中文数学术语词典
 * 管理数学术语的存储、检索和扩展
 */
export class ChineseMathDictionary {
    private terms: Map<string, MathTerm> = new Map();
    private categoryIndex: Map<MathCategory, Set<string>> = new Map();
    private aliasIndex: Map<string, string> = new Map(); // 别名到主术语的映射
    private isInitialized: boolean = false;

    /**
     * 初始化词典，加载内置术语
     */
    async initialize(): Promise<void> {
        console.log('ChineseMathDictionary: 初始化中文数学术语词典...');
        
        try {
            // 加载内置术语
            await this.loadBuiltinTerms();
            
            // 初始化分类索引
            this.buildCategoryIndex();
            
            // 构建别名索引
            this.buildAliasIndex();
            
            this.isInitialized = true;
            console.log(`ChineseMathDictionary: 词典初始化完成，共加载 ${this.terms.size} 个术语`);
        } catch (error) {
            console.error('ChineseMathDictionary: 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 添加术语到词典
     */
    async addTerm(term: MathTerm): Promise<void> {
        // 生成ID（如果没有）
        if (!term.id) {
            term.id = this.generateTermId(term.chineseName);
        }

        // 设置时间戳
        const now = new Date();
        if (!term.createdAt) {
            term.createdAt = now;
        }
        term.updatedAt = now;

        // 添加到主索引
        this.terms.set(term.chineseName, term);
        
        // 更新分类索引
        this.addToCategory(term.category, term.chineseName);
        
        // 更新别名索引
        this.updateAliasIndex(term);
        
        console.log(`ChineseMathDictionary: 添加术语 ${term.chineseName}`);
    }

    /**
     * 查找术语
     */
    async findTerm(termName: string): Promise<MathTerm | null> {
        // 直接查找
        let term = this.terms.get(termName);
        if (term) {
            return term;
        }

        // 通过别名查找
        const mainTermName = this.aliasIndex.get(termName);
        if (mainTermName) {
            return this.terms.get(mainTermName) || null;
        }

        return null;
    }

    /**
     * 查找相似术语
     */
    async findSimilarTerms(query: string, maxResults: number = 5): Promise<MathTerm[]> {
        const results: Array<{term: MathTerm, score: number}> = [];
        
        Array.from(this.terms.entries()).forEach(([termName, term]) => {
            const score = this.calculateSimilarity(query, termName);
            if (score > 0.3) { // 相似度阈值
                results.push({ term, score });
            }
        });
        
        // 按相似度排序
        results.sort((a, b) => b.score - a.score);
        
        return results.slice(0, maxResults).map(r => r.term);
    }

    /**
     * 按分类获取术语
     */
    async getTermsByCategory(category: MathCategory): Promise<MathTerm[]> {
        const termNames = this.categoryIndex.get(category) || new Set();
        const terms: MathTerm[] = [];
        
        Array.from(termNames).forEach(termName => {
            const term = this.terms.get(termName);
            if (term) {
                terms.push(term);
            }
        });
        
        return terms;
    }

    /**
     * 搜索术语
     */
    async searchTerms(query: string): Promise<MathTerm[]> {
        const results: MathTerm[] = [];
        const queryLower = query.toLowerCase();
        
        Array.from(this.terms.entries()).forEach(([termName, term]) => {
            // 检查中文名称
            if (termName.includes(query)) {
                results.push(term);
                return;
            }
            
            // 检查英文名称
            if (term.englishName && term.englishName.toLowerCase().includes(queryLower)) {
                results.push(term);
                return;
            }
            
            // 检查定义
            if (term.definition && term.definition.includes(query)) {
                results.push(term);
                return;
            }
            
            // 检查别名
            for (const alias of term.aliases) {
                if (alias.includes(query)) {
                    results.push(term);
                    break;
                }
            }
        });
        
        return results;
    }

    /**
     * 获取所有术语
     */
    async getAllTerms(): Promise<MathTerm[]> {
        return Array.from(this.terms.values());
    }

    /**
     * 重新加载词典
     */
    async reload(): Promise<void> {
        this.terms.clear();
        this.categoryIndex.clear();
        this.aliasIndex.clear();
        this.isInitialized = false;
        
        await this.initialize();
    }

    /**
     * 获取词典统计信息
     */
    getStatistics(): {
        totalTerms: number;
        categoryCounts: Map<MathCategory, number>;
    } {
        const categoryCounts = new Map<MathCategory, number>();
        
        Array.from(this.categoryIndex.entries()).forEach(([category, termSet]) => {
            categoryCounts.set(category, termSet.size);
        });
        
        return {
            totalTerms: this.terms.size,
            categoryCounts
        };
    }

    /**
     * 加载内置术语
     */
    private async loadBuiltinTerms(): Promise<void> {
        const builtinTerms: Partial<MathTerm>[] = [
            // 代数
            { chineseName: '函数', englishName: 'function', category: MathCategory.ALGEBRA, latexCode: 'f(x)', aliases: ['映射'] },
            { chineseName: '方程', englishName: 'equation', category: MathCategory.ALGEBRA, latexCode: 'ax + b = 0', aliases: ['等式'] },
            { chineseName: '不等式', englishName: 'inequality', category: MathCategory.ALGEBRA, latexCode: 'a > b', aliases: [] },
            { chineseName: '多项式', englishName: 'polynomial', category: MathCategory.ALGEBRA, latexCode: 'a_n x^n + ... + a_1 x + a_0', aliases: [] },
            { chineseName: '因式分解', englishName: 'factorization', category: MathCategory.ALGEBRA, latexCode: 'ab = c', aliases: ['分解因式'] },
            
            // 微积分
            { chineseName: '导数', englishName: 'derivative', category: MathCategory.CALCULUS, latexCode: "f'(x)", aliases: ['微分'] },
            { chineseName: '积分', englishName: 'integral', category: MathCategory.CALCULUS, latexCode: '\\int f(x) dx', aliases: [] },
            { chineseName: '极限', englishName: 'limit', category: MathCategory.CALCULUS, latexCode: '\\lim_{x \\to a} f(x)', aliases: [] },
            { chineseName: '连续', englishName: 'continuous', category: MathCategory.CALCULUS, latexCode: '\\lim_{x \\to a} f(x) = f(a)', aliases: ['连续性'] },
            { chineseName: '微分方程', englishName: 'differential equation', category: MathCategory.CALCULUS, latexCode: "y' = f(x, y)", aliases: [] },
            
            // 几何
            { chineseName: '三角形', englishName: 'triangle', category: MathCategory.GEOMETRY, latexCode: '\\triangle ABC', aliases: [] },
            { chineseName: '圆', englishName: 'circle', category: MathCategory.GEOMETRY, latexCode: 'x^2 + y^2 = r^2', aliases: ['圆形'] },
            { chineseName: '直线', englishName: 'line', category: MathCategory.GEOMETRY, latexCode: 'y = kx + b', aliases: ['线段'] },
            { chineseName: '角度', englishName: 'angle', category: MathCategory.GEOMETRY, latexCode: '\\angle ABC', aliases: ['角'] },
            { chineseName: '面积', englishName: 'area', category: MathCategory.GEOMETRY, latexCode: 'S', aliases: [] },
            
            // 线性代数
            { chineseName: '矩阵', englishName: 'matrix', category: MathCategory.LINEAR_ALGEBRA, latexCode: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', aliases: [] },
            { chineseName: '向量', englishName: 'vector', category: MathCategory.LINEAR_ALGEBRA, latexCode: '\\vec{v}', aliases: ['矢量'] },
            { chineseName: '行列式', englishName: 'determinant', category: MathCategory.LINEAR_ALGEBRA, latexCode: '\\det(A)', aliases: [] },
            { chineseName: '特征值', englishName: 'eigenvalue', category: MathCategory.LINEAR_ALGEBRA, latexCode: '\\lambda', aliases: [] },
            { chineseName: '特征向量', englishName: 'eigenvector', category: MathCategory.LINEAR_ALGEBRA, latexCode: '\\vec{v}', aliases: [] },
            
            // 统计学
            { chineseName: '平均数', englishName: 'mean', category: MathCategory.STATISTICS, latexCode: '\\bar{x}', aliases: ['均值', '算术平均数'] },
            { chineseName: '方差', englishName: 'variance', category: MathCategory.STATISTICS, latexCode: '\\sigma^2', aliases: [] },
            { chineseName: '标准差', englishName: 'standard deviation', category: MathCategory.STATISTICS, latexCode: '\\sigma', aliases: [] },
            { chineseName: '概率', englishName: 'probability', category: MathCategory.PROBABILITY, latexCode: 'P(A)', aliases: [] },
            { chineseName: '期望', englishName: 'expectation', category: MathCategory.PROBABILITY, latexCode: 'E[X]', aliases: ['数学期望'] },
            
            // 数论
            { chineseName: '质数', englishName: 'prime number', category: MathCategory.NUMBER_THEORY, latexCode: 'p', aliases: ['素数'] },
            { chineseName: '合数', englishName: 'composite number', category: MathCategory.NUMBER_THEORY, latexCode: 'n', aliases: [] },
            { chineseName: '最大公约数', englishName: 'greatest common divisor', category: MathCategory.NUMBER_THEORY, latexCode: '\\gcd(a, b)', aliases: ['最大公因数'] },
            { chineseName: '最小公倍数', englishName: 'least common multiple', category: MathCategory.NUMBER_THEORY, latexCode: '\\text{lcm}(a, b)', aliases: [] },
            
            // 数学分析
            { chineseName: '实数', englishName: 'real number', category: MathCategory.ANALYSIS, latexCode: '\\mathbb{R}', aliases: [] },
            { chineseName: '复数', englishName: 'complex number', category: MathCategory.ANALYSIS, latexCode: '\\mathbb{C}', aliases: [] },
            { chineseName: '序列', englishName: 'sequence', category: MathCategory.ANALYSIS, latexCode: '\\{a_n\\}', aliases: ['数列'] },
            { chineseName: '级数', englishName: 'series', category: MathCategory.ANALYSIS, latexCode: '\\sum_{n=1}^{\\infty} a_n', aliases: [] },
        ];

        for (const termData of builtinTerms) {
            const term: MathTerm = {
                id: this.generateTermId(termData.chineseName!),
                chineseName: termData.chineseName!,
                englishName: termData.englishName,
                category: termData.category!,
                latexCode: termData.latexCode!,
                definition: termData.definition,
                aliases: termData.aliases || [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            await this.addTerm(term);
        }
    }

    /**
     * 构建分类索引
     */
    private buildCategoryIndex(): void {
        this.categoryIndex.clear();
        
        for (const term of this.terms.values()) {
            this.addToCategory(term.category, term.chineseName);
        }
    }

    /**
     * 构建别名索引
     */
    private buildAliasIndex(): void {
        this.aliasIndex.clear();
        
        for (const term of this.terms.values()) {
            this.updateAliasIndex(term);
        }
    }

    /**
     * 添加术语到分类
     */
    private addToCategory(category: MathCategory, termName: string): void {
        if (!this.categoryIndex.has(category)) {
            this.categoryIndex.set(category, new Set());
        }
        this.categoryIndex.get(category)!.add(termName);
    }

    /**
     * 更新别名索引
     */
    private updateAliasIndex(term: MathTerm): void {
        for (const alias of term.aliases) {
            this.aliasIndex.set(alias, term.chineseName);
        }
    }

    /**
     * 生成术语ID
     */
    private generateTermId(chineseName: string): string {
        return `term_${chineseName}_${Date.now()}`;
    }

    /**
     * 计算字符串相似度
     */
    private calculateSimilarity(str1: string, str2: string): number {
        // 简单的编辑距离相似度计算
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;
        
        const matrix: number[][] = [];
        
        // 初始化矩阵
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        // 填充矩阵
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // 删除
                    matrix[i][j - 1] + 1,      // 插入
                    matrix[i - 1][j - 1] + cost // 替换
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        
        return 1 - (distance / maxLen);
    }
}