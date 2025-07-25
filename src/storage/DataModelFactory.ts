import { MathTerm, TermRelation, MathCategory, RelationType } from '../types';

/**
 * 数据模型工厂 - 负责创建和验证数据模型
 */
export class DataModelFactory {
    
    /**
     * 创建新的数学术语
     */
    static createMathTerm(data: {
        chineseName: string;
        englishName?: string;
        category: MathCategory;
        latexCode: string;
        definition?: string;
        aliases?: string[];
    }): MathTerm {
        const now = new Date();
        
        return {
            id: this.generateId('term'),
            chineseName: data.chineseName.trim(),
            englishName: data.englishName?.trim(),
            category: data.category,
            latexCode: data.latexCode.trim(),
            definition: data.definition?.trim(),
            aliases: data.aliases?.map(alias => alias.trim()) || [],
            createdAt: now,
            updatedAt: now
        };
    }

    /**
     * 创建术语关系
     */
    static createTermRelation(data: {
        sourceTermId: string;
        targetTermId: string;
        relationType: RelationType;
        strength?: number;
        noteIds?: string[];
    }): TermRelation {
        const now = new Date();
        
        return {
            id: this.generateId('relation'),
            sourceTermId: data.sourceTermId,
            targetTermId: data.targetTermId,
            relationType: data.relationType,
            strength: data.strength || 1.0,
            noteIds: data.noteIds || [],
            createdAt: now,
            lastUpdated: now
        };
    }

    /**
     * 验证数学术语数据
     */
    static validateMathTerm(term: Partial<MathTerm>): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 必需字段验证
        if (!term.chineseName || term.chineseName.trim().length === 0) {
            errors.push('中文名称不能为空');
        }

        if (!term.category) {
            errors.push('术语类别不能为空');
        }

        if (!term.latexCode || term.latexCode.trim().length === 0) {
            errors.push('LaTeX代码不能为空');
        }

        // 格式验证
        if (term.chineseName && term.chineseName.length > 100) {
            warnings.push('中文名称过长，建议控制在100字符以内');
        }

        if (term.englishName && term.englishName.length > 200) {
            warnings.push('英文名称过长，建议控制在200字符以内');
        }

        if (term.definition && term.definition.length > 1000) {
            warnings.push('定义过长，建议控制在1000字符以内');
        }

        if (term.aliases && term.aliases.length > 20) {
            warnings.push('别名过多，建议控制在20个以内');
        }

