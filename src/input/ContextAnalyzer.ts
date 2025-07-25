import { App, Editor, TFile, EditorPosition, CachedMetadata } from 'obsidian';
import { InputContext, MathCategory, MathTerm } from '../types';
import { TermRecognitionEngine } from '../recognition/TermRecognitionEngine';

/**
 * 上下文分析器 - 提供AI驱动的上下文感知分析
 * 分析当前笔记内容、用户输入模式和数学领域上下文
 */
export class ContextAnalyzer {
    private app: App;
    private termRecognitionEngine: TermRecognitionEngine;
    private contextCache: Map<string, ContextCacheEntry> = new Map();
    private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存过期

    constructor(app: App, termRecognitionEngine: TermRecognitionEngine) {
        this.app = app;
        this.termRecognitionEngine = termRecognitionEngine;
    }

    /**
     * 分析当前输入上下文
     */
    async analyzeContext(editor: Editor, file: TFile, cursor: EditorPosition): Promise<InputContext> {
        const cacheKey = `${file.path}-${cursor.line}-${cursor.ch}`;
        
        // 检查缓存
        const cached = this.contextCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
            return cached.context;
        }

        // 分析上下文
        const context = await this.performContextAnalysis(editor, file, cursor);
        
        // 缓存结果
        this.contextCache.set(cacheKey, {
            context,
            timestamp: Date.now()
        });

