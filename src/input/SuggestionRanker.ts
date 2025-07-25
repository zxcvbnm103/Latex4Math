import { Suggestion, InputContext, MathCategory } from '../types';
import { PersonalizedLearningEngine } from './PersonalizedLearningEngine';

/**
 * 建议排序器 - 基于多维度评分的智能建议排序系统
 * 结合AI模型、用户偏好、上下文相关性等因素对建议进行智能排序
 */
export class SuggestionRanker {
    private learningEngine: PersonalizedLearningEngine;
    private rankingWeights: RankingWeights;
    private userFeedbackHistory: Map<string, FeedbackRecord[]> = new Map();

    constructor(learningEngine: PersonalizedLearningEngine) {
        this.learningEngine = learningEngine;
        this.rankingWeights = this.getDefaultWeights();
    }

    /**
     * 对建议进行智能排序
     */
    async rankSuggestions(
        suggestions: Suggestion[], 
        query: string, 
        context: InputContext | null
    ): Promise<Suggestion[]> {
        if (suggestions.length === 0) return suggestions;

        try {
            // 计算每个建议的综合分数
            const scoredSuggestions = await Promise.all(
                suggestions.map(async (suggestion) => {
                    const score = await this.calculateComprehensiveScore(suggestion, query, context);
                    return { ...suggestion, score };
                })
            );

            // 按分数排序
            const rankedSuggestions = scoredSuggestions.sort((a, b) => b.score - a.score);

            // 应用多样性调整
            const diversifiedSuggestions = this.applyDiversityAdjustment(rankedSuggestions);

            // 应用个性化调整
            const personalizedSuggestions = await this.applyPersonalizationAdjustment(
                diversifiedSuggestions, query, context
            );

            console.log(`🎯 SuggestionRanker: 对${suggestions.length}个建议进行了智能排序`);
            return personalizedSuggestions;

        } catch (error) {
            console.error('SuggestionRanker: 建议排序失败:', error);
            return suggestions; // 返回原始顺序
        }
    }

    /**
     * 从用户反馈中学习
     */
    updateFromUserFeedback(query: string, selectedSuggestion: string): void {
        const feedbackKey = this.generateFeedbackKey(query);
        
        if (!this.userFeedbackHistory.has(feedbackKey)) {
            this.userFeedbackHistory.set(feedbackKey, []);
        }

        const feedbackRecord: FeedbackRecord = {
            timestamp: Date.now(),
            query,
            selectedSuggestion,
            queryLength: query.length,
            selectionRank: -1 // 将在后续计算中设置
        };

        this.userFeedbackHistory.get(feedbackKey)!.push(feedbackRecord);

        // 限制历史记录数量
        const history = this.userFeedbackHistory.get(feedbackKey)!;
        if (history.length > 100) {
            this.userFeedbackHistory.set(feedbackKey, history.slice(-80));
        }

        // 动态调整权重
        this.adjustWeightsFromFeedback(feedbackRecord);
    }

    /**
     * 获取排序性能指标
     */
    getRankingMetrics(): RankingMetrics {
        let totalFeedback = 0;
        let averageSelectionRank = 0;
        let topThreeSelectionRate = 0;

        for (const history of this.userFeedbackHistory.values()) {
            totalFeedback += history.length;
            
            for (const record of history) {
                if (record.selectionRank >= 0) {
                    averageSelectionRank += record.selectionRank;
                    if (record.selectionRank < 3) {
                        topThreeSelectionRate++;
                    }
                }
            }
        }

        return {
            totalFeedbackCount: totalFeedback,
            averageSelectionRank: totalFeedback > 0 ? averageSelectionRank / totalFeedback : 0,
            topThreeSelectionRate: totalFeedback > 0 ? topThreeSelectionRate / totalFeedback : 0,
            rankingAccuracy: this.calculateRankingAccuracy()
        };
    }

    /**
     * 计算综合分数
     */
    private async calculateComprehensiveScore(
        suggestion: Suggestion, 
        query: string, 
        context: InputContext | null
    ): Promise<number> {
        let score = 0;

        // 1. 基础相关性分数 (权重: 30%)
        const relevanceScore = this.calculateRelevanceScore(suggestion, query);
        score += relevanceScore * this.rankingWeights.relevance;

        // 2. 上下文匹配分数 (权重: 25%)
        const contextScore = this.calculateContextScore(suggestion, context);
        score += contextScore * this.rankingWeights.context;

        // 3. 用户偏好分数 (权重: 20%)
        const preferenceScore = await this.calculatePreferenceScore(suggestion, context);
        score += preferenceScore * this.rankingWeights.preference;

        // 4. 质量分数 (权重: 15%)
        const qualityScore = this.calculateQualityScore(suggestion);
        score += qualityScore * this.rankingWeights.quality;

        // 5. 新颖性分数 (权重: 10%)
        const noveltyScore = this.calculateNoveltyScore(suggestion, query);
        score += noveltyScore * this.rankingWeights.novelty;

        return Math.max(0, Math.min(1, score)); // 确保分数在0-1范围内
    }

