import { App, TFile } from 'obsidian';
import { InputContext, Suggestion, MathCategory } from '../types';

/**
 * 个性化学习引擎 - 基于用户行为模式的自适应学习系统
 * 分析用户习惯，优化建议质量，提供个性化的数学输入体验
 */
export class PersonalizedLearningEngine {
    private app: App;
    private userProfile: UserProfile;
    private usageHistory: UsageRecord[] = [];
    private learningModel: LearningModel;
    private isInitialized: boolean = false;

    constructor(app: App) {
        this.app = app;
        this.userProfile = this.createDefaultProfile();
        this.learningModel = new LearningModel();
    }

    /**
     * 初始化学习引擎
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // 加载用户档案
            await this.loadUserProfile();
            
            // 加载使用历史
            await this.loadUsageHistory();
            
            // 初始化学习模型
            await this.learningModel.initialize(this.usageHistory);
            
            this.isInitialized = true;
            console.log('✅ PersonalizedLearningEngine: 个性化学习引擎初始化完成');
        } catch (error) {
            console.error('PersonalizedLearningEngine: 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 记录用户选择
     */
    async recordUserChoice(input: string, selected: string, context: InputContext | null): Promise<void> {
        const record: UsageRecord = {
            id: this.generateId(),
            timestamp: Date.now(),
            input,
            selected,
            context: context ? { ...context } : null,
            sessionId: this.getCurrentSessionId(),
            responseTime: 0, // 将在调用时设置
            userSatisfaction: null // 将通过其他方式收集
        };

        this.usageHistory.push(record);
        
        // 限制历史记录数量
        if (this.usageHistory.length > 10000) {
            this.usageHistory = this.usageHistory.slice(-8000); // 保留最近8000条
        }

        // 异步保存
        this.saveUsageHistory().catch(error => {
            console.warn('PersonalizedLearningEngine: 保存使用历史失败:', error);
        });

        // 更新学习模型
        await this.learningModel.updateFromRecord(record);
        
        console.log(`📚 PersonalizedLearningEngine: 记录用户选择 "${input}" -> "${selected}"`);
    }

    /**
     * 更新个性化模型
     */
    async updatePersonalizationModel(input: string, selected: string): Promise<void> {
        try {
            // 更新用户偏好
            this.updateUserPreferences(input, selected);
            
            // 更新类别偏好
            this.updateCategoryPreferences(input, selected);
            
            // 更新输入模式
            this.updateInputPatterns(input, selected);
            
            // 保存用户档案
            await this.saveUserProfile();
            
        } catch (error) {
            console.error('PersonalizedLearningEngine: 更新个性化模型失败:', error);
        }
    }

    /**
     * 获取用户偏好
     */
    async getUserPreferences(): Promise<UserPreferences> {
        return {
            preferredCategories: this.userProfile.preferredCategories,
            preferredInputTypes: this.userProfile.preferredInputTypes,
            difficultyLevel: this.userProfile.difficultyLevel,
            learningStyle: this.userProfile.learningStyle,
            responseSpeedPreference: this.userProfile.responseSpeedPreference
        };
    }

    /**
     * 获取常用术语
     */
    async getFrequentlyUsedTerms(query: string): Promise<FrequentTerm[]> {
        const termFrequency = new Map<string, number>();
        
        // 统计术语使用频率
        for (const record of this.usageHistory) {
            if (record.selected.includes(query) || query.includes(record.selected)) {
                const count = termFrequency.get(record.selected) || 0;
                termFrequency.set(record.selected, count + 1);
            }
        }

        // 转换为FrequentTerm数组并排序
        const frequentTerms: FrequentTerm[] = [];
        for (const [term, count] of termFrequency.entries()) {
            frequentTerms.push({ term, count });
        }

        return frequentTerms
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // 返回前10个最常用的
    }

