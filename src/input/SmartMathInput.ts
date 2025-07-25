import { App, Editor, EditorSuggest, EditorPosition, TFile, EditorSuggestTriggerInfo, EditorSuggestContext } from 'obsidian';
import { ISmartMathInput } from '../interfaces/core';
import { InputContext, Suggestion, MathCategory } from '../types';
import { NeuralLatexConverter } from '../latex/NeuralLatexConverter';
import { TermRecognitionEngine } from '../recognition/TermRecognitionEngine';
import { ContextAnalyzer } from './ContextAnalyzer';
import { PersonalizedLearningEngine } from './PersonalizedLearningEngine';
import { SuggestionRanker } from './SuggestionRanker';

/**
 * AI驱动的智能数学输入辅助系统
 * 基于神经网络模型提供上下文感知的自动补全功能
 */
export class SmartMathInput extends EditorSuggest<Suggestion> implements ISmartMathInput {
    public app: App;
    private neuralConverter: NeuralLatexConverter;
    private termRecognitionEngine: TermRecognitionEngine;
    private contextAnalyzer: ContextAnalyzer;
    private learningEngine: PersonalizedLearningEngine;
    private suggestionRanker: SuggestionRanker;
    
    private isActive: boolean = false;
    private currentContext: InputContext | null = null;
    private suggestionCache: Map<string, Suggestion[]> = new Map();
    private performanceMetrics: PerformanceMetrics = {
        totalSuggestions: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        userAcceptanceRate: 0
    };

    constructor(
        app: App, 
        neuralConverter: NeuralLatexConverter,
        termRecognitionEngine: TermRecognitionEngine
    ) {
        super(app);
        this.app = app;
        this.neuralConverter = neuralConverter;
        this.termRecognitionEngine = termRecognitionEngine;
        
        // 初始化AI增强组件
        this.contextAnalyzer = new ContextAnalyzer(app, termRecognitionEngine);
        this.learningEngine = new PersonalizedLearningEngine(app);
        this.suggestionRanker = new SuggestionRanker(this.learningEngine);
        
        // 配置建议器
        this.limit = 10; // 最多显示10个建议
        this.setInstructions([
            {
                command: '↑↓',
                purpose: '导航建议'
            },
            {
                command: '↵',
                purpose: '选择建议'
            },
            {
                command: 'Esc',
                purpose: '关闭建议'
            }
        ]);
    }

    /**
     * 激活智能输入模式
     */
    activate(editor: Editor): void {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('🚀 SmartMathInput: AI智能输入模式已激活');
        
        // 注册建议器 - 使用更安全的方式
        try {
            (this.app.workspace as any).editorSuggest?.addChild(this);
        } catch (error) {
            console.warn('SmartMathInput: 无法注册建议器:', error);
        }
        
        // 初始化学习引擎
        this.learningEngine.initialize();
        
        // 显示激活提示
        this.showActivationNotice();
    }

    /**
     * 停用智能输入模式
     */
    deactivate(): void {
        if (!this.isActive) return;
        
        this.isActive = false;
        console.log('⏹️ SmartMathInput: AI智能输入模式已停用');
        
        // 移除建议器
        try {
            (this.app.workspace as any).editorSuggest?.removeChild(this);
        } catch (error) {
            console.warn('SmartMathInput: 无法移除建议器:', error);
        }
        
        // 清理缓存
        this.suggestionCache.clear();
        this.currentContext = null;
    }