    /**
     * 计算相关性分数
     */
    private calculateRelevanceScore(suggestion: Suggestion, query: string): number {
        let score = 0;

        // 文本匹配度
        const textMatch = this.calculateTextSimilarity(suggestion.text, query);
        score += textMatch * 0.4;

        // LaTeX代码相关性
        const latexMatch = this.calculateLatexRelevance(suggestion.latexCode, query);
        score += latexMatch * 0.3;

        // 描述相关性
        const descriptionMatch = this.calculateTextSimilarity(suggestion.description, query);
        score += descriptionMatch * 0.2;

        // 原始置信度
        score += suggestion.score * 0.1;

        return score;
    }

    /**
     * 计算上下文分数
     */
    private calculateContextScore(suggestion: Suggestion, context: InputContext | null): number {
        if (!context) return 0.5; // 无上下文时给中等分数

        let score = 0;

        // 类别匹配
        if (suggestion.category === context.detectedCategory) {
            score += 0.4;
        }

        // 最近术语相关性
        const recentTermRelevance = this.calculateRecentTermRelevance(suggestion, context.recentTerms);
        score += recentTermRelevance * 0.3;

        // 周围文本相关性
        const surroundingTextRelevance = this.calculateSurroundingTextRelevance(
            suggestion, context.surroundingText
        );
        score += surroundingTextRelevance * 0.3;

        return score;
    }

    /**
     * 计算用户偏好分数
     */
    private async calculatePreferenceScore(suggestion: Suggestion, context: InputContext | null): Promise<number> {
        try {
            const preferences = await this.learningEngine.getUserPreferences();
            let score = 0;

            // 类别偏好
            if (preferences.preferredCategories.includes(suggestion.category)) {
                score += 0.4;
            }

            // 类型偏好
            if (preferences.preferredInputTypes.includes(suggestion.type)) {
                score += 0.3;
            }

            // 难度匹配
            const difficultyMatch = this.calculateDifficultyMatch(suggestion, preferences.difficultyLevel);
            score += difficultyMatch * 0.3;

            return score;
        } catch (error) {
            console.warn('SuggestionRanker: 计算用户偏好分数失败:', error);
            return 0.5;
        }
    }

    /**
     * 计算质量分数
     */
    private calculateQualityScore(suggestion: Suggestion): number {
        let score = 0;

        // LaTeX代码质量
        const latexQuality = this.assessLatexQuality(suggestion.latexCode);
        score += latexQuality * 0.4;

        // 描述质量
        const descriptionQuality = this.assessDescriptionQuality(suggestion.description);
        score += descriptionQuality * 0.3;

        // 类型适当性
        const typeAppropriatenesss = this.assessTypeAppropriateness(suggestion);
        score += typeAppropriatenesss * 0.3;

        return score;
    }

    /**
     * 计算新颖性分数
     */
    private calculateNoveltyScore(suggestion: Suggestion, query: string): number {
        const feedbackKey = this.generateFeedbackKey(query);
        const history = this.userFeedbackHistory.get(feedbackKey) || [];

        // 如果这个建议从未被选择过，给予新颖性奖励
        const hasBeenSelected = history.some(record => 
            record.selectedSuggestion === suggestion.text || 
            record.selectedSuggestion === suggestion.latexCode
        );

        if (!hasBeenSelected) {
            return 0.8; // 高新颖性分数
        }

        // 基于选择频率计算新颖性
        const selectionCount = history.filter(record => 
            record.selectedSuggestion === suggestion.text || 
            record.selectedSuggestion === suggestion.latexCode
        ).length;

        return Math.max(0.1, 1 - (selectionCount * 0.1)); // 选择越多，新颖性越低
    }

