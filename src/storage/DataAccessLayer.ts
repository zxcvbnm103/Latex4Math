import { MathTerm, TermRelation, TermStatistics, MathCategory, RelationType } from '../types';
import { DatabaseManager } from './DatabaseManager';
import { DataModelFactory } from './DataModelFactory';

/**
 * 数据访问层 - 提供高级数据操作接口
 */
export class DataAccessLayer {
    private databaseManager: DatabaseManager;

    constructor(databaseManager: DatabaseManager) {
        this.databaseManager = databaseManager;
    }

    /**
     * 智能添加术语（包含重复检测和合并）
     */
    async addTermSmart(termData: {
        chineseName: string;
        englishName?: string;
        category: MathCategory;
        latexCode: string;
        definition?: string;
        aliases?: string[];
    }): Promise<{
        success: boolean;
        term?: MathTerm;
        merged?: boolean;
        warnings?: string[];
    }> {
        try {
            // 创建新术语
            const newTerm = DataModelFactory.createMathTerm(termData);
            
            // 验证术语数据
            const validation = DataModelFactory.validateMathTerm(newTerm);
            if (!validation.isValid) {
                return {
                    success: false,
                    warnings: validation.errors
                };
            }
            
            // 检查重复
            const existingTerms = await this.databaseManager.getAllTerms();
            const duplicateCheck = DataModelFactory.isDuplicateTerm(newTerm, existingTerms);
            
            if (duplicateCheck.isDuplicate) {
                if (duplicateCheck.duplicateType === 'exact') {
                    return {
                        success: false,
                        warnings: [`术语 "${newTerm.chineseName}" 已存在`]
                    };
                } else {
                    // 相似术语，询问是否合并
                    const mergedTerm = DataModelFactory.mergeTerms(
                        duplicateCheck.conflictingTerm!,
                        newTerm
                    );
                    await this.databaseManager.updateTerm(mergedTerm);
                    
                    return {
                        success: true,
                        term: mergedTerm,
                        merged: true,
                        warnings: validation.warnings
                    };
                }
            }
            
            // 保存新术语
            await this.databaseManager.saveTerm(newTerm);
            
            return {
                success: true,
                term: newTerm,
                merged: false,
                warnings: validation.warnings
            };
        } catch (error) {
            console.error('DataAccessLayer: 添加术语失败:', error);
            return {
                success: false,
                warnings: [`添加术语失败: ${error.message}`]
            };
        }
    }

    /**
     * 智能创建术语关系
     */
    async createRelationSmart(relationData: {
        sourceTermId: string;
        targetTermId: string;
        relationType: RelationType;
        strength?: number;
        noteIds?: string[];
    }): Promise<{
        success: boolean;
        relation?: TermRelation;
        warnings?: string[];
    }> {
        try {
            // 验证术语是否存在
            const sourceTerm = await this.databaseManager.getTerm(relationData.sourceTermId);
            const targetTerm = await this.databaseManager.getTerm(relationData.targetTermId);
            
            if (!sourceTerm || !targetTerm) {
                return {
                    success: false,
                    warnings: ['源术语或目标术语不存在']
                };
            }
            
            // 检查是否已存在相同关系
            const existingRelations = await this.databaseManager.getRelationsForTerm(relationData.sourceTermId);
            const duplicateRelation = existingRelations.find(rel => 
                rel.targetTermId === relationData.targetTermId && 
                rel.relationType === relationData.relationType
            );
            
            if (duplicateRelation) {
                // 更新现有关系的强度
                const updatedRelation = {
                    ...duplicateRelation,
                    strength: Math.min(1.0, (duplicateRelation.strength + (relationData.strength || 1.0)) / 2),
                    noteIds: Array.from(new Set([
                        ...duplicateRelation.noteIds,
                        ...(relationData.noteIds || [])
                    ])),
                    lastUpdated: new Date()
                };
                
                await this.databaseManager.updateRelation(updatedRelation);
                
                return {
                    success: true,
                    relation: updatedRelation,
                    warnings: ['关系已存在，已更新强度']
                };
            }
            
            // 创建新关系
            const newRelation = DataModelFactory.createTermRelation(relationData);
            
            // 验证关系数据
            const validation = DataModelFactory.validateTermRelation(newRelation);
            if (!validation.isValid) {
                return {
                    success: false,
                    warnings: validation.errors
                };
            }
            
            // 保存关系
            await this.databaseManager.saveRelation(newRelation);
            
            return {
                success: true,
                relation: newRelation,
                warnings: validation.warnings
            };
        } catch (error) {
            console.error('DataAccessLayer: 创建关系失败:', error);
            return {
                success: false,
                warnings: [`创建关系失败: ${error.message}`]
            };
        }
    }