    /**
     * 获取学习路径建议
     */
    async getLearningPathSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];

        try {
            // 基于学习进度的建议
            const progressSuggestions = await this.generateProgressBasedSuggestions(query, context);
            suggestions.push(...progressSuggestions);

            // 基于知识图谱的建议
            const knowledgeGraphSuggestions = await this.generateKnowledgeGraphSuggestions(query, context);
            suggestions.push(...knowledgeGraphSuggestions);

            // 基于难度递进的建议
            const difficultyBasedSuggestions = await this.generateDifficultyBasedSuggestions(query, context);
            suggestions.push(...difficultyBasedSuggestions);

        } catch (error) {
            console.warn('PersonalizedLearningEngine: 生成学习路径建议失败:', error);
        }

        return suggestions;
    }

    /**
     * 预测用户需求
     */
    async predictUserNeeds(context: InputContext): Promise<PredictedNeeds> {
        const recentRecords = this.usageHistory.slice(-50); // 最近50条记录
        
        // 分析使用模式
        const patterns = this.analyzeUsagePatterns(recentRecords);
        
        // 预测下一个可能的输入
        const nextInputPrediction = await this.learningModel.predictNextInput(context, patterns);
        
        // 预测用户困难点
        const difficultyPrediction = this.predictUserDifficulties(recentRecords);
        
        // 预测学习目标
        const learningGoals = this.predictLearningGoals(patterns);

        return {
            nextInputPrediction,
            difficultyPrediction,
            learningGoals,
            recommendedActions: this.generateRecommendedActions(patterns)
        };
    }

    /**
     * 获取个性化权重
     */
    getPersonalizationWeights(context: InputContext | null): PersonalizationWeights {
        return {
            categoryPreference: this.calculateCategoryPreferenceWeight(context),
            usageFrequency: this.calculateUsageFrequencyWeight(context),
            recentActivity: this.calculateRecentActivityWeight(),
            learningProgress: this.calculateLearningProgressWeight(context),
            difficultyAlignment: this.calculateDifficultyAlignmentWeight(context)
        };
    }

    /**
     * 创建默认用户档案
     */
    private createDefaultProfile(): UserProfile {
        return {
            userId: this.generateUserId(),
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            
            // 偏好设置
            preferredCategories: [MathCategory.ALGEBRA], // 默认代数
            preferredInputTypes: ['term', 'formula'],
            difficultyLevel: 0.5, // 中等难度
            learningStyle: 'balanced',
            responseSpeedPreference: 'normal',
            
            // 使用统计
            totalSessions: 0,
            totalInputs: 0,
            averageSessionDuration: 0,
            
            // 学习进度
            masteredConcepts: new Set(),
            strugglingConcepts: new Set(),
            learningGoals: [],
            
            // 行为模式
            inputPatterns: new Map(),
            errorPatterns: new Map(),
            successPatterns: new Map(),
            
            // 个性化参数
            adaptationRate: 0.1,
            forgettingRate: 0.05,
            confidenceThreshold: 0.7
        };
    }

    /**
     * 加载用户档案
     */
    private async loadUserProfile(): Promise<void> {
        try {
            const profilePath = '.obsidian/plugins/math-memory-graph/user-profile.json';
            const file = this.app.vault.getAbstractFileByPath(profilePath);
            
            if (file && file instanceof TFile) {
                const content = await this.app.vault.read(file);
                const savedProfile = JSON.parse(content);
                
                // 合并保存的档案和默认档案
                this.userProfile = { ...this.userProfile, ...savedProfile };
                
                // 转换Set类型（JSON序列化后会变成数组）
                if (savedProfile.masteredConcepts) {
                    this.userProfile.masteredConcepts = new Set(savedProfile.masteredConcepts);
                }
                if (savedProfile.strugglingConcepts) {
                    this.userProfile.strugglingConcepts = new Set(savedProfile.strugglingConcepts);
                }
                if (savedProfile.inputPatterns) {
                    this.userProfile.inputPatterns = new Map(Object.entries(savedProfile.inputPatterns));
                }
                if (savedProfile.errorPatterns) {
                    this.userProfile.errorPatterns = new Map(Object.entries(savedProfile.errorPatterns));
                }
                if (savedProfile.successPatterns) {
                    this.userProfile.successPatterns = new Map(Object.entries(savedProfile.successPatterns));
                }
                
                console.log('✅ PersonalizedLearningEngine: 用户档案加载完成');
            }
        } catch (error) {
            console.warn('PersonalizedLearningEngine: 加载用户档案失败，使用默认档案:', error);
        }
    }

    /**
     * 保存用户档案
     */
    private async saveUserProfile(): Promise<void> {
        try {
            const profilePath = '.obsidian/plugins/math-memory-graph/user-profile.json';
            
            // 转换Set和Map为可序列化格式
            const serializableProfile = {
                ...this.userProfile,
                masteredConcepts: Array.from(this.userProfile.masteredConcepts),
                strugglingConcepts: Array.from(this.userProfile.strugglingConcepts),
                inputPatterns: Object.fromEntries(this.userProfile.inputPatterns),
                errorPatterns: Object.fromEntries(this.userProfile.errorPatterns),
                successPatterns: Object.fromEntries(this.userProfile.successPatterns),
                lastUpdated: Date.now()
            };
            
            const content = JSON.stringify(serializableProfile, null, 2);
            
            // 确保目录存在
            const dir = profilePath.substring(0, profilePath.lastIndexOf('/'));
            if (!await this.app.vault.adapter.exists(dir)) {
                await this.app.vault.adapter.mkdir(dir);
            }
            
            await this.app.vault.adapter.write(profilePath, content);
            
        } catch (error) {
            console.error('PersonalizedLearningEngine: 保存用户档案失败:', error);
        }
    }

    /**
     * 加载使用历史
     */
    private async loadUsageHistory(): Promise<void> {
        try {
            const historyPath = '.obsidian/plugins/math-memory-graph/usage-history.json';
            const file = this.app.vault.getAbstractFileByPath(historyPath);
            
            if (file && file instanceof TFile) {
                const content = await this.app.vault.read(file);
                this.usageHistory = JSON.parse(content);
                console.log(`✅ PersonalizedLearningEngine: 加载了${this.usageHistory.length}条使用历史`);
            }
        } catch (error) {
            console.warn('PersonalizedLearningEngine: 加载使用历史失败:', error);
            this.usageHistory = [];
        }
    }

    /**
     * 保存使用历史
     */
    private async saveUsageHistory(): Promise<void> {
        try {
            const historyPath = '.obsidian/plugins/math-memory-graph/usage-history.json';
            const content = JSON.stringify(this.usageHistory, null, 2);
            
            // 确保目录存在
            const dir = historyPath.substring(0, historyPath.lastIndexOf('/'));
            if (!await this.app.vault.adapter.exists(dir)) {
                await this.app.vault.adapter.mkdir(dir);
            }
            
            await this.app.vault.adapter.write(historyPath, content);
            
        } catch (error) {
            console.error('PersonalizedLearningEngine: 保存使用历史失败:', error);
        }
    }

    /**
     * 更新用户偏好
     */
    private updateUserPreferences(input: string, selected: string): void {
        // 更新输入模式统计
        const pattern = this.extractInputPattern(input);
        const currentCount = this.userProfile.inputPatterns.get(pattern) || 0;
        this.userProfile.inputPatterns.set(pattern, currentCount + 1);
        
        // 更新成功模式
        const successKey = `${input}->${selected}`;
        const successCount = this.userProfile.successPatterns.get(successKey) || 0;
        this.userProfile.successPatterns.set(successKey, successCount + 1);
        
        // 更新总计数
        this.userProfile.totalInputs++;
    }

    /**
     * 更新类别偏好
     */
    private updateCategoryPreferences(input: string, selected: string): void {
        // 基于选择的内容推断类别偏好
        const inferredCategory = this.inferCategoryFromSelection(selected);
        
        if (inferredCategory && !this.userProfile.preferredCategories.includes(inferredCategory)) {
            // 如果用户经常选择某个类别的内容，将其添加到偏好中
            const categoryUsage = this.countCategoryUsage(inferredCategory);
            if (categoryUsage > 10) { // 阈值：使用超过10次
                this.userProfile.preferredCategories.push(inferredCategory);
            }
        }
    }

    /**
     * 更新输入模式
     */
    private updateInputPatterns(input: string, selected: string): void {
        const pattern = this.extractInputPattern(input);
        const currentCount = this.userProfile.inputPatterns.get(pattern) || 0;
        this.userProfile.inputPatterns.set(pattern, currentCount + 1);
    }

    /**
     * 生成基于进度的建议
     */
    private async generateProgressBasedSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];
        
        // 基于掌握的概念推荐相关概念
        for (const masteredConcept of this.userProfile.masteredConcepts) {
            if (masteredConcept.includes(query) || query.includes(masteredConcept)) {
                suggestions.push({
                    text: masteredConcept,
                    latexCode: `\\text{${masteredConcept}}`,
                    description: '已掌握的相关概念',
                    score: 0.8,
                    type: 'term',
                    category: context?.detectedCategory || MathCategory.ALGEBRA
                });
            }
        }
        
        return suggestions;
    }

    /**
     * 生成知识图谱建议
     */
    private async generateKnowledgeGraphSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        // 这里应该与知识图谱系统集成
        // 暂时返回空数组，在知识图谱任务完成后实现
        return [];
    }

    /**
     * 生成基于难度的建议
     */
    private async generateDifficultyBasedSuggestions(query: string, context: InputContext | null): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];
        const userDifficulty = this.userProfile.difficultyLevel;
        
        // 根据用户难度级别提供适当的建议
        if (userDifficulty < 0.3) {
            // 初学者：提供基础概念
            suggestions.push({
                text: '基础概念',
                latexCode: '\\text{基础}',
                description: '适合初学者的基础概念',
                score: 0.7,
                type: 'term',
                category: MathCategory.ALGEBRA
            });
        } else if (userDifficulty > 0.7) {
            // 高级用户：提供复杂概念
            suggestions.push({
                text: '高级概念',
                latexCode: '\\text{高级}',
                description: '适合高级用户的复杂概念',
                score: 0.7,
                type: 'term',
                category: context?.detectedCategory || MathCategory.ALGEBRA
            });
        }
        
        return suggestions;
    }

    /**
     * 分析使用模式
     */
    private analyzeUsagePatterns(records: UsageRecord[]): UsagePatterns {
        const patterns: UsagePatterns = {
            mostUsedInputs: new Map(),
            preferredTimeOfDay: this.calculatePreferredTimeOfDay(records),
            averageSessionLength: this.calculateAverageSessionLength(records),
            errorRate: this.calculateErrorRate(records),
            improvementTrend: this.calculateImprovementTrend(records)
        };
        
        // 统计最常用的输入
        for (const record of records) {
            const count = patterns.mostUsedInputs.get(record.input) || 0;
            patterns.mostUsedInputs.set(record.input, count + 1);
        }
        
        return patterns;
    }

    /**
     * 预测用户困难点
     */
    private predictUserDifficulties(records: UsageRecord[]): string[] {
        const difficulties: string[] = [];
        
        // 分析错误模式
        for (const [pattern, count] of this.userProfile.errorPatterns.entries()) {
            if (count > 3) { // 错误超过3次的模式
                difficulties.push(pattern);
            }
        }
        
        return difficulties;
    }

    /**
     * 预测学习目标
     */
    private predictLearningGoals(patterns: UsagePatterns): string[] {
        const goals: string[] = [];
        
        // 基于使用模式推断学习目标
        const mostUsed = Array.from(patterns.mostUsedInputs.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        for (const [input, count] of mostUsed) {
            if (count > 5) {
                goals.push(`掌握 ${input} 相关概念`);
            }
        }
        
        return goals;
    }

    /**
     * 生成推荐行动
     */
    private generateRecommendedActions(patterns: UsagePatterns): string[] {
        const actions: string[] = [];
        
        if (patterns.errorRate > 0.3) {
            actions.push('建议复习基础概念');
        }
        
        if (patterns.averageSessionLength < 5) {
            actions.push('建议延长学习时间');
        }
        
        if (patterns.improvementTrend < 0) {
            actions.push('建议调整学习策略');
        }
        
        return actions;
    }

    /**
     * 计算各种权重
     */
    private calculateCategoryPreferenceWeight(context: InputContext | null): number {
        if (!context) return 0.5;
        
        const categoryCount = this.countCategoryUsage(context.detectedCategory);
        return Math.min(1.0, categoryCount * 0.01);
    }

    private calculateUsageFrequencyWeight(context: InputContext | null): number {
        // 基于整体使用频率
        return Math.min(1.0, this.userProfile.totalInputs * 0.001);
    }

    private calculateRecentActivityWeight(): number {
        const recentRecords = this.usageHistory.filter(record => 
            Date.now() - record.timestamp < 24 * 60 * 60 * 1000 // 24小时内
        );
        return Math.min(1.0, recentRecords.length * 0.1);
    }

    private calculateLearningProgressWeight(context: InputContext | null): number {
        const masteredCount = this.userProfile.masteredConcepts.size;
        return Math.min(1.0, masteredCount * 0.05);
    }

    private calculateDifficultyAlignmentWeight(context: InputContext | null): number {
        return this.userProfile.difficultyLevel;
    }

    /**
     * 辅助方法
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateUserId(): string {
        return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private getCurrentSessionId(): string {
        // 简化实现，实际应该基于会话管理
        return `session-${Date.now()}`;
    }

    private extractInputPattern(input: string): string {
        // 提取输入模式（简化版）
        if (/^[\u4e00-\u9fff]+$/.test(input)) return 'chinese-only';
        if (/^[a-zA-Z]+$/.test(input)) return 'english-only';
        if (/\\[a-zA-Z]+/.test(input)) return 'latex-command';
        return 'mixed';
    }

    private inferCategoryFromSelection(selected: string): MathCategory | null {
        // 基于选择内容推断类别
        if (selected.includes('frac') || selected.includes('导数') || selected.includes('积分')) {
            return MathCategory.CALCULUS;
        }
        if (selected.includes('matrix') || selected.includes('vec') || selected.includes('矩阵')) {
            return MathCategory.LINEAR_ALGEBRA;
        }
        // 添加更多推断逻辑...
        return null;
    }

    private countCategoryUsage(category: MathCategory): number {
        return this.usageHistory.filter(record => 
            record.context?.detectedCategory === category
        ).length;
    }

    private calculatePreferredTimeOfDay(records: UsageRecord[]): number {
        const hours = records.map(record => new Date(record.timestamp).getHours());
        const hourCounts = new Array(24).fill(0);
        
        for (const hour of hours) {
            hourCounts[hour]++;
        }
        
        let maxCount = 0;
        let preferredHour = 12; // 默认中午
        
        for (let i = 0; i < 24; i++) {
            if (hourCounts[i] > maxCount) {
                maxCount = hourCounts[i];
                preferredHour = i;
            }
        }
        
        return preferredHour;
    }

    private calculateAverageSessionLength(records: UsageRecord[]): number {
        // 简化实现
        return records.length > 0 ? records.length / 10 : 0;
    }

    private calculateErrorRate(records: UsageRecord[]): number {
        // 简化实现，实际需要更复杂的错误检测
        return 0.1; // 假设10%错误率
    }

    private calculateImprovementTrend(records: UsageRecord[]): number {
        // 简化实现，实际需要分析时间序列
        return 0.05; // 假设5%改进趋势
    }
}

/**
 * 学习模型类
 */
class LearningModel {
    private patterns: Map<string, number> = new Map();
    private predictions: Map<string, string[]> = new Map();

    async initialize(history: UsageRecord[]): Promise<void> {
        // 从历史记录中学习模式
        for (const record of history) {
            this.updatePatterns(record);
        }
    }

    async updateFromRecord(record: UsageRecord): Promise<void> {
        this.updatePatterns(record);
    }

    async predictNextInput(context: InputContext, patterns: UsagePatterns): Promise<string[]> {
        // 基于上下文和模式预测下一个输入
        const predictions: string[] = [];
        
        // 基于最常用输入预测
        const mostUsed = Array.from(patterns.mostUsedInputs.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        for (const [input, count] of mostUsed) {
            predictions.push(input);
        }
        
        return predictions;
    }

    private updatePatterns(record: UsageRecord): void {
        const key = `${record.input}->${record.selected}`;
        const count = this.patterns.get(key) || 0;
        this.patterns.set(key, count + 1);
    }
}

/**
 * 类型定义
 */
interface UserProfile {
    userId: string;
    createdAt: number;
    lastUpdated: number;
    
    // 偏好设置
    preferredCategories: MathCategory[];
    preferredInputTypes: string[];
    difficultyLevel: number;
    learningStyle: 'visual' | 'textual' | 'balanced';
    responseSpeedPreference: 'fast' | 'normal' | 'detailed';
    
    // 使用统计
    totalSessions: number;
    totalInputs: number;
    averageSessionDuration: number;
    
    // 学习进度
    masteredConcepts: Set<string>;
    strugglingConcepts: Set<string>;
    learningGoals: string[];
    
    // 行为模式
    inputPatterns: Map<string, number>;
    errorPatterns: Map<string, number>;
    successPatterns: Map<string, number>;
    
    // 个性化参数
    adaptationRate: number;
    forgettingRate: number;
    confidenceThreshold: number;
}

interface UsageRecord {
    id: string;
    timestamp: number;
    input: string;
    selected: string;
    context: InputContext | null;
    sessionId: string;
    responseTime: number;
    userSatisfaction: number | null;
}

interface UserPreferences {
    preferredCategories: MathCategory[];
    preferredInputTypes: string[];
    difficultyLevel: number;
    learningStyle: string;
    responseSpeedPreference: string;
}

interface FrequentTerm {
    term: string;
    count: number;
}

interface PredictedNeeds {
    nextInputPrediction: string[];
    difficultyPrediction: string[];
    learningGoals: string[];
    recommendedActions: string[];
}

interface PersonalizationWeights {
    categoryPreference: number;
    usageFrequency: number;
    recentActivity: number;
    learningProgress: number;
    difficultyAlignment: number;
}

interface UsagePatterns {
    mostUsedInputs: Map<string, number>;
    preferredTimeOfDay: number;
    averageSessionLength: number;
    errorRate: number;
    improvementTrend: number;
}