    /**
     * 触发建议 - Obsidian EditorSuggest接口实现
     */
    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        if (!this.isActive) return null;
        
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);
        
        // 检查是否应该触发建议
        if (this.shouldTriggerSuggestion(beforeCursor)) {
            const triggerInfo = this.extractTriggerInfo(beforeCursor, cursor);
            if (triggerInfo) {
                // 异步更新上下文
                this.updateContextAsync(editor, file, cursor);
                return triggerInfo;
            }
        }
        
        return null;
    }

    /**
     * 获取建议列表 - 支持两种接口
     */
    async getSuggestions(contextOrInput: EditorSuggestContext | string, inputContext?: InputContext): Promise<Suggestion[]> {
        const startTime = performance.now();
        
        try {
            // Handle both interface signatures
            let query: string;
            let context: InputContext | null;
            
            if (typeof contextOrInput === 'string') {
                // ISmartMathInput interface call
                query = contextOrInput.toLowerCase().trim();
                context = inputContext || null;
            } else {
                // EditorSuggest interface call
                query = contextOrInput.query.toLowerCase().trim();
                context = this.currentContext;
            }
            
            if (!query) return [];
            
            // 检查缓存
            const cacheKey = this.generateCacheKey(query, context);
            if (this.suggestionCache.has(cacheKey)) {
                this.performanceMetrics.cacheHitRate++;
                return this.suggestionCache.get(cacheKey)!;
            }
            
            // 生成AI增强建议
            const suggestions = await this.generateAISuggestions(query, context);
            
            // 缓存结果
            this.suggestionCache.set(cacheKey, suggestions);
            
            // 更新性能指标
            const responseTime = performance.now() - startTime;
            this.updatePerformanceMetrics(responseTime);
            
            return suggestions;
        } catch (error) {
            console.error('SmartMathInput: 获取建议失败:', error);
            return [];
        }
    }

    /**
     * 渲染建议项 - Obsidian EditorSuggest接口实现
     */
    renderSuggestion(suggestion: Suggestion, el: HTMLElement): void {
        const container = el.createDiv({ cls: 'smart-math-suggestion' });
        
        // 主要内容
        const mainContent = container.createDiv({ cls: 'suggestion-main' });
        
        // 术语/公式名称
        const title = mainContent.createDiv({ cls: 'suggestion-title' });
        title.textContent = suggestion.text;
        
        // LaTeX预览
        if (suggestion.latexCode) {
            const latexPreview = mainContent.createDiv({ cls: 'suggestion-latex' });
            latexPreview.innerHTML = `<code>${suggestion.latexCode}</code>`;
        }
        
        // 描述
        if (suggestion.description) {
            const description = mainContent.createDiv({ cls: 'suggestion-description' });
            description.textContent = suggestion.description;
        }
        
        // 元数据
        const metadata = container.createDiv({ cls: 'suggestion-metadata' });
        
        // 类型标签
        const typeTag = metadata.createSpan({ cls: `suggestion-type type-${suggestion.type}` });
        typeTag.textContent = this.getTypeDisplayName(suggestion.type);
        
        // 分类标签
        const categoryTag = metadata.createSpan({ cls: 'suggestion-category' });
        categoryTag.textContent = suggestion.category;
        
        // 置信度指示器
        const confidenceBar = metadata.createDiv({ cls: 'suggestion-confidence' });
        const confidenceLevel = Math.round(suggestion.score * 100);
        confidenceBar.style.width = `${confidenceLevel}%`;
        confidenceBar.title = `置信度: ${confidenceLevel}%`;
        
        // AI增强标识
        if (suggestion.score > 0.8) {
            const aiTag = metadata.createSpan({ cls: 'suggestion-ai-enhanced' });
            aiTag.textContent = '🧠 AI';
            aiTag.title = 'AI增强建议';
        }
    }

    /**
     * 选择建议 - Obsidian EditorSuggest接口实现
     */
    selectSuggestion(suggestion: Suggestion, evt: MouseEvent | KeyboardEvent): void {
        const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
        if (!activeView) return;
        
        const editor = (activeView as any).editor;
        this.insertSuggestion(suggestion, editor);
        
        // 记录学习数据
        this.learnFromUsage(suggestion.text, suggestion.latexCode);
        
        // 更新用户接受率
        this.performanceMetrics.userAcceptanceRate++;
    }

    /**
     * 插入建议到编辑器
     */
    insertSuggestion(suggestion: Suggestion, editor: Editor): void {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);
        
        // 找到要替换的文本范围
        const replaceRange = this.findReplaceRange(beforeCursor);
        const startPos = { line: cursor.line, ch: cursor.ch - replaceRange.length };
        
        // 根据建议类型决定插入格式
        let insertText = '';
        switch (suggestion.type) {
            case 'term':
                insertText = this.formatTermInsertion(suggestion);
                break;
            case 'formula':
                insertText = this.formatFormulaInsertion(suggestion);
                break;
            case 'template':
                insertText = this.formatTemplateInsertion(suggestion);
                break;
        }
        
        // 执行插入
        editor.replaceRange(insertText, startPos, cursor);
        
        // 智能光标定位
        this.positionCursorAfterInsertion(editor, startPos, insertText, suggestion);
        
        console.log(`✅ SmartMathInput: 插入建议 "${suggestion.text}" -> "${insertText}"`);
    }

    /**
     * 从使用中学习
     */
    async learnFromUsage(input: string, selected: string): Promise<void> {
        try {
            // 记录用户选择
            await this.learningEngine.recordUserChoice(input, selected, this.currentContext);
            
            // 更新个性化模型
            await this.learningEngine.updatePersonalizationModel(input, selected);
            
            // 优化建议排序
            this.suggestionRanker.updateFromUserFeedback(input, selected);
            
            console.log(`📚 SmartMathInput: 学习记录 "${input}" -> "${selected}"`);
        } catch (error) {
            console.error('SmartMathInput: 学习记录失败:', error);
        }
    }

    /**
     * 生成AI增强建议
     */
    private async generateAISuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];
        
        // 1. 神经网络术语建议
        const neuralSuggestions = await this.generateNeuralSuggestions(query, context);
        suggestions.push(...neuralSuggestions);
        
        // 2. 上下文感知建议
        const contextSuggestions = await this.generateContextSuggestions(query, context);
        suggestions.push(...contextSuggestions);
        
        // 3. 个性化建议
        const personalizedSuggestions = await this.generatePersonalizedSuggestions(query, context);
        suggestions.push(...personalizedSuggestions);
        
        // 4. 模板建议
        const templateSuggestions = await this.generateTemplateSuggestions(query, context);
        suggestions.push(...templateSuggestions);
        
        // 去重和排序
        const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
        const rankedSuggestions = await this.suggestionRanker.rankSuggestions(uniqueSuggestions, query, context);
        
        // 限制数量并返回
        return rankedSuggestions.slice(0, this.limit);
    }

    /**
     * 生成神经网络增强建议
     */
    private async generateNeuralSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];
        
        try {
            // 使用神经网络转换器获取LaTeX建议
            const conversionResult = await this.neuralConverter.convertTerm(query);
            
            if (conversionResult.confidence > 0.5) {
                suggestions.push({
                    text: query,
                    latexCode: conversionResult.latexCode,
                    description: `神经网络转换 (置信度: ${Math.round(conversionResult.confidence * 100)}%)`,
                    score: conversionResult.confidence,
                    type: 'term',
                    category: this.inferCategory(query, context)
                });
            }
            
            // 添加替代方案
            for (const alternative of conversionResult.alternatives) {
                suggestions.push({
                    text: query,
                    latexCode: alternative,
                    description: '替代LaTeX表示',
                    score: conversionResult.confidence * 0.8,
                    type: 'term',
                    category: this.inferCategory(query, context)
                });
            }
        } catch (error) {
            console.warn('SmartMathInput: 神经网络建议生成失败:', error);
        }
        
        return suggestions;
    }

    /**
     * 生成上下文感知建议
     */
    private async generateContextSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        if (!context) return [];
        
        const suggestions: Suggestion[] = [];
        
        try {
            // 基于当前笔记内容的建议
            const relatedTerms = await this.contextAnalyzer.findRelatedTerms(query, context);
            
            for (const term of relatedTerms) {
                const conversionResult = await this.neuralConverter.convertTerm(term.chineseName);
                
                suggestions.push({
                    text: term.chineseName,
                    latexCode: conversionResult.latexCode,
                    description: `上下文相关术语 (${term.category})`,
                    score: 0.7 + (term.chineseName.includes(query) ? 0.2 : 0),
                    type: 'term',
                    category: term.category
                });
            }
            
            // 基于数学领域的建议
            const domainSuggestions = await this.generateDomainSpecificSuggestions(query, context.detectedCategory);
            suggestions.push(...domainSuggestions);
            
        } catch (error) {
            console.warn('SmartMathInput: 上下文建议生成失败:', error);
        }
        
        return suggestions;
    }

    /**
     * 生成个性化建议
     */
    private async generatePersonalizedSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];
        
        try {
            // 基于使用频率的建议
            const frequentTerms = await this.learningEngine.getFrequentlyUsedTerms(query);
            
            for (const term of frequentTerms) {
                const conversionResult = await this.neuralConverter.convertTerm(term.term);
                
                suggestions.push({
                    text: term.term,
                    latexCode: conversionResult.latexCode,
                    description: `常用术语 (使用${term.count}次)`,
                    score: 0.6 + Math.min(0.3, term.count * 0.01),
                    type: 'term',
                    category: this.inferCategory(term.term, context)
                });
            }
            
            // 基于学习路径的建议
            const learningPathSuggestions = await this.learningEngine.getLearningPathSuggestions(query, context);
            suggestions.push(...learningPathSuggestions);
            
        } catch (error) {
            console.warn('SmartMathInput: 个性化建议生成失败:', error);
        }
        
        return suggestions;
    }

    /**
     * 生成模板建议
     */
    private async generateTemplateSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];
        
        // 常用数学模板
        const templates = [
            {
                trigger: ['分数', 'frac'],
                template: '\\frac{${1:分子}}{${2:分母}}',
                description: '分数模板',
                category: MathCategory.ALGEBRA
            },
            {
                trigger: ['根号', 'sqrt'],
                template: '\\sqrt{${1:表达式}}',
                description: '平方根模板',
                category: MathCategory.ALGEBRA
            },
            {
                trigger: ['积分', 'int'],
                template: '\\int_{${1:下限}}^{${2:上限}} ${3:被积函数} \\, d${4:变量}',
                description: '定积分模板',
                category: MathCategory.CALCULUS
            },
            {
                trigger: ['求和', 'sum'],
                template: '\\sum_{${1:i=1}}^{${2:n}} ${3:表达式}',
                description: '求和模板',
                category: MathCategory.ALGEBRA
            },
            {
                trigger: ['极限', 'lim'],
                template: '\\lim_{${1:x \\to a}} ${2:函数}',
                description: '极限模板',
                category: MathCategory.CALCULUS
            },
            {
                trigger: ['矩阵', 'matrix'],
                template: '\\begin{pmatrix}\n${1:a} & ${2:b} \\\\\n${3:c} & ${4:d}\n\\end{pmatrix}',
                description: '2×2矩阵模板',
                category: MathCategory.LINEAR_ALGEBRA
            }
        ];
        
        for (const template of templates) {
            if (template.trigger.some(trigger => trigger.includes(query) || query.includes(trigger))) {
                suggestions.push({
                    text: template.description,
                    latexCode: template.template,
                    description: `LaTeX模板 - ${template.description}`,
                    score: 0.8,
                    type: 'template',
                    category: template.category
                });
            }
        }
        
        return suggestions;
    }

    /**
     * 生成领域特定建议
     */
    private async generateDomainSpecificSuggestions(query: string, category: MathCategory): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];
        
        const domainTerms: Record<MathCategory, string[]> = {
            [MathCategory.CALCULUS]: ['导数', '积分', '极限', '微分', '偏导数', '梯度'],
            [MathCategory.LINEAR_ALGEBRA]: ['矩阵', '向量', '行列式', '特征值', '特征向量', '线性变换'],
            [MathCategory.STATISTICS]: ['概率', '期望', '方差', '标准差', '分布', '假设检验'],
            [MathCategory.ALGEBRA]: ['多项式', '方程', '不等式', '函数', '集合', '映射'],
            [MathCategory.GEOMETRY]: ['点', '线', '面', '角', '三角形', '圆', '椭圆'],
            [MathCategory.DISCRETE_MATH]: ['图论', '组合', '递推', '生成函数', '群论'],
            [MathCategory.NUMBER_THEORY]: ['质数', '因数', '同余', '欧拉函数', '费马定理'],
            [MathCategory.TOPOLOGY]: ['拓扑空间', '连续性', '紧致性', '连通性'],
            [MathCategory.ANALYSIS]: ['实分析', '复分析', '泛函分析', '测度论'],
            [MathCategory.PROBABILITY]: ['随机变量', '概率分布', '期望值', '方差'],
            [MathCategory.SET_THEORY]: ['集合', '子集', '并集', '交集', '补集'],
            [MathCategory.LOGIC]: ['命题', '谓词', '量词', '推理', '证明']
        };
        
        const terms = domainTerms[category] || [];
        for (const term of terms) {
            if (term.includes(query) || query.includes(term)) {
                const conversionResult = await this.neuralConverter.convertTerm(term);
                suggestions.push({
                    text: term,
                    latexCode: conversionResult.latexCode,
                    description: `${category}相关术语`,
                    score: 0.6,
                    type: 'term',
                    category: category
                });
            }
        }
        
        return suggestions;
    }

    /**
     * 检查是否应该触发建议
     */
    private shouldTriggerSuggestion(beforeCursor: string): boolean {
        // 中文字符触发
        if (/[\u4e00-\u9fff]/.test(beforeCursor.slice(-1))) {
            return true;
        }
        
        // 数学符号触发
        if (/[\\$]/.test(beforeCursor.slice(-1))) {
            return true;
        }
        
        // 连续字母触发
        if (/[a-zA-Z]{2,}$/.test(beforeCursor)) {
            return true;
        }
        
        return false;
    }

    /**
     * 提取触发信息
     */
    private extractTriggerInfo(beforeCursor: string, cursor: EditorPosition): EditorSuggestTriggerInfo | null {
        // 查找查询起始位置
        let start = cursor.ch;
        let query = '';
        
        // 向前查找到空格、标点或行首
        for (let i = cursor.ch - 1; i >= 0; i--) {
            const char = beforeCursor[i];
            if (/[\s\n\t,，。；;！!？?（）()【】\[\]{}]/.test(char)) {
                break;
            }
            start = i;
            query = char + query;
        }
        
        if (query.length < 1) return null;
        
        return {
            start: { line: cursor.line, ch: start },
            end: cursor,
            query: query
        };
    }

    /**
     * 异步更新上下文
     */
    private async updateContextAsync(editor: Editor, file: TFile, cursor: EditorPosition): Promise<void> {
        try {
            this.currentContext = await this.contextAnalyzer.analyzeContext(editor, file, cursor);
        } catch (error) {
            console.warn('SmartMathInput: 上下文分析失败:', error);
            this.currentContext = null;
        }
    }

    /**
     * 生成缓存键
     */
    private generateCacheKey(query: string, context: InputContext | null): string {
        const contextKey = context ? `${context.currentNote}-${context.detectedCategory}` : 'no-context';
        return `${query}-${contextKey}`;
    }

    /**
     * 去重建议
     */
    private deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
        const seen = new Set<string>();
        return suggestions.filter(suggestion => {
            const key = `${suggestion.text}-${suggestion.latexCode}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * 推断术语类别
     */
    private inferCategory(term: string, context: InputContext | null): MathCategory {
        if (context?.detectedCategory) {
            return context.detectedCategory;
        }
        
        // 基于术语内容推断
        if (term.includes('导数') || term.includes('积分') || term.includes('极限')) {
            return MathCategory.CALCULUS;
        }
        if (term.includes('矩阵') || term.includes('向量')) {
            return MathCategory.LINEAR_ALGEBRA;
        }
        if (term.includes('概率') || term.includes('统计')) {
            return MathCategory.STATISTICS;
        }
        
        return MathCategory.ALGEBRA; // 默认
    }

    /**
     * 格式化术语插入
     */
    private formatTermInsertion(suggestion: Suggestion): string {
        // 检查是否需要数学模式
        if (suggestion.latexCode.includes('\\')) {
            return `$${suggestion.latexCode}$`;
        }
        return suggestion.latexCode;
    }

    /**
     * 格式化公式插入
     */
    private formatFormulaInsertion(suggestion: Suggestion): string {
        // 公式通常使用块模式
        return `$$\n${suggestion.latexCode}\n$$`;
    }

    /**
     * 格式化模板插入
     */
    private formatTemplateInsertion(suggestion: Suggestion): string {
        // 模板使用内联模式，但保留占位符
        return `$${suggestion.latexCode}$`;
    }

    /**
     * 查找替换范围
     */
    private findReplaceRange(beforeCursor: string): string {
        let range = '';
        for (let i = beforeCursor.length - 1; i >= 0; i--) {
            const char = beforeCursor[i];
            if (/[\s\n\t,，。；;！!？?（）()【】\[\]{}]/.test(char)) {
                break;
            }
            range = char + range;
        }
        return range;
    }

    /**
     * 智能光标定位
     */
    private positionCursorAfterInsertion(editor: Editor, startPos: EditorPosition, insertText: string, suggestion: Suggestion): void {
        if (suggestion.type === 'template' && insertText.includes('${')) {
            // 模板插入：定位到第一个占位符
            const firstPlaceholder = insertText.match(/\$\{1:([^}]*)\}/);
            if (firstPlaceholder) {
                const placeholderStart = insertText.indexOf(firstPlaceholder[0]);
                const placeholderContent = firstPlaceholder[1];
                const newPos = {
                    line: startPos.line,
                    ch: startPos.ch + placeholderStart + 4 // 跳过 ${1:
                };
                editor.setSelection(newPos, {
                    line: newPos.line,
                    ch: newPos.ch + placeholderContent.length
                });
                return;
            }
        }
        
        // 默认：移动到插入文本末尾
        const newPos = {
            line: startPos.line,
            ch: startPos.ch + insertText.length
        };
        editor.setCursor(newPos);
    }

    /**
     * 获取类型显示名称
     */
    private getTypeDisplayName(type: string): string {
        const typeNames: Record<string, string> = {
            'term': '术语',
            'formula': '公式',
            'template': '模板'
        };
        return typeNames[type] || type;
    }

    /**
     * 显示激活通知
     */
    private showActivationNotice(): void {
        const notice = document.createElement('div');
        notice.className = 'smart-math-input-notice';
        notice.innerHTML = `
            <div class="notice-content">
                <span class="notice-icon">🧠</span>
                <span class="notice-text">AI智能数学输入已激活</span>
            </div>
        `;
        
        document.body.appendChild(notice);
        setTimeout(() => {
            if (notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        }, 2000);
    }

    /**
     * 更新性能指标
     */
    private updatePerformanceMetrics(responseTime: number): void {
        this.performanceMetrics.totalSuggestions++;
        this.performanceMetrics.averageResponseTime = 
            (this.performanceMetrics.averageResponseTime + responseTime) / 2;
    }

    /**
     * 获取性能报告
     */
    getPerformanceReport(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }
}

/**
 * 性能指标接口
 */
interface PerformanceMetrics {
    totalSuggestions: number;
    averageResponseTime: number;
    cacheHitRate: number;
    userAcceptanceRate: number;
}