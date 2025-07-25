// AI驱动智能输入系统模块导出

export { SmartMathInput } from './SmartMathInput';
export { ContextAnalyzer } from './ContextAnalyzer';
export { PersonalizedLearningEngine } from './PersonalizedLearningEngine';
export { SuggestionRanker } from './SuggestionRanker';

// 类型定义
export interface AIInputConfig {
    enableNeuralSuggestions: boolean;
    enableContextAnalysis: boolean;
    enablePersonalization: boolean;
    maxSuggestions: number;
    responseTimeThreshold: number;
    confidenceThreshold: number;
}

export interface InputPerformanceMetrics {
    totalSuggestions: number;
    averageResponseTime: number;
    cacheHitRate: number;
    userAcceptanceRate: number;
    neuralModelAccuracy: number;
    contextRelevanceScore: number;
}

export interface SmartInputFeatures {
    neuralLatexConversion: boolean;
    contextAwareSuggestions: boolean;
    personalizedLearning: boolean;
    intelligentRanking: boolean;
    templateGeneration: boolean;
    multiLanguageSupport: boolean;
}