    /**
     * 应用多样性调整
     */
    private applyDiversityAdjustment(suggestions: Suggestion[]): Suggestion[] {
        if (suggestions.length <= 3) return suggestions;

        const diversifiedSuggestions: Suggestion[] = [];
        const usedCategories = new Set<MathCategory>();
        const usedTypes = new Set<string>();

        // 首先添加最高分的建议
        if (suggestions.length > 0) {
            diversifiedSuggestions.push(suggestions[0]);
            usedCategories.add(suggestions[0].category);
            usedTypes.add(suggestions[0].type);
        }

        // 然后按多样性和分数平衡添加其他建议
        for (let i = 1; i < suggestions.length; i++) {
            const suggestion = suggestions[i];
            
            // 计算多样性奖励
            let diversityBonus = 0;
            if (!usedCategories.has(suggestion.category)) {
                diversityBonus += 0.1;
            }
            if (!usedTypes.has(suggestion.type)) {
                diversityBonus += 0.05;
            }

            // 应用多样性奖励
            const adjustedSuggestion = {
                ...suggestion,
                score: Math.min(1, suggestion.score + diversityBonus)
            };

            diversifiedSuggestions.push(adjustedSuggestion);
            usedCategories.add(suggestion.category);
            usedTypes.add(suggestion.type);
        }

        // 重新排序
        return diversifiedSuggestions.sort((a, b) => b.score - a.score);
    }

    /**
     * 应用个性化调整
     */
    private async applyPersonalizationAdjustment(
        suggestions: Suggestion[], 
        query: string, 
        context: InputContext | null
    ): Promise<Suggestion[]> {
        try {
            const personalizationWeights = this.learningEngine.getPersonalizationWeights(context);
            
            return suggestions.map(suggestion => {
                let personalizedScore = suggestion.score;

                // 应用个性化权重
                if (context && suggestion.category === context.detectedCategory) {
                    personalizedScore += personalizationWeights.categoryPreference * 0.1;
                }

                personalizedScore += personalizationWeights.usageFrequency * 0.05;
                personalizedScore += personalizationWeights.recentActivity * 0.05;
                personalizedScore += personalizationWeights.learningProgress * 0.05;

                return {
                    ...suggestion,
                    score: Math.max(0, Math.min(1, personalizedScore))
                };
            }).sort((a, b) => b.score - a.score);

        } catch (error) {
            console.warn('SuggestionRanker: 个性化调整失败:', error);
            return suggestions;
        }
    }