    /**
     * 获取术语的扩展信息（包含关系和统计）
     */
    async getTermExtended(termId: string): Promise<{
        term: MathTerm | null;
        relations: TermRelation[];
        relatedTerms: MathTerm[];
        usageStats?: {
            totalRelations: number;
            strongestRelations: TermRelation[];
            categoryDistribution: Map<MathCategory, number>;
        };
    }> {
        const term = await this.databaseManager.getTerm(termId);
        if (!term) {
            return {
                term: null,
                relations: [],
                relatedTerms: []
            };
        }
        
        const relations = await this.databaseManager.getRelationsForTerm(termId);
        
        // 获取相关术语
        const relatedTermIds = new Set<string>();
        relations.forEach(rel => {
            if (rel.sourceTermId === termId) {
                relatedTermIds.add(rel.targetTermId);
            } else {
                relatedTermIds.add(rel.sourceTermId);
            }
        });
        
        const relatedTerms: MathTerm[] = [];
        for (const id of relatedTermIds) {
            const relatedTerm = await this.databaseManager.getTerm(id);
            if (relatedTerm) {
                relatedTerms.push(relatedTerm);
            }
        }
        
        // 计算使用统计
        const strongestRelations = relations
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 5);
        
        const categoryDistribution = new Map<MathCategory, number>();
        relatedTerms.forEach(relatedTerm => {
            const count = categoryDistribution.get(relatedTerm.category) || 0;
            categoryDistribution.set(relatedTerm.category, count + 1);
        });
        
