import { MathCategory, RelationType } from '../types';
import { DataModelFactory } from './DataModelFactory';
import { DataAccessLayer } from './DataAccessLayer';
import { DatabaseManager } from './DatabaseManager';

/**
 * 存储系统测试工具
 */
export class StorageTest {
    private dataAccessLayer: DataAccessLayer;
    private databaseManager: DatabaseManager;

    constructor(dataAccessLayer: DataAccessLayer, databaseManager: DatabaseManager) {
        this.dataAccessLayer = dataAccessLayer;
        this.databaseManager = databaseManager;
    }

    /**
     * 运行基础功能测试
     */
    async runBasicTests(): Promise<{
        success: boolean;
        results: string[];
        errors: string[];
    }> {
        const results: string[] = [];
        const errors: string[] = [];

        try {
            // 测试1: 创建术语
            results.push('开始测试术语创建...');
            const termResult = await this.dataAccessLayer.addTermSmart({
                chineseName: '导数',
                englishName: 'Derivative',
                category: MathCategory.CALCULUS,
                latexCode: '\\frac{d}{dx}',
                definition: '函数在某点的瞬时变化率',
                aliases: ['微分', '求导']
            });

            if (termResult.success && termResult.term) {
                results.push(`✓ 术语创建成功: ${termResult.term.chineseName}`);
                
                // 测试2: 创建第二个术语
                const term2Result = await this.dataAccessLayer.addTermSmart({
                    chineseName: '积分',
                    englishName: 'Integral',
                    category: MathCategory.CALCULUS,
                    latexCode: '\\int',
                    definition: '函数的反导数或面积计算',
                    aliases: ['不定积分', '定积分']
                });

                if (term2Result.success && term2Result.term) {
                    results.push(`✓ 第二个术语创建成功: ${term2Result.term.chineseName}`);
                    
                    // 测试3: 创建关系
                    const relationResult = await this.dataAccessLayer.createRelationSmart({
                        sourceTermId: termResult.term.id,
                        targetTermId: term2Result.term.id,
                        relationType: RelationType.DEPENDS_ON,
                        strength: 0.8,
                        noteIds: ['test-note-1']
                    });

                    if (relationResult.success) {
                        results.push('✓ 术语关系创建成功');
                    } else {
                        errors.push('✗ 术语关系创建失败');
                    }

                    // 测试4: 搜索功能
                    const searchResult = await this.dataAccessLayer.searchTermsSmart('导数', {
                        includeRelated: true,
                        limit: 10
                    });

                    if (searchResult.directMatches.length > 0) {
                        results.push(`✓ 搜索功能正常，找到 ${searchResult.directMatches.length} 个直接匹配`);
                    } else {
                        errors.push('✗ 搜索功能异常');
                    }

                    // 测试5: 扩展信息获取
                    const extendedInfo = await this.dataAccessLayer.getTermExtended(termResult.term.id);
                    if (extendedInfo.term && extendedInfo.relations.length > 0) {
                        results.push('✓ 扩展信息获取成功');
                    } else {
                        errors.push('✗ 扩展信息获取失败');
                    }

                } else {
                    errors.push('✗ 第二个术语创建失败');
                }
            } else {
                errors.push('✗ 术语创建失败');
            }

            // 测试6: 数据验证
            const validTerm = DataModelFactory.createMathTerm({
                chineseName: '极限',
                category: MathCategory.CALCULUS,
                latexCode: '\\lim'
            });

            const validation = DataModelFactory.validateMathTerm(validTerm);
            if (validation.isValid) {
                results.push('✓ 数据验证功能正常');
            } else {
                errors.push('✗ 数据验证功能异常');
            }

            // 测试7: 统计功能
            const stats = await this.databaseManager.getTermStatistics();
            if (stats.totalTerms >= 0) {
                results.push(`✓ 统计功能正常，当前术语总数: ${stats.totalTerms}`);
            } else {
                errors.push('✗ 统计功能异常');
            }

        } catch (error) {
            errors.push(`测试过程中发生错误: ${error.message}`);
        }

        return {
            success: errors.length === 0,
            results,
            errors
        };
    }

