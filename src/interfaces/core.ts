import { MathTerm, RecognizedTerm, TermRelation, LaTeXResult, InputContext, Suggestion, ValidationResult, TermStatistics, MathCategory } from '../types';

// 主控制器接口
export interface IMainController {
    onload(): Promise<void>;
    onunload(): void;
    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;
    registerEventHandlers(): void;
}

// 术语识别引擎接口
export interface ITermRecognitionEngine {
    recognizeTerms(text: string): Promise<RecognizedTerm[]>;
    addCustomTerm(term: MathTerm): Promise<void>;
    updateTermDictionary(): Promise<void>;
    validateTerm(term: string): Promise<ValidationResult>;
}

// 数据库管理器接口
export interface IDatabaseManager {
    initialize(): Promise<void>;
    
    // 术语管理
    saveTerm(term: MathTerm): Promise<void>;
    getTerm(id: string): Promise<MathTerm | null>;
    getAllTerms(): Promise<MathTerm[]>;
    getTermsByCategory(category: MathCategory): Promise<MathTerm[]>;
    updateTerm(term: MathTerm): Promise<void>;
    deleteTerm(id: string): Promise<void>;
    
    // 关系管理
    saveRelation(relation: TermRelation): Promise<void>;
    getRelation(id: string): Promise<TermRelation | null>;
    getRelationsForTerm(termId: string): Promise<TermRelation[]>;
    updateRelation(relation: TermRelation): Promise<void>;
    deleteRelation(id: string): Promise<void>;
    
    // 统计查询
    getTermStatistics(): Promise<TermStatistics>;
    searchTerms(query: string): Promise<MathTerm[]>;
    
    // 数据库维护
    backup(): Promise<void>;
    restore(backupData: string): Promise<void>;
    cleanup(): Promise<void>;
}

// 图谱可视化器接口
export interface IGraphVisualizer {
    renderGraph(container: HTMLElement): Promise<void>;
    updateGraph(terms: MathTerm[], relations: TermRelation[]): Promise<void>;
    highlightNode(termId: string): void;
    filterByCategory(categories: MathCategory[]): void;
    searchAndHighlight(query: string): void;
    exportGraph(format: 'svg' | 'png'): Promise<Blob>;
}

// LaTeX转换器接口
export interface ILaTeXConverter {
    convertTerm(term: string): Promise<LaTeXResult>;
    renderLatex(latexCode: string): Promise<HTMLElement>;
    validateLatex(latexCode: string): Promise<ValidationResult>;
    customizeLatex(termId: string, latexCode: string): Promise<void>;
}

// 智能输入法接口
export interface ISmartMathInput {
    activate(editor: any): void;
    deactivate(): void;
    getSuggestions(input: string, context: InputContext): Promise<Suggestion[]>;
    insertSuggestion(suggestion: Suggestion, editor: any): void;
    learnFromUsage(input: string, selected: string): Promise<void>;
}