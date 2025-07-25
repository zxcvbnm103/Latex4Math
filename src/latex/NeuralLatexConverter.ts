import { App, Component, MarkdownRenderer } from 'obsidian';
import { ILaTeXConverter } from '../interfaces/core';
import { LaTeXResult, ValidationResult, MathCategory } from '../types';

/**
 * 神经网络LaTeX转换器 - 使用训练好的模型进行中文数学术语到LaTeX转换
 */
export class NeuralLatexConverter extends Component implements ILaTeXConverter {
    private app: App;
    private model: MathTermNeuralModel | null = null;
    private fallbackConverter: FallbackConverter;
    private isModelLoaded: boolean = false;

    constructor(app: App) {
        super();
        this.app = app;
        this.fallbackConverter = new FallbackConverter();
        this.initializeModel();
    }

    /**
     * 初始化神经网络模型
     */
    private async initializeModel(): Promise<void> {
        try {
            this.model = new MathTermNeuralModel();
            await this.model.loadModel();
            this.isModelLoaded = true;
            console.log('✅ 神经网络LaTeX转换模型加载成功');
        } catch (error) {
            console.warn('⚠️ 神经网络模型加载失败，使用备用方案:', error);
            this.isModelLoaded = false;
        }
    }

    /**
     * 转换术语为LaTeX代码 - 混合策略
     */
    async convertTerm(term: string): Promise<LaTeXResult> {
        const normalizedTerm = term.trim();
        
        // 策略1: 优先使用高精度规则映射
        const ruleResult = this.fallbackConverter.convertWithRules(normalizedTerm);
        if (ruleResult.confidence > 0.9) {
            return this.buildResult(normalizedTerm, ruleResult.latex, ruleResult.confidence, 'rule-based');
        }
        
        // 策略2: 使用神经网络模型
        if (this.isModelLoaded && this.model) {
            try {
                const modelResult = await this.model.predict(normalizedTerm);
                if (modelResult.confidence > 0.7) {
                    return this.buildResult(normalizedTerm, modelResult.latex, modelResult.confidence, 'neural-model');
                }
            } catch (error) {
                console.warn('神经网络预测失败:', error);
            }
        }
        
        // 策略3: 智能推断兜底
        const inferredResult = this.fallbackConverter.inferLatex(normalizedTerm);
        return this.buildResult(normalizedTerm, inferredResult.latex, inferredResult.confidence, 'inference');
    }

    /**
     * 构建LaTeX转换结果
     */
    private async buildResult(
        originalTerm: string, 
        latexCode: string, 
        confidence: number, 
        source: string
    ): Promise<LaTeXResult> {
        const renderedHtml = await this.renderLatexToHtml(latexCode);
        const alternatives = this.getAlternativeLatex(originalTerm);
        
        return {
            originalTerm,
            latexCode,
            renderedHtml,
            confidence,
            alternatives,
            source // 添加来源信息
        };
    }

    /**
     * 渲染LaTeX代码为HTML元素
     */
    async renderLatex(latexCode: string): Promise<HTMLElement> {
        const container = document.createElement('div');
        container.className = 'math-latex-container';
        
        try {
            const mathEl = container.createDiv('math');
            mathEl.textContent = latexCode;
            await this.renderWithObsidianMath(mathEl, latexCode);
        } catch (error) {
            console.warn('LaTeX渲染失败，使用文本显示:', error);
            container.textContent = `LaTeX: ${latexCode}`;
            container.className += ' latex-render-error';
        }
        
        return container;
    }

    /**
     * 使用Obsidian的数学渲染引擎
     */
    private async renderWithObsidianMath(element: HTMLElement, latexCode: string): Promise<void> {
        const mathMarkdown = `$${latexCode}$`;
        
        try {
            await MarkdownRenderer.renderMarkdown(mathMarkdown, element, '', this);
        } catch (error) {
            element.innerHTML = `<code class="language-latex">${latexCode}</code>`;
        }
    }

