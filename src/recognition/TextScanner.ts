import { RecognizedTerm, MathCategory } from '../types';
import { ChineseMathDictionary } from './ChineseMathDictionary';

/**
 * 文本扫描器
 * 负责在文本中智能识别数学术语
 */
export class TextScanner {
    private dictionary: ChineseMathDictionary;
    private chineseCharRegex = /[\u4e00-\u9fff]/;
    private mathContextRegex = /[=+\-*/^()[\]{}\\∫∑∏∆∇∂∞±≤≥≠≈∈∉⊂⊃∪∩]/;

    constructor(dictionary: ChineseMathDictionary) {
        this.dictionary = dictionary;
    }

    /**
     * 扫描文本识别数学术语
     */
    async scanText(text: string): Promise<RecognizedTerm[]> {
        const recognizedTerms: RecognizedTerm[] = [];
        
        try {
            // 获取所有术语进行匹配
            const allTerms = await this.dictionary.getAllTerms();
            
            // 按长度降序排列，优先匹配长术语
            const sortedTerms = allTerms.sort((a, b) => b.chineseName.length - a.chineseName.length);
            
            // 记录已匹配的位置，避免重复匹配
            const matchedPositions = new Set<number>();
            
            for (const term of sortedTerms) {
                const matches = this.findTermMatches(text, term.chineseName, matchedPositions);
                
                for (const match of matches) {
                    // 计算置信度
                    const confidence = this.calculateConfidence(text, match, term.chineseName);
                    
                    const recognizedTerm: RecognizedTerm = {
                        text: term.chineseName,
                        startIndex: match.start,
                        endIndex: match.end,
                        confidence,
                        category: term.category,
                        suggestedLatex: term.latexCode
                    };
                    
                    recognizedTerms.push(recognizedTerm);
                    
                    // 标记已匹配的位置
                    for (let i = match.start; i < match.end; i++) {
                        matchedPositions.add(i);
                    }
                }
                
                // 检查别名
                for (const alias of term.aliases) {
                    const aliasMatches = this.findTermMatches(text, alias, matchedPositions);
                    
                    for (const match of aliasMatches) {
                        const confidence = this.calculateConfidence(text, match, alias);
                        
                        const recognizedTerm: RecognizedTerm = {
                            text: alias,
                            startIndex: match.start,
                            endIndex: match.end,
                            confidence: confidence * 0.9, // 别名置信度稍低
                            category: term.category,
                            suggestedLatex: term.latexCode
                        };
                        
                        recognizedTerms.push(recognizedTerm);
                        
                        // 标记已匹配的位置
                        for (let i = match.start; i < match.end; i++) {
                            matchedPositions.add(i);
                        }
                    }
                }
            }
            
            // 按位置排序
            recognizedTerms.sort((a, b) => a.startIndex - b.startIndex);
            
            console.log(`TextScanner: 扫描完成，识别到 ${recognizedTerms.length} 个术语`);
            return recognizedTerms;
            
        } catch (error) {
            console.error('TextScanner: 文本扫描失败:', error);
            return [];
        }
    }

    /**
     * 查找术语匹配
     */
    private findTermMatches(text: string, termName: string, excludePositions: Set<number>): Array<{start: number, end: number}> {
        const matches: Array<{start: number, end: number}> = [];
        let searchIndex = 0;
        
        while (searchIndex < text.length) {
            const index = text.indexOf(termName, searchIndex);
            if (index === -1) break;
            
            const endIndex = index + termName.length;
            
            // 检查是否与已匹配位置重叠
            let hasOverlap = false;
            for (let i = index; i < endIndex; i++) {
                if (excludePositions.has(i)) {
                    hasOverlap = true;
                    break;
                }
            }
            
            if (!hasOverlap && this.isValidMatch(text, index, endIndex, termName)) {
                matches.push({ start: index, end: endIndex });
            }
            
            searchIndex = index + 1;
        }
        
        return matches;
    }

