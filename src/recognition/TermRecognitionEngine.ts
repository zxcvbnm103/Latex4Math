import { App, TFile, CachedMetadata } from 'obsidian';
import { ITermRecognitionEngine } from '../interfaces/core';
import { MathTerm, RecognizedTerm, ValidationResult, MathCategory } from '../types';
import { ChineseMathDictionary } from './ChineseMathDictionary';
import { TextScanner } from './TextScanner';
import { TermMarker } from './TermMarker';
import { UsageTracker } from './UsageTracker';

/**
 * 自适应术语识别引擎
 * 负责识别中文数学术语，管理术语词典，跟踪使用频率
 */
export class TermRecognitionEngine implements ITermRecognitionEngine {
    private app: App;
    private dictionary: ChineseMathDictionary;
    private textScanner: TextScanner;
    private termMarker: TermMarker;
    private usageTracker: UsageTracker;
    private isInitialized: boolean = false;

    constructor(app: App) {
        this.app = app;
        this.dictionary = new ChineseMathDictionary();
        this.textScanner = new TextScanner(this.dictionary);
        this.termMarker = new TermMarker(app);
        this.usageTracker = new UsageTracker();
    }

    /**
     * 初始化识别引擎
     */
    async initialize(): Promise<void> {
        console.log('TermRecognitionEngine: 初始化术语识别引擎...');
        
        try {
            // 初始化词典
            await this.dictionary.initialize();
            
            // 初始化使用频率跟踪器
            await this.usageTracker.initialize();
            
            // 注册Obsidian事件监听器
            this.registerEventHandlers();
            
            this.isInitialized = true;
            console.log('TermRecognitionEngine: 术语识别引擎初始化完成');
        } catch (error) {
            console.error('TermRecognitionEngine: 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 识别文本中的数学术语
     */
    async recognizeTerms(text: string): Promise<RecognizedTerm[]> {
        if (!this.isInitialized) {
            throw new Error('术语识别引擎未初始化');
        }

        try {
            // 使用文本扫描器识别术语
            const recognizedTerms = await this.textScanner.scanText(text);
            
            // 更新使用频率统计
            for (const term of recognizedTerms) {
                await this.usageTracker.recordUsage(term.text);
            }
            
            // 根据使用频率调整置信度
            const adjustedTerms = this.adjustConfidenceByUsage(recognizedTerms);
            
            console.log(`TermRecognitionEngine: 识别到 ${adjustedTerms.length} 个术语`);
            return adjustedTerms;
        } catch (error) {
            console.error('TermRecognitionEngine: 术语识别失败:', error);
            return [];
        }
    }

    /**
     * 添加自定义术语
     */
    async addCustomTerm(term: MathTerm): Promise<void> {
        try {
            // 验证术语
            const validation = await this.validateTerm(term.chineseName);
            if (!validation.isValid) {
                throw new Error(`术语验证失败: ${validation.errors.join(', ')}`);
            }

            // 添加到词典
            await this.dictionary.addTerm(term);
            
            // 初始化使用频率
            await this.usageTracker.initializeTerm(term.chineseName);
            
            console.log(`TermRecognitionEngine: 成功添加自定义术语: ${term.chineseName}`);
        } catch (error) {
            console.error('TermRecognitionEngine: 添加自定义术语失败:', error);
            throw error;
        }
    }

    /**
     * 更新术语词典
     */
    async updateTermDictionary(): Promise<void> {
        try {
            await this.dictionary.reload();
            console.log('TermRecognitionEngine: 术语词典更新完成');
        } catch (error) {
            console.error('TermRecognitionEngine: 术语词典更新失败:', error);
            throw error;
        }
    }

    /**
     * 验证术语
     */
    async validateTerm(term: string): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // 基本验证
        if (!term || term.trim().length === 0) {
            errors.push('术语不能为空');
        }

        if (term.length > 50) {
            warnings.push('术语长度过长，建议简化');
        }

        // 检查是否已存在
        const existingTerm = await this.dictionary.findTerm(term);
        if (existingTerm) {
            warnings.push('术语已存在于词典中');
            suggestions.push(`现有术语: ${existingTerm.chineseName} (${existingTerm.category})`);
        }

        // 检查相似术语
        const similarTerms = await this.dictionary.findSimilarTerms(term);
        if (similarTerms.length > 0) {
            suggestions.push(`相似术语: ${similarTerms.map(t => t.chineseName).join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }

    /**
     * 在当前文档中标记术语
     */
    async markTermsInCurrentNote(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            console.warn('TermRecognitionEngine: 没有活动文档');
            return;
        }

        try {
            const content = await this.app.vault.read(activeFile);
            const recognizedTerms = await this.recognizeTerms(content);
            
            if (recognizedTerms.length > 0) {
                await this.termMarker.markTerms(activeFile, recognizedTerms);
                console.log(`TermRecognitionEngine: 在文档 ${activeFile.name} 中标记了 ${recognizedTerms.length} 个术语`);
            }
        } catch (error) {
            console.error('TermRecognitionEngine: 标记术语失败:', error);
        }
    }

    /**
     * 自动创建术语双链
     */
    async createTermLinks(file: TFile, terms: RecognizedTerm[]): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            let modifiedContent = content;
            
            // 按位置倒序排列，避免索引偏移
            const sortedTerms = terms.sort((a, b) => b.startIndex - a.startIndex);
            
            for (const term of sortedTerms) {
                // 检查是否已经是链接
                const beforeText = content.substring(Math.max(0, term.startIndex - 2), term.startIndex);
                const afterText = content.substring(term.endIndex, Math.min(content.length, term.endIndex + 2));
                
                if (beforeText.includes('[[') || afterText.includes(']]')) {
                    continue; // 已经是链接，跳过
                }
                
                // 创建双链
                const linkText = `[[${term.text}]]`;
                modifiedContent = modifiedContent.substring(0, term.startIndex) + 
                                linkText + 
                                modifiedContent.substring(term.endIndex);
            }
            
            if (modifiedContent !== content) {
                await this.app.vault.modify(file, modifiedContent);
                console.log(`TermRecognitionEngine: 在 ${file.name} 中创建了 ${terms.length} 个术语链接`);
            }
        } catch (error) {
            console.error('TermRecognitionEngine: 创建术语链接失败:', error);
        }
    }

    /**
     * 获取术语使用统计
     */
    async getUsageStatistics(): Promise<Map<string, number>> {
        return await this.usageTracker.getStatistics();
    }

    /**
     * 根据使用频率调整置信度
     */
    private adjustConfidenceByUsage(terms: RecognizedTerm[]): RecognizedTerm[] {
        return terms.map(term => {
            const usageCount = this.usageTracker.getUsageCount(term.text);
            const usageBoost = Math.min(0.2, usageCount * 0.01); // 最多提升0.2
            
            return {
                ...term,
                confidence: Math.min(1.0, term.confidence + usageBoost)
            };
        });
    }

    /**
     * 注册事件处理器
     */
    private registerEventHandlers(): void {
        // 监听文件修改事件
        this.app.vault.on('modify', async (file: TFile) => {
            if (file.extension === 'md') {
                // 延迟处理，避免频繁触发
                setTimeout(async () => {
                    await this.processFileChange(file);
                }, 1000);
            }
        });

        // 监听文件创建事件
        this.app.vault.on('create', async (file: TFile) => {
            if (file.extension === 'md') {
                await this.processFileChange(file);
            }
        });

        console.log('TermRecognitionEngine: 事件处理器注册完成');
    }

    /**
     * 处理文件变更
     */
    private async processFileChange(file: TFile): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const recognizedTerms = await this.recognizeTerms(content);
            
            if (recognizedTerms.length > 0) {
                // 可选：自动创建链接（根据设置决定）
                // await this.createTermLinks(file, recognizedTerms);
                
                // 触发术语识别事件
                this.app.workspace.trigger('math-memory:terms-recognized', {
                    file,
                    terms: recognizedTerms
                });
            }
        } catch (error) {
            console.error('TermRecognitionEngine: 处理文件变更失败:', error);
        }
    }

    /**
     * 清理资源
     */
    cleanup(): void {
        // 清理事件监听器和资源
        console.log('TermRecognitionEngine: 清理资源');
    }
}