        return context;
    }

    /**
     * 查找相关术语
     */
    async findRelatedTerms(query: string, context: InputContext): Promise<MathTerm[]> {
        const relatedTerms: MathTerm[] = [];

        try {
            // 1. 基于当前笔记内容的术语
            const noteTerms = await this.extractTermsFromNote(context.currentNote);
            relatedTerms.push(...noteTerms.filter(term => 
                this.isTermRelevant(term, query, context)
            ));

            // 2. 基于周围文本的术语
            const surroundingTerms = await this.extractTermsFromText(context.surroundingText);
            relatedTerms.push(...surroundingTerms.filter(term => 
                this.isTermRelevant(term, query, context)
            ));

            // 3. 基于最近使用的术语
            const recentTerms = await this.getRecentTermsInCategory(context.detectedCategory);
            relatedTerms.push(...recentTerms.filter(term => 
                this.isTermRelevant(term, query, context)
            ));

            // 去重并按相关性排序
            return this.deduplicateAndRankTerms(relatedTerms, query, context);
        } catch (error) {
            console.error('ContextAnalyzer: 查找相关术语失败:', error);
            return [];
        }
    }

    /**
     * 预测用户意图
     */
    async predictUserIntent(editor: Editor, file: TFile, cursor: EditorPosition): Promise<UserIntent> {
        const context = await this.analyzeContext(editor, file, cursor);
        
        // 分析输入模式
        const inputPattern = this.analyzeInputPattern(editor, cursor);
        
        // 分析文档结构
        const documentStructure = await this.analyzeDocumentStructure(file);
        
        // 基于多个因素预测意图
        return this.inferUserIntent(context, inputPattern, documentStructure);
    }

    /**
     * 获取上下文建议权重
     */
    getContextualWeights(context: InputContext): ContextualWeights {
        return {
            categoryRelevance: this.calculateCategoryRelevance(context),
            recentUsageWeight: this.calculateRecentUsageWeight(context),
            documentContextWeight: this.calculateDocumentContextWeight(context),
            semanticSimilarityWeight: this.calculateSemanticSimilarityWeight(context)
        };
    }

    /**
     * 执行上下文分析
     */
    private async performContextAnalysis(editor: Editor, file: TFile, cursor: EditorPosition): Promise<InputContext> {
        // 获取当前行和周围文本
        const currentLine = editor.getLine(cursor.line);
        const surroundingText = this.extractSurroundingText(editor, cursor);
        
        // 检测数学领域
        const detectedCategory = await this.detectMathCategory(surroundingText, file);
        
        // 提取最近使用的术语
        const recentTerms = await this.extractRecentTerms(editor, cursor);
        
        return {
            currentNote: file.path,
            surroundingText,
            detectedCategory,
            recentTerms,
            cursorPosition: cursor.ch
        };
    }

    /**
     * 提取周围文本
     */
    private extractSurroundingText(editor: Editor, cursor: EditorPosition, radius: number = 3): string {
        const startLine = Math.max(0, cursor.line - radius);
        const endLine = Math.min(editor.lineCount() - 1, cursor.line + radius);
        
        let surroundingText = '';
        for (let i = startLine; i <= endLine; i++) {
            surroundingText += editor.getLine(i) + '\n';
        }
        
        return surroundingText.trim();
    }

    /**
     * 检测数学领域类别
     */
    private async detectMathCategory(text: string, file: TFile): Promise<MathCategory> {
        // 基于关键词的领域检测
        const categoryKeywords: Record<MathCategory, string[]> = {
            [MathCategory.CALCULUS]: [
                '导数', '积分', '极限', '微分', '偏导', '梯度', '散度', '旋度',
                'derivative', 'integral', 'limit', 'differential'
            ],
            [MathCategory.LINEAR_ALGEBRA]: [
                '矩阵', '向量', '行列式', '特征值', '特征向量', '线性变换', '基',
                'matrix', 'vector', 'determinant', 'eigenvalue', 'eigenvector'
            ],
            [MathCategory.STATISTICS]: [
                '概率', '统计', '期望', '方差', '标准差', '分布', '假设检验',
                'probability', 'statistics', 'expectation', 'variance', 'distribution'
            ],
            [MathCategory.ALGEBRA]: [
                '多项式', '方程', '不等式', '函数', '集合', '群', '环', '域',
                'polynomial', 'equation', 'inequality', 'function', 'set'
            ],
            [MathCategory.GEOMETRY]: [
                '几何', '点', '线', '面', '角', '三角形', '圆', '椭圆', '抛物线',
                'geometry', 'point', 'line', 'plane', 'angle', 'triangle', 'circle'
            ],
            [MathCategory.DISCRETE_MATH]: [
                '图论', '组合', '递推', '生成函数', '离散', '算法',
                'graph', 'combinatorics', 'recursion', 'discrete', 'algorithm'
            ],
            [MathCategory.NUMBER_THEORY]: [
                '数论', '质数', '因数', '同余', '欧拉函数', '费马定理',
                'number theory', 'prime', 'factor', 'congruence', 'euler'
            ],
            [MathCategory.TOPOLOGY]: [
                '拓扑', '连续', '紧致', '连通', '同胚',
                'topology', 'continuous', 'compact', 'connected', 'homeomorphism'
            ],
            [MathCategory.ANALYSIS]: [
                '分析', '实分析', '复分析', '泛函', '测度',
                'analysis', 'real analysis', 'complex analysis', 'functional', 'measure'
            ],
            [MathCategory.PROBABILITY]: [
                '概率论', '随机', '期望', '方差', '分布',
                'probability', 'random', 'expectation', 'variance', 'distribution'
            ],
            [MathCategory.SET_THEORY]: [
                '集合论', '集合', '子集', '并集', '交集', '补集',
                'set theory', 'set', 'subset', 'union', 'intersection', 'complement'
            ],
            [MathCategory.LOGIC]: [
                '逻辑', '命题', '谓词', '量词', '推理', '证明',
                'logic', 'proposition', 'predicate', 'quantifier', 'inference', 'proof'
            ]
        };

        // 计算每个类别的匹配分数
        const categoryScores: Record<MathCategory, number> = {} as any;
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            let score = 0;
            for (const keyword of keywords) {
                const regex = new RegExp(keyword, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    score += matches.length;
                }
            }
            categoryScores[category as MathCategory] = score;
        }

        // 考虑文件名和路径
        const fileName = file.name.toLowerCase();
        const filePath = file.path.toLowerCase();
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            for (const keyword of keywords) {
                if (fileName.includes(keyword) || filePath.includes(keyword)) {
                    categoryScores[category as MathCategory] += 2; // 文件名权重更高
                }
            }
        }

        // 返回得分最高的类别
        let maxScore = 0;
        let detectedCategory = MathCategory.ALGEBRA; // 默认类别
        
        for (const [category, score] of Object.entries(categoryScores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedCategory = category as MathCategory;
            }
        }

        return detectedCategory;
    }

    /**
     * 提取最近使用的术语
     */
    private async extractRecentTerms(editor: Editor, cursor: EditorPosition, lookback: number = 50): Promise<string[]> {
        const recentTerms: string[] = [];
        
        try {
            // 获取光标前的文本
            let textBeforeCursor = '';
            for (let i = Math.max(0, cursor.line - 10); i <= cursor.line; i++) {
                const line = editor.getLine(i);
                if (i === cursor.line) {
                    textBeforeCursor += line.substring(0, cursor.ch);
                } else {
                    textBeforeCursor += line + '\n';
                }
            }

            // 识别术语
            const recognizedTerms = await this.termRecognitionEngine.recognizeTerms(textBeforeCursor);
            
            // 按位置排序，取最近的术语
            const sortedTerms = recognizedTerms
                .sort((a, b) => b.startIndex - a.startIndex)
                .slice(0, lookback);

            for (const term of sortedTerms) {
                if (!recentTerms.includes(term.text)) {
                    recentTerms.push(term.text);
                }
            }
        } catch (error) {
            console.warn('ContextAnalyzer: 提取最近术语失败:', error);
        }

        return recentTerms;
    }

    /**
     * 从笔记中提取术语
     */
    private async extractTermsFromNote(notePath: string): Promise<MathTerm[]> {
        try {
            const file = this.app.vault.getAbstractFileByPath(notePath);
            if (!file || !(file instanceof TFile)) {
                return [];
            }

            const content = await this.app.vault.read(file);
            const recognizedTerms = await this.termRecognitionEngine.recognizeTerms(content);
            
            // 转换为MathTerm格式（简化版）
            return recognizedTerms.map(term => ({
                id: `temp-${Date.now()}-${Math.random()}`,
                chineseName: term.text,
                category: term.category,
                latexCode: term.suggestedLatex,
                aliases: [],
                createdAt: new Date(),
                updatedAt: new Date()
            }));
        } catch (error) {
            console.warn('ContextAnalyzer: 从笔记提取术语失败:', error);
            return [];
        }
    }

    /**
     * 从文本中提取术语
     */
    private async extractTermsFromText(text: string): Promise<MathTerm[]> {
        try {
            const recognizedTerms = await this.termRecognitionEngine.recognizeTerms(text);
            
            return recognizedTerms.map(term => ({
                id: `temp-${Date.now()}-${Math.random()}`,
                chineseName: term.text,
                category: term.category,
                latexCode: term.suggestedLatex,
                aliases: [],
                createdAt: new Date(),
                updatedAt: new Date()
            }));
        } catch (error) {
            console.warn('ContextAnalyzer: 从文本提取术语失败:', error);
            return [];
        }
    }

    /**
     * 获取类别中的最近术语
     */
    private async getRecentTermsInCategory(category: MathCategory): Promise<MathTerm[]> {
        try {
            // 这里应该从数据库获取，暂时返回空数组
            // 在实际实现中，会查询数据库中该类别的最近使用术语
            return [];
        } catch (error) {
            console.warn('ContextAnalyzer: 获取类别术语失败:', error);
            return [];
        }
    }

    /**
     * 判断术语是否相关
     */
    private isTermRelevant(term: MathTerm, query: string, context: InputContext): boolean {
        // 1. 文本相似性
        if (term.chineseName.includes(query) || query.includes(term.chineseName)) {
            return true;
        }

        // 2. 类别匹配
        if (term.category === context.detectedCategory) {
            return true;
        }

        // 3. 别名匹配
        if (term.aliases.some(alias => alias.includes(query) || query.includes(alias))) {
            return true;
        }

        // 4. 语义相似性（简化版）
        const similarity = this.calculateSemanticSimilarity(term.chineseName, query);
        return similarity > 0.6;
    }

    /**
     * 计算语义相似性（简化版）
     */
    private calculateSemanticSimilarity(term1: string, term2: string): number {
        // 简化的相似性计算，基于字符重叠
        const chars1 = new Set(term1);
        const chars2 = new Set(term2);
        
        const intersection = new Set([...chars1].filter(x => chars2.has(x)));
        const union = new Set([...chars1, ...chars2]);
        
        return intersection.size / union.size;
    }

    /**
     * 去重并排序术语
     */
    private deduplicateAndRankTerms(terms: MathTerm[], query: string, context: InputContext): MathTerm[] {
        // 去重
        const uniqueTerms = terms.filter((term, index, self) => 
            index === self.findIndex(t => t.chineseName === term.chineseName)
        );

        // 按相关性排序
        return uniqueTerms.sort((a, b) => {
            const scoreA = this.calculateTermRelevanceScore(a, query, context);
            const scoreB = this.calculateTermRelevanceScore(b, query, context);
            return scoreB - scoreA;
        });
    }

    /**
     * 计算术语相关性分数
     */
    private calculateTermRelevanceScore(term: MathTerm, query: string, context: InputContext): number {
        let score = 0;

        // 文本匹配分数
        if (term.chineseName.includes(query)) {
            score += 3;
        }
        if (query.includes(term.chineseName)) {
            score += 2;
        }

        // 类别匹配分数
        if (term.category === context.detectedCategory) {
            score += 2;
        }

        // 最近使用分数
        if (context.recentTerms.includes(term.chineseName)) {
            score += 1;
        }

        // 语义相似性分数
        const similarity = this.calculateSemanticSimilarity(term.chineseName, query);
        score += similarity;

        return score;
    }

    /**
     * 分析输入模式
     */
    private analyzeInputPattern(editor: Editor, cursor: EditorPosition): InputPattern {
        const currentLine = editor.getLine(cursor.line);
        const beforeCursor = currentLine.substring(0, cursor.ch);
        const afterCursor = currentLine.substring(cursor.ch);

        return {
            isInMathMode: this.isInMathMode(beforeCursor, afterCursor),
            isStartOfLine: cursor.ch === 0,
            isAfterSpace: beforeCursor.endsWith(' '),
            hasRecentMathContent: /[\u4e00-\u9fff]|\\[a-zA-Z]+/.test(beforeCursor.slice(-20)),
            inputSpeed: this.estimateInputSpeed(editor, cursor)
        };
    }

    /**
     * 检查是否在数学模式中
     */
    private isInMathMode(beforeCursor: string, afterCursor: string): boolean {
        const dollarsBefore = (beforeCursor.match(/\$/g) || []).length;
        const dollarsAfter = (afterCursor.match(/\$/g) || []).length;
        
        // 简单检查：奇数个$表示在数学模式中
        return (dollarsBefore % 2) === 1;
    }

    /**
     * 估算输入速度
     */
    private estimateInputSpeed(editor: Editor, cursor: EditorPosition): 'slow' | 'normal' | 'fast' {
        // 简化实现，实际应该基于时间戳分析
        return 'normal';
    }

    /**
     * 分析文档结构
     */
    private async analyzeDocumentStructure(file: TFile): Promise<DocumentStructure> {
        try {
            const content = await this.app.vault.read(file);
            const metadata = this.app.metadataCache.getFileCache(file);

            return {
                hasHeadings: (metadata?.headings?.length || 0) > 0,
                hasMathBlocks: content.includes('$$'),
                hasInlineMath: content.includes('$') && !content.includes('$$'),
                hasLinks: (metadata?.links?.length || 0) > 0,
                wordCount: content.split(/\s+/).length,
                mathContentRatio: this.calculateMathContentRatio(content)
            };
        } catch (error) {
            console.warn('ContextAnalyzer: 文档结构分析失败:', error);
            return {
                hasHeadings: false,
                hasMathBlocks: false,
                hasInlineMath: false,
                hasLinks: false,
                wordCount: 0,
                mathContentRatio: 0
            };
        }
    }

    /**
     * 计算数学内容比例
     */
    private calculateMathContentRatio(content: string): number {
        const mathPatterns = [
            /\$[^$]+\$/g,  // 内联数学
            /\$\$[^$]+\$\$/g,  // 块数学
            /\\[a-zA-Z]+/g,  // LaTeX命令
            /[\u4e00-\u9fff]+/g  // 中文数学术语
        ];

        let mathCharCount = 0;
        for (const pattern of mathPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                mathCharCount += matches.join('').length;
            }
        }

        return content.length > 0 ? mathCharCount / content.length : 0;
    }

    /**
     * 推断用户意图
     */
    private inferUserIntent(
        context: InputContext, 
        inputPattern: InputPattern, 
        documentStructure: DocumentStructure
    ): UserIntent {
        // 基于多个因素推断用户意图
        if (inputPattern.isInMathMode) {
            return 'formula_input';
        }
        
        if (documentStructure.mathContentRatio > 0.3) {
            return 'math_note_writing';
        }
        
        if (context.recentTerms.length > 3) {
            return 'concept_exploration';
        }
        
        return 'general_writing';
    }

    /**
     * 计算类别相关性
     */
    private calculateCategoryRelevance(context: InputContext): number {
        // 基于检测到的类别和最近术语计算相关性
        const categoryTermCount = context.recentTerms.length;
        return Math.min(1.0, categoryTermCount * 0.1);
    }

    /**
     * 计算最近使用权重
     */
    private calculateRecentUsageWeight(context: InputContext): number {
        return Math.min(1.0, context.recentTerms.length * 0.05);
    }

    /**
     * 计算文档上下文权重
     */
    private calculateDocumentContextWeight(context: InputContext): number {
        // 基于周围文本的数学内容密度
        const mathContentRatio = this.calculateMathContentRatio(context.surroundingText);
        return mathContentRatio;
    }

    /**
     * 计算语义相似性权重
     */
    private calculateSemanticSimilarityWeight(context: InputContext): number {
        // 简化实现
        return 0.5;
    }

    /**
     * 清理过期缓存
     */
    private cleanupCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.contextCache.entries()) {
            if (now - entry.timestamp > this.CACHE_EXPIRY) {
                this.contextCache.delete(key);
            }
        }
    }
}

/**
 * 上下文缓存条目
 */
interface ContextCacheEntry {
    context: InputContext;
    timestamp: number;
}

/**
 * 用户意图类型
 */
type UserIntent = 'formula_input' | 'math_note_writing' | 'concept_exploration' | 'general_writing';

/**
 * 输入模式
 */
interface InputPattern {
    isInMathMode: boolean;
    isStartOfLine: boolean;
    isAfterSpace: boolean;
    hasRecentMathContent: boolean;
    inputSpeed: 'slow' | 'normal' | 'fast';
}

/**
 * 文档结构
 */
interface DocumentStructure {
    hasHeadings: boolean;
    hasMathBlocks: boolean;
    hasInlineMath: boolean;
    hasLinks: boolean;
    wordCount: number;
    mathContentRatio: number;
}

/**
 * 上下文权重
 */
interface ContextualWeights {
    categoryRelevance: number;
    recentUsageWeight: number;
    documentContextWeight: number;
    semanticSimilarityWeight: number;
}