        // LaTeX代码基本验证
        if (term.latexCode) {
            const latexCode = term.latexCode.trim();
            if (!latexCode.startsWith('$') && !latexCode.startsWith('\\')) {
                warnings.push('LaTeX代码格式可能不正确');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证术语关系数据
     */
    static validateTermRelation(relation: Partial<TermRelation>): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 必需字段验证
        if (!relation.sourceTermId || relation.sourceTermId.trim().length === 0) {
            errors.push('源术语ID不能为空');
        }

        if (!relation.targetTermId || relation.targetTermId.trim().length === 0) {
            errors.push('目标术语ID不能为空');
        }

        if (!relation.relationType) {
            errors.push('关系类型不能为空');
        }

        // 逻辑验证
        if (relation.sourceTermId === relation.targetTermId) {
            errors.push('源术语和目标术语不能相同');
        }

        if (relation.strength !== undefined) {
            if (relation.strength < 0 || relation.strength > 1) {
                errors.push('关系强度必须在0到1之间');
            }
            if (relation.strength < 0.1) {
                warnings.push('关系强度过低，可能不够显著');
            }
        }

        if (relation.noteIds && relation.noteIds.length > 100) {
            warnings.push('关联笔记过多，可能影响性能');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 清理和标准化术语数据
     */
    static sanitizeMathTerm(term: Partial<MathTerm>): Partial<MathTerm> {
        const sanitized: Partial<MathTerm> = { ...term };

        // 清理字符串字段
        if (sanitized.chineseName) {
            sanitized.chineseName = sanitized.chineseName.trim().replace(/\s+/g, ' ');
        }

        if (sanitized.englishName) {
            sanitized.englishName = sanitized.englishName.trim().replace(/\s+/g, ' ');
        }

        if (sanitized.latexCode) {
            sanitized.latexCode = sanitized.latexCode.trim();
        }

        if (sanitized.definition) {
            sanitized.definition = sanitized.definition.trim().replace(/\s+/g, ' ');
        }

        // 清理别名数组
        if (sanitized.aliases) {
            sanitized.aliases = sanitized.aliases
                .map(alias => alias.trim())
                .filter(alias => alias.length > 0)
                .filter((alias, index, arr) => arr.indexOf(alias) === index); // 去重
        }

        return sanitized;
    }

    /**
     * 清理和标准化关系数据
     */
    static sanitizeTermRelation(relation: Partial<TermRelation>): Partial<TermRelation> {
        const sanitized: Partial<TermRelation> = { ...relation };

        // 清理ID字段
        if (sanitized.sourceTermId) {
            sanitized.sourceTermId = sanitized.sourceTermId.trim();
        }

        if (sanitized.targetTermId) {
            sanitized.targetTermId = sanitized.targetTermId.trim();
        }

        // 标准化强度值
        if (sanitized.strength !== undefined) {
            sanitized.strength = Math.max(0, Math.min(1, sanitized.strength));
        }

        // 清理笔记ID数组
        if (sanitized.noteIds) {
            sanitized.noteIds = sanitized.noteIds
                .map(id => id.trim())
                .filter(id => id.length > 0)
                .filter((id, index, arr) => arr.indexOf(id) === index); // 去重
        }

        return sanitized;
    }

    /**
     * 生成唯一ID
     */
    private static generateId(prefix: string): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * 检查术语是否重复
     */
    static isDuplicateTerm(newTerm: MathTerm, existingTerms: MathTerm[]): {
        isDuplicate: boolean;
        duplicateType: 'exact' | 'similar' | 'none';
        conflictingTerm?: MathTerm;
    } {
        const newNameLower = newTerm.chineseName.toLowerCase();
        const newEnglishLower = newTerm.englishName?.toLowerCase();

        for (const existing of existingTerms) {
            // 检查完全重复
            if (existing.chineseName.toLowerCase() === newNameLower &&
                existing.category === newTerm.category) {
                return {
                    isDuplicate: true,
                    duplicateType: 'exact',
                    conflictingTerm: existing
                };
            }

            // 检查英文名重复
            if (newEnglishLower && existing.englishName?.toLowerCase() === newEnglishLower &&
                existing.category === newTerm.category) {
                return {
                    isDuplicate: true,
                    duplicateType: 'exact',
                    conflictingTerm: existing
                };
            }

            // 检查别名冲突
            const allNewNames = [newTerm.chineseName, ...(newTerm.aliases || [])];
            const allExistingNames = [existing.chineseName, ...(existing.aliases || [])];

            for (const newName of allNewNames) {
                for (const existingName of allExistingNames) {
                    if (newName.toLowerCase() === existingName.toLowerCase() &&
                        existing.category === newTerm.category) {
                        return {
                            isDuplicate: true,
                            duplicateType: 'similar',
                            conflictingTerm: existing
                        };
                    }
                }
            }
        }

        return {
            isDuplicate: false,
            duplicateType: 'none'
        };
    }

    /**
     * 合并重复术语
     */
    static mergeTerms(primary: MathTerm, secondary: MathTerm): MathTerm {
        const merged: MathTerm = { ...primary };

        // 合并别名
        const allAliases = [
            ...(primary.aliases || []),
            ...(secondary.aliases || []),
            secondary.chineseName
        ];

        if (secondary.englishName && secondary.englishName !== primary.englishName) {
            allAliases.push(secondary.englishName);
        }

        merged.aliases = Array.from(new Set(allAliases))
            .filter(alias => alias !== primary.chineseName && alias !== primary.englishName);

        // 合并定义（保留更详细的）
        if (!merged.definition && secondary.definition) {
            merged.definition = secondary.definition;
        } else if (merged.definition && secondary.definition && 
                   secondary.definition.length > merged.definition.length) {
            merged.definition = secondary.definition;
        }

        // 更新时间
        merged.updatedAt = new Date();

        return merged;
    }
}