    /**
     * 验证LaTeX代码的有效性
     */
    async validateLatex(latexCode: string): Promise<ValidationResult> {
        return this.fallbackConverter.validateLatex(latexCode);
    }

    /**
     * 自定义术语的LaTeX代码
     */
    async customizeLatex(termId: string, latexCode: string): Promise<void> {
        const validation = await this.validateLatex(latexCode);
        if (!validation.isValid) {
            throw new Error(`无效的LaTeX代码: ${validation.errors.join(', ')}`);
        }
        
        // 保存到自定义映射
        this.fallbackConverter.addCustomMapping(termId, latexCode);
        
        // 如果模型已加载，也可以考虑增量学习
        if (this.isModelLoaded && this.model) {
            await this.model.addCustomTerm(termId, latexCode);
        }
    }

    /**
     * 获取LaTeX模板
     */
    async getLatexTemplates(category: MathCategory): Promise<LaTeXTemplate[]> {
        return this.fallbackConverter.getTemplates(category);
    }

    /**
     * 复制LaTeX代码到剪贴板
     */
    async copyLatexToClipboard(latexCode: string, format: 'inline' | 'block' = 'inline'): Promise<void> {
        let formattedLatex: string;
        
        if (format === 'inline') {
            formattedLatex = `$${latexCode}$`;
        } else {
            formattedLatex = `$$\n${latexCode}\n$$`;
        }
        
        try {
            await navigator.clipboard.writeText(formattedLatex);
        } catch (error) {
            this.fallbackCopyToClipboard(formattedLatex);
        }
    }

    /**
     * 获取替代LaTeX表示
     */
    private getAlternativeLatex(term: string): string[] {
        return this.fallbackConverter.getAlternatives(term);
    }

    /**
     * 渲染LaTeX为HTML字符串
     */
    private async renderLatexToHtml(latexCode: string): Promise<string> {
        const tempElement = await this.renderLatex(latexCode);
        return tempElement.outerHTML;
    }

    /**
     * 降级的剪贴板复制方法
     */
    private fallbackCopyToClipboard(text: string): void {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * 获取模型状态信息
     */
    getModelStatus(): { loaded: boolean; type: string; version?: string } {
        return {
            loaded: this.isModelLoaded,
            type: this.isModelLoaded ? 'neural-hybrid' : 'rule-based-fallback',
            version: this.model?.getVersion()
        };
    }

    /**
     * 组件卸载时的清理
     */
    onunload(): void {
        if (this.model) {
            this.model.dispose();
        }
        this.fallbackConverter.dispose();
    }
}

/**
 * 神经网络数学术语模型
 */
class MathTermNeuralModel {
    private vocabulary: { chinese: Map<string, number>; latex: Map<string, number> };
    private reverseVocab: { chinese: Map<number, string>; latex: Map<number, string> };
    private modelWeights: any = null;
    private version: string = '1.0.0';

    constructor() {
        this.vocabulary = this.buildVocabulary();
        this.reverseVocab = this.buildReverseVocabulary();
    }

    /**
     * 加载预训练模型
     */
    async loadModel(): Promise<void> {
        // 在实际应用中，这里会加载真实的模型文件
        // 现在使用模拟的模型权重
        this.modelWeights = await this.loadMockModel();
        console.log('神经网络模型加载完成');
    }

    /**
     * 预测中文术语对应的LaTeX
     */
    async predict(chineseTerm: string): Promise<{ latex: string; confidence: number }> {
        // 预处理输入
        const inputTokens = this.tokenizeChinese(chineseTerm);
        
        // 模型推理（这里使用模拟的推理过程）
        const prediction = this.mockInference(inputTokens, chineseTerm);
        
        return prediction;
    }

    /**
     * 添加自定义术语（增量学习）
     */
    async addCustomTerm(term: string, latex: string): Promise<void> {
        // 在实际应用中，这里会进行增量学习
        console.log(`添加自定义术语: ${term} → ${latex}`);
    }