    /**
     * 验证匹配是否有效
     */
    private isValidMatch(text: string, startIndex: number, endIndex: number, termName: string): boolean {
        // 检查边界字符，确保是完整的词
        const beforeChar = startIndex > 0 ? text[startIndex - 1] : '';
        const afterChar = endIndex < text.length ? text[endIndex] : '';
        
        // 如果前后都是中文字符，可能不是独立的术语
        if (this.chineseCharRegex.test(beforeChar) && this.chineseCharRegex.test(afterChar)) {
            // 检查是否是更长术语的一部分
            const extendedBefore = startIndex > 1 ? text.substring(startIndex - 2, startIndex) : '';
            const extendedAfter = endIndex < text.length - 1 ? text.substring(endIndex, endIndex + 2) : '';
            
            // 如果扩展后的文本看起来像一个更长的术语，则跳过
            if (this.looksLikeLongerTerm(extendedBefore + termName + extendedAfter)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 检查是否看起来像更长的术语
     */
    private looksLikeLongerTerm(text: string): boolean {
        // 简单的启发式规则
        const mathKeywords = ['定理', '公式', '方法', '算法', '性质', '法则', '原理'];
        
        for (const keyword of mathKeywords) {
            if (text.includes(keyword)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 计算识别置信度
     */
    private calculateConfidence(text: string, match: {start: number, end: number}, termName: string): number {
        let confidence = 0.6; // 基础置信度
        
        // 上下文分析
        const contextBefore = text.substring(Math.max(0, match.start - 20), match.start);
        const contextAfter = text.substring(match.end, Math.min(text.length, match.end + 20));
        const fullContext = contextBefore + contextAfter;
        
        // 数学上下文加分
        if (this.hasMathContext(fullContext)) {
            confidence += 0.2;
        }
        
        // LaTeX环境加分
        if (this.isInLatexEnvironment(text, match.start, match.end)) {
            confidence += 0.15;
        }
        
        // 标题或强调文本加分
        if (this.isInEmphasisContext(text, match.start, match.end)) {
            confidence += 0.1;
        }
        
        // 列表项加分
        if (this.isInListContext(contextBefore)) {
            confidence += 0.05;
        }
        
        // 术语长度加分（长术语通常更准确）
        if (termName.length >= 3) {
            confidence += 0.05;
        }
        
        // 确保置信度在合理范围内
        return Math.min(1.0, Math.max(0.1, confidence));
    }

    /**
     * 检查是否有数学上下文
     */
    private hasMathContext(context: string): boolean {
        // 检查数学符号
        if (this.mathContextRegex.test(context)) {
            return true;
        }
        
        // 检查数学关键词
        const mathKeywords = [
            '公式', '定理', '证明', '计算', '求解', '推导', '定义',
            '性质', '法则', '原理', '方法', '算法', '解法'
        ];
        
        for (const keyword of mathKeywords) {
            if (context.includes(keyword)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 检查是否在LaTeX环境中
     */
    private isInLatexEnvironment(text: string, start: number, end: number): boolean {
        // 检查是否在$...$或$$...$$中
        const beforeText = text.substring(0, start);
        const afterText = text.substring(end);
        
        // 计算前面的$符号数量
        const dollarsBefore = (beforeText.match(/\$/g) || []).length;
        const dollarsAfter = (afterText.match(/\$/g) || []).length;
        
        // 简单检查是否可能在数学环境中
        return (dollarsBefore % 2 === 1) || text.substring(start - 10, start).includes('\\begin{');
    }

    /**
     * 检查是否在强调上下文中
     */
    private isInEmphasisContext(text: string, start: number, end: number): boolean {
        const beforeText = text.substring(Math.max(0, start - 5), start);
        const afterText = text.substring(end, Math.min(text.length, end + 5));
        
        // 检查Markdown强调语法
        const emphasisPatterns = ['**', '*', '__', '_', '==', '~~'];
        
        for (const pattern of emphasisPatterns) {
            if (beforeText.includes(pattern) || afterText.includes(pattern)) {
                return true;
            }
        }
        
        // 检查标题
        if (beforeText.includes('#') || beforeText.includes('\n#')) {
            return true;
        }
        
        return false;
    }

    /**
     * 检查是否在列表上下文中
     */
    private isInListContext(contextBefore: string): boolean {
        const lines = contextBefore.split('\n');
        const lastLine = lines[lines.length - 1] || '';
        
        // 检查列表标记
        return /^\s*[-*+]\s/.test(lastLine) || /^\s*\d+\.\s/.test(lastLine);
    }

    /**
     * 预测术语类别
     */
    private predictCategory(context: string): MathCategory {
        const categoryKeywords = new Map<MathCategory, string[]>([
            [MathCategory.CALCULUS, ['导数', '积分', '极限', '微分', '连续']],
            [MathCategory.ALGEBRA, ['方程', '函数', '多项式', '因式', '不等式']],
            [MathCategory.GEOMETRY, ['三角', '圆', '直线', '角度', '面积', '体积']],
            [MathCategory.LINEAR_ALGEBRA, ['矩阵', '向量', '行列式', '特征']],
            [MathCategory.STATISTICS, ['平均', '方差', '标准差', '概率', '统计']],
            [MathCategory.NUMBER_THEORY, ['质数', '素数', '公约数', '公倍数']],
            [MathCategory.ANALYSIS, ['实数', '复数', '序列', '级数', '收敛']]
        ]);
        
        Array.from(categoryKeywords.entries()).forEach(([category, keywords]) => {
            for (const keyword of keywords) {
                if (context.includes(keyword)) {
                    return category;
                }
            }
        });
        
        return MathCategory.ALGEBRA; // 默认分类
    }
}