    /**
     * 运行性能测试
     */
    async runPerformanceTests(): Promise<{
        success: boolean;
        metrics: {
            termCreationTime: number;
            searchTime: number;
            relationCreationTime: number;
        };
        errors: string[];
    }> {
        const errors: string[] = [];
        const metrics = {
            termCreationTime: 0,
            searchTime: 0,
            relationCreationTime: 0
        };

        try {
            // 性能测试1: 术语创建速度
            const startTime = Date.now();
            
            for (let i = 0; i < 10; i++) {
                await this.dataAccessLayer.addTermSmart({
                    chineseName: `测试术语${i}`,
                    category: MathCategory.ALGEBRA,
                    latexCode: `x_${i}`
                });
            }
            
            metrics.termCreationTime = Date.now() - startTime;

            // 性能测试2: 搜索速度
            const searchStartTime = Date.now();
            
            for (let i = 0; i < 5; i++) {
                await this.dataAccessLayer.searchTermsSmart('测试', { limit: 20 });
            }
            
            metrics.searchTime = Date.now() - searchStartTime;

            // 性能测试3: 关系创建速度（需要先获取一些术语）
            const allTerms = await this.databaseManager.getAllTerms();
            if (allTerms.length >= 2) {
                const relationStartTime = Date.now();
                
                for (let i = 0; i < 5; i++) {
                    await this.dataAccessLayer.createRelationSmart({
                        sourceTermId: allTerms[0].id,
                        targetTermId: allTerms[1].id,
                        relationType: RelationType.SIMILAR_TO,
                        strength: 0.5
                    });
                }
                
                metrics.relationCreationTime = Date.now() - relationStartTime;
            }

        } catch (error) {
            errors.push(`性能测试过程中发生错误: ${error.message}`);
        }

        return {
            success: errors.length === 0,
            metrics,
            errors
        };
    }

    /**
     * 清理测试数据
     */
    async cleanupTestData(): Promise<void> {
        try {
            const allTerms = await this.databaseManager.getAllTerms();
            
            // 删除测试术语
            for (const term of allTerms) {
                if (term.chineseName.includes('测试') || 
                    term.chineseName === '导数' || 
                    term.chineseName === '积分') {
                    await this.databaseManager.deleteTerm(term.id);
                }
            }
            
            console.log('StorageTest: 测试数据清理完成');
        } catch (error) {
            console.error('StorageTest: 清理测试数据时出错:', error);
        }
    }

    /**
     * 生成测试报告
     */
    generateTestReport(basicResults: any, performanceResults: any): string {
        let report = '# 数学记忆图谱存储系统测试报告\n\n';
        
        report += `## 测试时间\n${new Date().toLocaleString()}\n\n`;
        
        report += '## 基础功能测试\n';
        if (basicResults.success) {
            report += '✅ **测试通过**\n\n';
        } else {
            report += '❌ **测试失败**\n\n';
        }
        
        report += '### 测试结果\n';
        for (const result of basicResults.results) {
            report += `- ${result}\n`;
        }
        
        if (basicResults.errors.length > 0) {
            report += '\n### 错误信息\n';
            for (const error of basicResults.errors) {
                report += `- ${error}\n`;
            }
        }
        
        report += '\n## 性能测试\n';
        if (performanceResults.success) {
            report += '✅ **测试通过**\n\n';
        } else {
            report += '❌ **测试失败**\n\n';
        }
        
        report += '### 性能指标\n';
        report += `- 术语创建时间: ${performanceResults.metrics.termCreationTime}ms (10个术语)\n`;
        report += `- 搜索时间: ${performanceResults.metrics.searchTime}ms (5次搜索)\n`;
        report += `- 关系创建时间: ${performanceResults.metrics.relationCreationTime}ms (5个关系)\n`;
        
        if (performanceResults.errors.length > 0) {
            report += '\n### 性能测试错误\n';
            for (const error of performanceResults.errors) {
                report += `- ${error}\n`;
            }
        }
        
        report += '\n## 总结\n';
        const overallSuccess = basicResults.success && performanceResults.success;
        if (overallSuccess) {
            report += '🎉 所有测试通过！数据存储架构运行正常。\n';
        } else {
            report += '⚠️ 部分测试失败，请检查错误信息并修复相关问题。\n';
        }
        
        return report;
    }
}