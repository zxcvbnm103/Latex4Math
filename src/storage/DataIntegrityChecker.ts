import { MathTerm, TermRelation } from '../types';
import { DatabaseManager } from './DatabaseManager';
import { DataIntegrityReport } from './index';

/**
 * 数据完整性检查器 - 确保数据存储的一致性和完整性
 */
export class DataIntegrityChecker {
    private databaseManager: DatabaseManager;

    constructor(databaseManager: DatabaseManager) {
        this.databaseManager = databaseManager;
    }

    /**
     * 执行完整的数据完整性检查
     */
    async performIntegrityCheck(): Promise<DataIntegrityReport> {
        console.log('DataIntegrityChecker: 开始数据完整性检查...');
        
        const report: DataIntegrityReport = {
            totalTerms: 0,
            totalRelations: 0,
            orphanedRelations: 0,
            duplicateTerms: 0,
            corruptedEntries: 0,
            lastChecked: new Date(),
            recommendations: []
        };

        try {
            // 获取所有数据
            const allTerms = await this.databaseManager.getAllTerms();
            const allRelations: TermRelation[] = [];
            
            // 收集所有关系
            for (const term of allTerms) {
                const relations = await this.databaseManager.getRelationsForTerm(term.id);
                for (const relation of relations) {
                    if (!allRelations.find(r => r.id === relation.id)) {
                        allRelations.push(relation);
                    }
                }
            }

            report.totalTerms = allTerms.length;
            report.totalRelations = allRelations.length;

            // 检查孤立关系
            report.orphanedRelations = await this.checkOrphanedRelations(allTerms, allRelations);
            
            // 检查重复术语
            report.duplicateTerms = await this.checkDuplicateTerms(allTerms);
            
            // 检查数据损坏
            report.corruptedEntries = await this.checkCorruptedEntries(allTerms, allRelations);
            
            // 生成建议
            report.recommendations = this.generateRecommendations(report);

            console.log('DataIntegrityChecker: 数据完整性检查完成');
            return report;

        } catch (error) {
            console.error('DataIntegrityChecker: 检查过程中出现错误:', error);
            report.recommendations.push(`检查过程中出现错误: ${error.message}`);
            return report;
        }
    }

    /**
     * 检查孤立关系（指向不存在术语的关系）
     */
    private async checkOrphanedRelations(terms: MathTerm[], relations: TermRelation[]): Promise<number> {
        const termIds = new Set(terms.map(term => term.id));
        let orphanedCount = 0;

        for (const relation of relations) {
            if (!termIds.has(relation.sourceTermId) || !termIds.has(relation.targetTermId)) {
                orphanedCount++;
                console.warn(`发现孤立关系: ${relation.id}`);
            }
        }

        return orphanedCount;
    }

    /**
     * 检查重复术语
     */
    private async checkDuplicateTerms(terms: MathTerm[]): Promise<number> {
        const nameMap = new Map<string, MathTerm[]>();
        let duplicateCount = 0;

        // 按名称分组
        for (const term of terms) {
            const key = `${term.chineseName.toLowerCase()}_${term.category}`;
            if (!nameMap.has(key)) {
                nameMap.set(key, []);
            }
            nameMap.get(key)!.push(term);
        }

        // 检查重复
        for (const [key, termGroup] of nameMap) {
            if (termGroup.length > 1) {
                duplicateCount += termGroup.length - 1;
                console.warn(`发现重复术语组: ${key}, 数量: ${termGroup.length}`);
            }
        }

        return duplicateCount;
    }