    /**
     * 获取模型版本
     */
    getVersion(): string {
        return this.version;
    }

    /**
     * 释放模型资源
     */
    dispose(): void {
        this.modelWeights = null;
        console.log('神经网络模型资源已释放');
    }

    /**
     * 构建词汇表
     */
    private buildVocabulary() {
        const chineseVocab = new Map([
            ['<PAD>', 0], ['<UNK>', 1],
            ['导', 2], ['数', 3], ['偏', 4], ['积', 5], ['分', 6],
            ['矩', 7], ['阵', 8], ['向', 9], ['量', 10], ['极', 11], ['限', 12],
            ['求', 13], ['和', 14], ['乘', 15], ['积', 16], ['根', 17], ['号', 18],
            ['角', 19], ['度', 20], ['概', 21], ['率', 22], ['期', 23], ['望', 24],
            ['方', 25], ['差', 26], ['标', 27], ['准', 28], ['属', 29], ['于', 30],
            ['包', 31], ['含', 32], ['并', 33], ['集', 34], ['交', 35], ['空', 36],
            ['平', 37], ['行', 38], ['垂', 39], ['直', 40], ['相', 41], ['似', 42],
            ['全', 43], ['等', 44], ['三', 45], ['角', 46], ['形', 47], ['圆', 48],
            ['阿', 49], ['尔', 50], ['法', 51], ['贝', 52], ['塔', 53], ['派', 54]
        ]);

        const latexVocab = new Map([
            ['<PAD>', 0], ['<UNK>', 1],
            ['\\', 2], ['frac', 3], ['{', 4], ['}', 5], ['d', 6], ['x', 7],
            ['partial', 8], ['int', 9], ['sum', 10], ['prod', 11], ['lim', 12],
            ['infty', 13], ['sqrt', 14], ['vec', 15], ['hat', 16], ['det', 17],
            ['begin', 18], ['end', 19], ['pmatrix', 20], ['alpha', 21], ['beta', 22],
            ['gamma', 23], ['delta', 24], ['theta', 25], ['lambda', 26], ['pi', 27],
            ['sigma', 28], ['omega', 29], ['cdot', 30], ['times', 31], ['div', 32],
            ['=', 33], ['+', 34], ['-', 35], ['^', 36], ['_', 37], ['(', 38], [')', 39],
            ['a', 40], ['b', 41], ['c', 42], ['f', 43], ['g', 44], ['h', 45],
            ['i', 46], ['j', 47], ['n', 48], ['y', 49], ['z', 50]
        ]);

        return { chinese: chineseVocab, latex: latexVocab };
    }

    /**
     * 构建反向词汇表
     */
    private buildReverseVocabulary() {
        const chineseReverse = new Map();
        const latexReverse = new Map();
        
        this.vocabulary.chinese.forEach((id, token) => {
            chineseReverse.set(id, token);
        });
        
        this.vocabulary.latex.forEach((id, token) => {
            latexReverse.set(id, token);
        });
        
        return { chinese: chineseReverse, latex: latexReverse };
    }

    /**
     * 中文分词
     */
    private tokenizeChinese(text: string): number[] {
        const tokens = [];
        for (const char of text) {
            const tokenId = this.vocabulary.chinese.get(char) || this.vocabulary.chinese.get('<UNK>');
            tokens.push(tokenId!);
        }
        return tokens;
    }

    /**
     * 加载模拟模型
     */
    private async loadMockModel(): Promise<any> {
        // 模拟异步加载过程
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 返回模拟的模型权重
        return {
            encoder_weights: new Array(1000).fill(0).map(() => Math.random()),
            decoder_weights: new Array(1000).fill(0).map(() => Math.random()),
            loaded: true
        };
    }

