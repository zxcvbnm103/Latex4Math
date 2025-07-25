// Re-export settings types
export * from './settings';

// 数学术语类别枚举
export enum MathCategory {
    ALGEBRA = "代数",
    CALCULUS = "微积分", 
    GEOMETRY = "几何",
    STATISTICS = "统计",
    LINEAR_ALGEBRA = "线性代数",
    DISCRETE_MATH = "离散数学",
    NUMBER_THEORY = "数论",
    TOPOLOGY = "拓扑学",
    ANALYSIS = "数学分析",
    PROBABILITY = "概率论",
    SET_THEORY = "集合论",
    LOGIC = "逻辑"
}

// 数学术语接口
export interface MathTerm {
    id: string;
    chineseName: string;
    englishName?: string;
    category: MathCategory;
    latexCode: string;
    definition?: string;
    aliases: string[];
    createdAt: Date;
    updatedAt: Date;
}

// 术语识别结果
export interface RecognizedTerm {
    text: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
    category: MathCategory;
    suggestedLatex: string;
}

// 术语关系类型
export enum RelationType {
    APPEARS_WITH = "共现",
    DEPENDS_ON = "依赖", 
    GENERALIZES = "泛化",
    SPECIALIZES = "特化",
    SIMILAR_TO = "相似"
}

// 术语关系
export interface TermRelation {
    id: string;
    sourceTermId: string;
    targetTermId: string;
    relationType: RelationType;
    strength: number;
    noteIds: string[];
    createdAt: Date;
    lastUpdated: Date;
}

// LaTeX转换结果
export interface LaTeXResult {
    originalTerm: string;
    latexCode: string;
    renderedHtml: string;
    confidence: number;
    alternatives: string[];
    source?: string; // 转换来源：'custom-mapping' | 'neural-model' | 'rule-mapping' | 'inference'
}

// 输入上下文
export interface InputContext {
    currentNote: string;
    surroundingText: string;
    detectedCategory: MathCategory;
    recentTerms: string[];
    cursorPosition: number;
}

// 自动补全建议
export interface Suggestion {
    text: string;
    latexCode: string;
    description: string;
    score: number;
    type: 'term' | 'formula' | 'template';
    category: MathCategory;
}

// 验证结果
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}

// 术语统计
export interface TermStatistics {
    totalTerms: number;
    categoryCounts: Map<MathCategory, number>;
    mostUsedTerms: Array<{term: MathTerm, count: number}>;
    recentlyAdded: MathTerm[];
}

// 图谱节点
export interface GraphNode {
    id: string;
    label: string;
    category: MathCategory;
    size: number;
    color: string;
    x?: number;
    y?: number;
}

// 图谱边
export interface GraphEdge {
    source: string;
    target: string;
    weight: number;
    type: RelationType;
    color: string;
}

// 插件事件类型
export interface PluginEvents {
    'term-recognized': (term: RecognizedTerm) => void;
    'term-added': (term: MathTerm) => void;
    'term-updated': (term: MathTerm) => void;
    'relation-created': (relation: TermRelation) => void;
    'graph-updated': () => void;
}