    /**
     * 检查数据损坏
     */
    private async checkCorruptedEntries(terms: MathTerm[], relations: TermRelation[]): Promise<number> {
        let corruptedCount = 0;

        // 检查术语数据完整性
        for (const term of terms) {
            if (!term.id || !term.chineseName || !term.category || !term.latexCode) {
                corruptedCount++;
                console.warn(`发现损坏的术语: ${term.id || 'unknown'}`);
            }

            // 检查日期字段
            if (!(term.createdAt instanceof Date) || !(term.updatedAt instanceof Date)) {
                corruptedCount++;
                console.warn(`术语日期字段损坏: ${term.id}`);
            }

            // 检查数组字段
            if (!Array.isArray(term.aliases)) {
                corruptedCount++;
                console.warn(`术语别名字段损坏: ${term.id}`);
            }
        }

        // 检查关系数据完整性
        for (const relation of relations) {
            if (!relation.id || !relation.sourceTermId || !relation.targetTermId || !relation.relationType) {
                corruptedCount++;
                console.warn(`发现损坏的关系: ${relation.id || 'unknown'}`);
            }

            // 检查强度值
            if (typeof relation.strength !== 'number' || relation.strength < 0 || relation.strength > 1) {
                corruptedCount++;
                console.warn(`关系强度值异常: ${relation.id}`);
            }

            // 检查日期字段
            if (!(relation.createdAt instanceof Date) || !(relation.lastUpdated instanceof Date)) {
                corruptedCount++;
                console.warn(`关系日期字段损坏: ${relation.id}`);
            }

            // 检查数组字段
            if (!Array.isArray(relation.noteIds)) {
                corruptedCount++;
                console.warn(`关系笔记ID字段损坏: ${relation.id}`);
            }
        }

        return corruptedCount;
    }

    /**
     * 生成修复建议
     */
    private generateRecommendations(report: DataIntegrityReport): string[] {
        const recommendations: string[] = [];

        if (report.orphanedRelations > 0) {
            recommendations.push(`发现 ${report.orphanedRelations} 个孤立关系，建议运行数据清理功能`);
        }

        if (report.duplicateTerms > 0) {
            recommendations.push(`发现 ${report.duplicateTerms} 个重复术语，建议合并或删除重复项`);
        }

        if (report.corruptedEntries > 0) {
            recommendations.push(`发现 ${report.corruptedEntries} 个损坏条目，建议从备份恢复或手动修复`);
        }

        if (report.totalTerms > 1000) {
            recommendations.push('术语数量较多，建议定期进行数据优化以保持性能');
        }

        if (report.totalRelations > report.totalTerms * 5) {
            recommendations.push('关系数量相对术语数量过多，可能存在冗余关系');
        }

        if (recommendations.length === 0) {
            recommendations.push('数据完整性良好，无需特殊处理');
        }

        return recommendations;
    }

    /**
     * 自动修复数据问题
     */
    async autoRepair(): Promise<{
        success: boolean;
        repaired: {
            orphanedRelations: number;
            duplicateTerms: number;
            corruptedEntries: number;
        };
        errors: string[];
    }> {
        console.log('DataIntegrityChecker: 开始自动修复...');
        
        const result = {
            success: true,
            repaired: {
                orphanedRelations: 0,
                duplicateTerms: 0,
                corruptedEntries: 0
            },
            errors: [] as string[]
        };

        try {
            // 修复孤立关系
            result.repaired.orphanedRelations = await this.repairOrphanedRelations();
            
            // 修复重复术语（这里只是标记，实际合并需要用户确认）
            result.repaired.duplicateTerms = await this.markDuplicateTerms();
            
            // 修复损坏条目
            result.repaired.corruptedEntries = await this.repairCorruptedEntries();

            console.log('DataIntegrityChecker: 自动修复完成');

        } catch (error) {
            console.error('DataIntegrityChecker: 自动修复失败:', error);
            result.success = false;
            result.errors.push(`自动修复失败: ${error.message}`);
        }

        return result;
    }

    /**
     * 修复孤立关系
     */
    private async repairOrphanedRelations(): Promise<number> {
        const allTerms = await this.databaseManager.getAllTerms();
        const termIds = new Set(allTerms.map(term => term.id));
        let repairedCount = 0;

        for (const term of allTerms) {
            const relations = await this.databaseManager.getRelationsForTerm(term.id);
            
            for (const relation of relations) {
                if (!termIds.has(relation.sourceTermId) || !termIds.has(relation.targetTermId)) {
                    await this.databaseManager.deleteRelation(relation.id);
                    repairedCount++;
                }
            }
        }

        return repairedCount;
    }