    /**
     * 辅助计算方法
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        if (!text1 || !text2) return 0;
        
        const lowerText1 = text1.toLowerCase();
        const lowerText2 = text2.toLowerCase();

        // 完全匹配
        if (lowerText1 === lowerText2) return 1;

        // 包含关系
        if (lowerText1.includes(lowerText2) || lowerText2.includes(lowerText1)) {
            return 0.8;
        }

        // 字符重叠度
        const chars1 = new Set(lowerText1);
        const chars2 = new Set(lowerText2);
        const intersection = new Set([...chars1].filter(x => chars2.has(x)));
        const union = new Set([...chars1, ...chars2]);

        return intersection.size / union.size;
    }

    private calculateLatexRelevance(latexCode: string, query: string): number {
        if (!latexCode || !query) return 0;

        // 检查LaTeX命令相关性
        const latexCommands = latexCode.match(/\\[a-zA-Z]+/g) || [];
        const queryLower = query.toLowerCase();

        for (const command of latexCommands) {
            const commandName = command.substring(1); // 去掉反斜杠
            if (queryLower.includes(commandName) || commandName.includes(queryLower)) {
                return 0.8;
            }
        }

        // 检查数学符号相关性
        const mathSymbols = ['frac', 'sqrt', 'sum', 'int', 'lim', 'alpha', 'beta', 'gamma'];
        for (const symbol of mathSymbols) {
            if (latexCode.includes(symbol) && queryLower.includes(symbol)) {
                return 0.6;
            }
        }

        return 0.2;
    }

    private calculateRecentTermRelevance(suggestion: Suggestion, recentTerms: string[]): number {
        if (recentTerms.length === 0) return 0;

        for (const term of recentTerms) {
            if (suggestion.text.includes(term) || term.includes(suggestion.text)) {
                return 0.8;
            }
        }

        return 0.2;
    }

    private calculateSurroundingTextRelevance(suggestion: Suggestion, surroundingText: string): number {
        if (!surroundingText) return 0;

        const relevanceScore = this.calculateTextSimilarity(suggestion.text, surroundingText);
        return relevanceScore * 0.5; // 降低权重，因为周围文本可能包含很多无关内容
    }

    private calculateDifficultyMatch(suggestion: Suggestion, userDifficultyLevel: number): number {
        // 简化的难度评估
        let suggestionDifficulty = 0.5; // 默认中等难度

        // 基于LaTeX复杂度评估难度
        const latexComplexity = this.assessLatexComplexity(suggestion.latexCode);
        suggestionDifficulty = latexComplexity;

        // 计算难度匹配度
        const difficultyDifference = Math.abs(suggestionDifficulty - userDifficultyLevel);
        return 1 - difficultyDifference; // 差异越小，匹配度越高
    }

    private assessLatexQuality(latexCode: string): number {
        if (!latexCode) return 0;

        let quality = 0.5; // 基础分数

        // 检查语法正确性（简化版）
        const openBraces = (latexCode.match(/\{/g) || []).length;
        const closeBraces = (latexCode.match(/\}/g) || []).length;
        if (openBraces === closeBraces) {
            quality += 0.2;
        }

        // 检查是否使用了适当的LaTeX命令
        if (latexCode.includes('\\')) {
            quality += 0.2;
        }

        // 检查是否过于复杂
        if (latexCode.length > 100) {
            quality -= 0.1; // 过长的代码可能不够简洁
        }

        return Math.max(0, Math.min(1, quality));
    }

    private assessDescriptionQuality(description: string): number {
        if (!description) return 0.3;

        let quality = 0.5;

        // 长度适中
        if (description.length >= 10 && description.length <= 100) {
            quality += 0.2;
        }

        // 包含有用信息
        if (description.includes('术语') || description.includes('公式') || description.includes('模板')) {
            quality += 0.2;
        }

        // 语言清晰
        if (!description.includes('undefined') && !description.includes('null')) {
            quality += 0.1;
        }

        return Math.max(0, Math.min(1, quality));
    }

    private assessTypeAppropriateness(suggestion: Suggestion): number {
        // 检查类型和内容的一致性
        if (suggestion.type === 'term' && suggestion.latexCode.includes('\\text')) {
            return 0.8;
        }
        if (suggestion.type === 'formula' && suggestion.latexCode.includes('=')) {
            return 0.8;
        }
        if (suggestion.type === 'template' && suggestion.latexCode.includes('${')) {
            return 0.8;
        }

        return 0.6; // 默认适当性
    }

    private assessLatexComplexity(latexCode: string): number {
        if (!latexCode) return 0;

        let complexity = 0;

        // 基于命令数量
        const commands = (latexCode.match(/\\[a-zA-Z]+/g) || []).length;
        complexity += Math.min(0.5, commands * 0.1);

        // 基于嵌套层次
        const braceDepth = this.calculateMaxBraceDepth(latexCode);
        complexity += Math.min(0.3, braceDepth * 0.1);

        // 基于长度
        complexity += Math.min(0.2, latexCode.length * 0.01);

        return Math.max(0, Math.min(1, complexity));
    }

    private calculateMaxBraceDepth(text: string): number {
        let maxDepth = 0;
        let currentDepth = 0;

        for (const char of text) {
            if (char === '{') {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            } else if (char === '}') {
                currentDepth--;
            }
        }

        return maxDepth;
    }

    private generateFeedbackKey(query: string): string {
        // 生成反馈键，用于分组相似的查询
        return query.toLowerCase().substring(0, 3); // 简化版：使用前3个字符
    }

    private adjustWeightsFromFeedback(feedback: FeedbackRecord): void {
        // 基于用户反馈动态调整权重（简化版）
        const adjustmentFactor = 0.01; // 小幅调整

        // 如果用户经常选择某种类型的建议，增加相应权重
        if (feedback.selectedSuggestion.includes('\\')) {
            this.rankingWeights.quality += adjustmentFactor;
        }

        // 确保权重总和为1
        this.normalizeWeights();
    }

    private normalizeWeights(): void {
        const total = Object.values(this.rankingWeights).reduce((sum, weight) => sum + weight, 0);
        
        if (total > 0) {
            for (const key in this.rankingWeights) {
                (this.rankingWeights as any)[key] /= total;
            }
        }
    }

    private calculateRankingAccuracy(): number {
        let totalAccuracy = 0;
        let totalRecords = 0;

        for (const history of this.userFeedbackHistory.values()) {
            for (const record of history) {
                if (record.selectionRank >= 0) {
                    // 排名越靠前，准确性越高
                    const accuracy = Math.max(0, 1 - (record.selectionRank * 0.2));
                    totalAccuracy += accuracy;
                    totalRecords++;
                }
            }
        }

        return totalRecords > 0 ? totalAccuracy / totalRecords : 0;
    }

    private getDefaultWeights(): RankingWeights {
        return {
            relevance: 0.30,
            context: 0.25,
            preference: 0.20,
            quality: 0.15,
            novelty: 0.10
        };
    }
}

/**
 * 类型定义
 */
interface RankingWeights {
    relevance: number;    // 相关性权重
    context: number;      // 上下文权重
    preference: number;   // 用户偏好权重
    quality: number;      // 质量权重
    novelty: number;      // 新颖性权重
}

interface FeedbackRecord {
    timestamp: number;
    query: string;
    selectedSuggestion: string;
    queryLength: number;
    selectionRank: number;
}

interface RankingMetrics {
    totalFeedbackCount: number;
    averageSelectionRank: number;
    topThreeSelectionRate: number;
    rankingAccuracy: number;
}