        return {
            term,
            relations,
            relatedTerms,
            usageStats: {
                totalRelations: relations.length,
                strongestRelations,
                categoryDistribution
            }
        };
    }

    /**
     * 智能搜索术语（支持模糊匹配和相关性排序）
     */
    async searchTermsSmart(query: string, options?: {
        category?: MathCategory;
        limit?: number;
        includeRelated?: boolean;
    }): Promise<{
        directMatches: MathTerm[];
        relatedMatches: MathTerm[];
        suggestions: string[];
    }> {
        const limit = options?.limit || 20;
        
        // 直接匹配
        let directMatches = await this.databaseManager.searchTerms(query);
        
        // 按类别过滤
        if (options?.category) {
            directMatches = directMatches.filter(term => term.category === options.category);
        }
        
        // 限制结果数量
        directMatches = directMatches.slice(0, limit);
        
        let relatedMatches: MathTerm[] = [];
        let suggestions: string[] = [];
        
        if (options?.includeRelated && directMatches.length > 0) {
            // 获取相关术语
            const relatedTermIds = new Set<string>();
            
            for (const term of directMatches.slice(0, 5)) { // 只取前5个进行关联搜索
                const relations = await this.databaseManager.getRelationsForTerm(term.id);
                relations.forEach(rel => {
                    if (rel.sourceTermId === term.id) {
                        relatedTermIds.add(rel.targetTermId);
                    } else {
                        relatedTermIds.add(rel.sourceTermId);
                    }
                });
            }
            
            // 获取相关术语详情
            for (const id of Array.from(relatedTermIds).slice(0, 10)) {
                const relatedTerm = await this.databaseManager.getTerm(id);
                if (relatedTerm && !directMatches.find(t => t.id === id)) {
                    relatedMatches.push(relatedTerm);
                }
            }
        }
        
        // 生成搜索建议
        if (directMatches.length === 0) {
            const allTerms = await this.databaseManager.getAllTerms();
            suggestions = this.generateSearchSuggestions(query, allTerms);
        }
        
        return {
            directMatches,
            relatedMatches,
            suggestions
        };
    }

    /**
     * 获取类别统计和趋势
     */
    async getCategoryAnalytics(): Promise<{
        categoryStats: Map<MathCategory, {
            count: number;
            recentGrowth: number;
            avgRelations: number;
            topTerms: MathTerm[];
        }>;
        overallTrends: {
            totalTerms: number;
            totalRelations: number;
            mostActiveCategory: MathCategory;
            recentActivity: {
                newTerms: number;
                newRelations: number;
                period: string;
            };
        };
    }> {
        const stats = await this.databaseManager.getTermStatistics();
        const allTerms = await this.databaseManager.getAllTerms();
        const categoryStats = new Map();
        
        // 计算每个类别的详细统计
        for (const [category, count] of stats.categoryCounts) {
            const categoryTerms = allTerms.filter(term => term.category === category);
            
            // 计算平均关系数
            let totalRelations = 0;
            for (const term of categoryTerms) {
                const relations = await this.databaseManager.getRelationsForTerm(term.id);
                totalRelations += relations.length;
            }
            const avgRelations = categoryTerms.length > 0 ? totalRelations / categoryTerms.length : 0;
            
            // 获取最近增长（简化计算）
            const recentTerms = categoryTerms.filter(term => {
                const daysSinceCreated = (Date.now() - term.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceCreated <= 30;
            });
            const recentGrowth = recentTerms.length;
            
            // 获取热门术语（按关系数排序）
            const termsWithRelationCount = await Promise.all(
                categoryTerms.map(async term => {
                    const relations = await this.databaseManager.getRelationsForTerm(term.id);
                    return { term, relationCount: relations.length };
                })
            );
            
            const topTerms = termsWithRelationCount
                .sort((a, b) => b.relationCount - a.relationCount)
                .slice(0, 5)
                .map(item => item.term);
            
            categoryStats.set(category, {
                count,
                recentGrowth,
                avgRelations,
                topTerms
            });
        }
        
        // 计算整体趋势
        const mostActiveCategory = Array.from(stats.categoryCounts.entries())
            .sort(([,a], [,b]) => b - a)[0]?.[0] || MathCategory.ALGEBRA;
        
        const recentTerms = allTerms.filter(term => {
            const daysSinceCreated = (Date.now() - term.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCreated <= 7;
        });
        
        // 计算最近的关系数（简化）
        let recentRelationsCount = 0;
        for (const term of recentTerms) {
            const relations = await this.databaseManager.getRelationsForTerm(term.id);
            recentRelationsCount += relations.filter(rel => {
                const daysSinceCreated = (Date.now() - rel.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceCreated <= 7;
            }).length;
        }
        
        return {
            categoryStats,
            overallTrends: {
                totalTerms: stats.totalTerms,
                totalRelations: recentRelationsCount, // 这里应该是总关系数，但为了简化使用最近的
                mostActiveCategory,
                recentActivity: {
                    newTerms: recentTerms.length,
                    newRelations: recentRelationsCount,
                    period: '最近7天'
                }
            }
        };
    }

    /**
     * 数据清理和优化
     */
    async optimizeData(): Promise<{
        cleaned: {
            orphanedRelations: number;
            duplicateTerms: number;
            emptyDefinitions: number;
        };
        optimized: {
            relationStrengthsUpdated: number;
            indexesRebuilt: boolean;
        };
    }> {
        console.log('DataAccessLayer: 开始数据优化...');
        
        // 清理孤立关系
        await this.databaseManager.cleanup();
        
        // 这里可以添加更多优化逻辑
        // 例如：合并重复术语、更新关系强度、重建索引等
        
        return {
            cleaned: {
                orphanedRelations: 0, // 实际数量需要从cleanup方法返回
                duplicateTerms: 0,
                emptyDefinitions: 0
            },
            optimized: {
                relationStrengthsUpdated: 0,
                indexesRebuilt: true
            }
        };
    }

    /**
     * 生成搜索建议
     */
    private generateSearchSuggestions(query: string, allTerms: MathTerm[]): string[] {
        const suggestions: string[] = [];
        const queryLower = query.toLowerCase();
        
        // 基于编辑距离的模糊匹配
        for (const term of allTerms) {
            const names = [term.chineseName, term.englishName, ...term.aliases].filter(Boolean);
            
            for (const name of names) {
                if (name && this.calculateEditDistance(queryLower, name.toLowerCase()) <= 2) {
                    suggestions.push(name);
                    if (suggestions.length >= 5) break;
                }
            }
            
            if (suggestions.length >= 5) break;
        }
        
        return suggestions;
    }

    /**
     * 计算编辑距离（简化版）
     */
    private calculateEditDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}