    /**
     * 标记重复术语（实际合并需要用户确认）
     */
    private async markDuplicateTerms(): Promise<number> {
        // 这里只是检测和记录，实际的合并操作需要用户界面支持
        const allTerms = await this.databaseManager.getAllTerms();
        const duplicateGroups = new Map<string, MathTerm[]>();
        
        for (const term of allTerms) {
            const key = `${term.chineseName.toLowerCase()}_${term.category}`;
            if (!duplicateGroups.has(key)) {
                duplicateGroups.set(key, []);
            }
            duplicateGroups.get(key)!.push(term);
        }

        let duplicateCount = 0;
        for (const [key, group] of duplicateGroups) {
            if (group.length > 1) {
                duplicateCount += group.length - 1;
                console.log(`标记重复术语组: ${key}`);
            }
        }

        return duplicateCount;
    }

    /**
     * 修复损坏条目
     */
    private async repairCorruptedEntries(): Promise<number> {
        const allTerms = await this.databaseManager.getAllTerms();
        let repairedCount = 0;

        for (const term of allTerms) {
            let needsRepair = false;
            const repairedTerm = { ...term };

            // 修复缺失的必需字段
            if (!repairedTerm.id) {
                repairedTerm.id = `term_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                needsRepair = true;
            }

            if (!repairedTerm.chineseName) {
                repairedTerm.chineseName = '未知术语';
                needsRepair = true;
            }

            if (!repairedTerm.latexCode) {
                repairedTerm.latexCode = '';
                needsRepair = true;
            }

            // 修复日期字段
            if (!(repairedTerm.createdAt instanceof Date)) {
                repairedTerm.createdAt = new Date();
                needsRepair = true;
            }

            if (!(repairedTerm.updatedAt instanceof Date)) {
                repairedTerm.updatedAt = new Date();
                needsRepair = true;
            }

            // 修复数组字段
            if (!Array.isArray(repairedTerm.aliases)) {
                repairedTerm.aliases = [];
                needsRepair = true;
            }

            if (needsRepair) {
                await this.databaseManager.updateTerm(repairedTerm);
                repairedCount++;
            }
        }

        return repairedCount;
    }

    /**
     * 生成数据健康报告
     */
    async generateHealthReport(): Promise<string> {
        const report = await this.performIntegrityCheck();
        
        let healthReport = '# 数学记忆图谱数据健康报告\n\n';
        healthReport += `**检查时间:** ${report.lastChecked.toLocaleString()}\n\n`;
        
        healthReport += '## 数据概览\n';
        healthReport += `- 术语总数: ${report.totalTerms}\n`;
        healthReport += `- 关系总数: ${report.totalRelations}\n`;
        healthReport += `- 平均每个术语的关系数: ${report.totalTerms > 0 ? (report.totalRelations / report.totalTerms).toFixed(2) : 0}\n\n`;
        
        healthReport += '## 问题检测\n';
        
        if (report.orphanedRelations > 0) {
            healthReport += `⚠️ **孤立关系:** ${report.orphanedRelations} 个\n`;
        } else {
            healthReport += `✅ **孤立关系:** 无\n`;
        }
        
        if (report.duplicateTerms > 0) {
            healthReport += `⚠️ **重复术语:** ${report.duplicateTerms} 个\n`;
        } else {
            healthReport += `✅ **重复术语:** 无\n`;
        }
        
        if (report.corruptedEntries > 0) {
            healthReport += `❌ **损坏条目:** ${report.corruptedEntries} 个\n`;
        } else {
            healthReport += `✅ **损坏条目:** 无\n`;
        }
        
        healthReport += '\n## 建议\n';
        for (const recommendation of report.recommendations) {
            healthReport += `- ${recommendation}\n`;
        }
        
        // 计算健康评分
        const totalIssues = report.orphanedRelations + report.duplicateTerms + report.corruptedEntries;
        const healthScore = Math.max(0, 100 - (totalIssues * 5));
        
        healthReport += `\n## 健康评分\n`;
        healthReport += `**${healthScore}/100**\n\n`;
        
        if (healthScore >= 90) {
            healthReport += '🎉 数据健康状况优秀！\n';
        } else if (healthScore >= 70) {
            healthReport += '👍 数据健康状况良好，有少量问题需要关注。\n';
        } else if (healthScore >= 50) {
            healthReport += '⚠️ 数据健康状况一般，建议进行维护。\n';
        } else {
            healthReport += '❌ 数据健康状况较差，需要立即处理。\n';
        }
        
        return healthReport;
    }
}