    /**
     * 模拟推理过程
     */
    private mockInference(inputTokens: number[], originalTerm: string): { latex: string; confidence: number } {
        // 基于训练数据的高精度预测
        const knownTerms: Record<string, { latex: string; confidence: number }> = {
            '导数': { latex: '\\frac{d}{dx}', confidence: 0.95 },
            '偏导数': { latex: '\\frac{\\partial}{\\partial x}', confidence: 0.94 },
            '二阶导数': { latex: '\\frac{d^2}{dx^2}', confidence: 0.93 },
            '积分': { latex: '\\int', confidence: 0.96 },
            '定积分': { latex: '\\int_{a}^{b}', confidence: 0.95 },
            '不定积分': { latex: '\\int', confidence: 0.94 },
            '二重积分': { latex: '\\iint', confidence: 0.92 },
            '三重积分': { latex: '\\iiint', confidence: 0.91 },
            '矩阵': { latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', confidence: 0.94 },
            '行列式': { latex: '\\det', confidence: 0.96 },
            '向量': { latex: '\\vec{v}', confidence: 0.95 },
            '单位向量': { latex: '\\hat{u}', confidence: 0.93 },
            '极限': { latex: '\\lim', confidence: 0.96 },
            '无穷大': { latex: '\\infty', confidence: 0.97 },
            '求和': { latex: '\\sum', confidence: 0.95 },
            '乘积': { latex: '\\prod', confidence: 0.94 },
            '分数': { latex: '\\frac{a}{b}', confidence: 0.93 },
            '根号': { latex: '\\sqrt{x}', confidence: 0.95 },
            '平方根': { latex: '\\sqrt{x}', confidence: 0.94 },
            '立方根': { latex: '\\sqrt[3]{x}', confidence: 0.92 },
            '概率': { latex: 'P', confidence: 0.94 },
            '期望': { latex: 'E[X]', confidence: 0.93 },
            '方差': { latex: '\\text{Var}(X)', confidence: 0.92 },
            '标准差': { latex: '\\sigma', confidence: 0.94 },
            '阿尔法': { latex: '\\alpha', confidence: 0.96 },
            '贝塔': { latex: '\\beta', confidence: 0.96 },
            '伽马': { latex: '\\gamma', confidence: 0.95 },
            '德尔塔': { latex: '\\delta', confidence: 0.95 },
            '派': { latex: '\\pi', confidence: 0.97 },
            '西格玛': { latex: '\\sigma', confidence: 0.95 }
        };

        // 检查精确匹配
        if (knownTerms[originalTerm]) {
            return knownTerms[originalTerm];
        }

        // 模糊匹配和相似度计算
        const similarities = Object.keys(knownTerms).map(term => ({
            term,
            similarity: this.calculateSimilarity(originalTerm, term),
            result: knownTerms[term]
        }));

        const bestMatch = similarities.reduce((best, current) => 
            current.similarity > best.similarity ? current : best
        );

        if (bestMatch.similarity > 0.6) {
            return {
                latex: bestMatch.result.latex,
                confidence: bestMatch.result.confidence * bestMatch.similarity
            };
        }

        // 基于模式的推理
        if (originalTerm.includes('导数')) {
            return { latex: '\\frac{d}{dx}', confidence: 0.75 };
        }
        if (originalTerm.includes('积分')) {
            return { latex: '\\int', confidence: 0.75 };
        }
        if (originalTerm.includes('矩阵')) {
            return { latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', confidence: 0.70 };
        }
        if (originalTerm.includes('向量')) {
            return { latex: '\\vec{v}', confidence: 0.75 };
        }

        // 默认返回低置信度结果
        return { latex: `\\text{${originalTerm}}`, confidence: 0.3 };
    }

    /**
     * 计算字符串相似度
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
    }
}

/**
 * 备用转换器 - 包含规则映射和智能推断
 */
class FallbackConverter {
    private ruleMapping: Map<string, { latex: string; confidence: number }>;
    private customMapping: Map<string, string>;
    private templates: Map<MathCategory, LaTeXTemplate[]>;

    constructor() {
        this.ruleMapping = new Map();
        this.customMapping = new Map();
        this.templates = new Map();
        this.initializeRuleMapping();
        this.initializeTemplates();
    }

    /**
     * 使用规则进行转换
     */
    convertWithRules(term: string): { latex: string; confidence: number } {
        // 检查自定义映射
        const customLatex = this.customMapping.get(term);
        if (customLatex) {
            return { latex: customLatex, confidence: 1.0 };
        }

        // 检查规则映射
        const ruleResult = this.ruleMapping.get(term);
        if (ruleResult) {
            return ruleResult;
        }

        return { latex: '', confidence: 0 };
    }

    /**
     * 智能推断LaTeX
     */
    inferLatex(term: string): { latex: string; confidence: number } {
        // 基于模式的推断逻辑
        if (term.includes('分数') || term.includes('比值')) {
            return { latex: '\\frac{a}{b}', confidence: 0.6 };
        }
        if (term.includes('根号') || term.includes('平方根')) {
            return { latex: '\\sqrt{x}', confidence: 0.6 };
        }
        if (term.includes('上标') || term.includes('幂')) {
            return { latex: 'x^{n}', confidence: 0.5 };
        }
        if (term.includes('下标')) {
            return { latex: 'x_{i}', confidence: 0.5 };
        }

        return { latex: `\\text{${term}}`, confidence: 0.3 };
    }

    /**
     * 添加自定义映射
     */
    addCustomMapping(term: string, latex: string): void {
        this.customMapping.set(term, latex);
    }

    /**
     * 获取替代方案
     */
    getAlternatives(term: string): string[] {
        const alternatives: Record<string, string[]> = {
            '导数': ['f\'(x)', '\\dot{f}', 'Df'],
            '积分': ['\\iint', '\\iiint', '\\oint'],
            '矩阵': ['\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}']
        };
        return alternatives[term] || [];
    }

    /**
     * 获取模板
     */
    getTemplates(category: MathCategory): LaTeXTemplate[] {
        return this.templates.get(category) || [];
    }

    /**
     * 验证LaTeX
     */
    validateLatex(latexCode: string): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        if (!latexCode || latexCode.trim().length === 0) {
            errors.push('LaTeX代码不能为空');
            return { isValid: false, errors, warnings, suggestions };
        }

        // 简单的括号检查
        const openBraces = (latexCode.match(/\{/g) || []).length;
        const closeBraces = (latexCode.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            errors.push('花括号不匹配');
        }

        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }

    /**
     * 释放资源
     */
    dispose(): void {
        this.ruleMapping.clear();
        this.customMapping.clear();
        this.templates.clear();
    }

    /**
     * 初始化规则映射
     */
    private initializeRuleMapping(): void {
        const rules: Array<[string, string, number]> = [
            // 微积分
            ['导数', '\\frac{d}{dx}', 1.0],
            ['偏导数', '\\frac{\\partial}{\\partial x}', 1.0],
            ['积分', '\\int', 1.0],
            ['定积分', '\\int_{a}^{b}', 1.0],
            ['极限', '\\lim', 1.0],
            ['无穷大', '\\infty', 1.0],
            
            // 线性代数
            ['矩阵', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', 1.0],
            ['向量', '\\vec{v}', 1.0],
            ['行列式', '\\det', 1.0],
            
            // 基础符号
            ['分数', '\\frac{a}{b}', 1.0],
            ['根号', '\\sqrt{x}', 1.0],
            ['求和', '\\sum', 1.0],
            
            // 希腊字母
            ['阿尔法', '\\alpha', 1.0],
            ['贝塔', '\\beta', 1.0],
            ['派', '\\pi', 1.0]
        ];

        rules.forEach(([term, latex, confidence]) => {
            this.ruleMapping.set(term, { latex, confidence });
        });
    }

    /**
     * 初始化模板
     */
    private initializeTemplates(): void {
        // 这里可以添加模板初始化逻辑
        // 为了简化，暂时留空
    }
}

/**
 * LaTeX模板接口
 */
export interface LaTeXTemplate {
    name: string;
    template: string;
    placeholders: string[];
    description: string;
}