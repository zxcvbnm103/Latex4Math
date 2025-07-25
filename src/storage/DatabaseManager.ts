import { App, Plugin, TFile } from 'obsidian';
import { MathTerm, TermRelation, TermStatistics, MathCategory, RelationType } from '../types';
import { IDatabaseManager } from '../interfaces/core';

/**
 * 数据库管理器 - 基于Obsidian原生存储的自生长数据架构
 */
export class DatabaseManager implements IDatabaseManager {
    private app: App;
    private plugin: Plugin;
    private dataPath: string;
    private isInitialized: boolean = false;
    
    // 内存缓存
    private termsCache: Map<string, MathTerm> = new Map();
    private relationsCache: Map<string, TermRelation> = new Map();
    private lastSaveTime: number = 0;
    private isDirty: boolean = false;

    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
        this.dataPath = 'math-memory-graph';
    }

    /**
     * 初始化数据库
     */
    async initialize(): Promise<void> {
        console.log('DatabaseManager: 开始初始化数据存储...');
        
        try {
            // 确保数据目录存在
            await this.ensureDataDirectory();
            
            // 加载现有数据
            await this.loadExistingData();
            
            // 启动自动保存
            this.startAutoSave();
            
            this.isInitialized = true;
            console.log('DatabaseManager: 数据存储初始化完成');
        } catch (error) {
            console.error('DatabaseManager: 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 保存术语
     */
    async saveTerm(term: MathTerm): Promise<void> {
        this.termsCache.set(term.id, { ...term, updatedAt: new Date() });
        this.markDirty();
        
        if (this.shouldAutoSave()) {
            await this.persistData();
        }
    }

    /**
     * 获取术语
     */
    async getTerm(id: string): Promise<MathTerm | null> {
        return this.termsCache.get(id) || null;
    }

    /**
     * 获取所有术语
     */
    async getAllTerms(): Promise<MathTerm[]> {
        return Array.from(this.termsCache.values());
    }

    /**
     * 按类别获取术语
     */
    async getTermsByCategory(category: MathCategory): Promise<MathTerm[]> {
        return Array.from(this.termsCache.values())
            .filter(term => term.category === category);
    }

    /**
     * 更新术语
     */
    async updateTerm(term: MathTerm): Promise<void> {
        if (this.termsCache.has(term.id)) {
            await this.saveTerm(term);
        } else {
            throw new Error(`术语 ${term.id} 不存在`);
        }
    }

    /**
     * 删除术语
     */
    async deleteTerm(id: string): Promise<void> {
        if (this.termsCache.has(id)) {
            this.termsCache.delete(id);
            
            // 删除相关的关系
            const relatedRelations = Array.from(this.relationsCache.values())
                .filter(rel => rel.sourceTermId === id || rel.targetTermId === id);
            
            for (const relation of relatedRelations) {
                this.relationsCache.delete(relation.id);
            }
            
            this.markDirty();
            
            if (this.shouldAutoSave()) {
                await this.persistData();
            }
        }
    }

    /**
     * 保存关系
     */
    async saveRelation(relation: TermRelation): Promise<void> {
        this.relationsCache.set(relation.id, { ...relation, lastUpdated: new Date() });
        this.markDirty();
        
        if (this.shouldAutoSave()) {
            await this.persistData();
        }
    }

    /**
     * 获取关系
     */
    async getRelation(id: string): Promise<TermRelation | null> {
        return this.relationsCache.get(id) || null;
    }

    /**
     * 获取术语的所有关系
     */
    async getRelationsForTerm(termId: string): Promise<TermRelation[]> {
        return Array.from(this.relationsCache.values())
            .filter(rel => rel.sourceTermId === termId || rel.targetTermId === termId);
    }

    /**
     * 更新关系
     */
    async updateRelation(relation: TermRelation): Promise<void> {
        if (this.relationsCache.has(relation.id)) {
            await this.saveRelation(relation);
        } else {
            throw new Error(`关系 ${relation.id} 不存在`);
        }
    }

    /**
     * 删除关系
     */
    async deleteRelation(id: string): Promise<void> {
        if (this.relationsCache.has(id)) {
            this.relationsCache.delete(id);
            this.markDirty();
            
            if (this.shouldAutoSave()) {
                await this.persistData();
            }
        }
    }

    /**
     * 获取术语统计
     */
    async getTermStatistics(): Promise<TermStatistics> {
        const terms = Array.from(this.termsCache.values());
        const categoryCounts = new Map<MathCategory, number>();
        
        // 统计各类别数量
        for (const term of terms) {
            const count = categoryCounts.get(term.category) || 0;
            categoryCounts.set(term.category, count + 1);
        }
        
        // 获取最近添加的术语（按创建时间排序）
        const recentlyAdded = terms
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 10);
        
        // 这里简化处理，实际应该基于使用频率
        const mostUsedTerms = terms
            .slice(0, 10)
            .map(term => ({ term, count: 1 }));
        
        return {
            totalTerms: terms.length,
            categoryCounts,
            mostUsedTerms,
            recentlyAdded
        };
    }

    /**
     * 搜索术语
     */
    async searchTerms(query: string): Promise<MathTerm[]> {
        const lowercaseQuery = query.toLowerCase();
        
        return Array.from(this.termsCache.values()).filter(term => 
            term.chineseName.toLowerCase().includes(lowercaseQuery) ||
            term.englishName?.toLowerCase().includes(lowercaseQuery) ||
            term.aliases.some(alias => alias.toLowerCase().includes(lowercaseQuery)) ||
            term.definition?.toLowerCase().includes(lowercaseQuery)
        );
    }

    /**
     * 备份数据
     */
    async backup(): Promise<void> {
        const backupData = {
            terms: Array.from(this.termsCache.entries()),
            relations: Array.from(this.relationsCache.entries()),
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const backupFileName = `backup-${Date.now()}.json`;
        const backupPath = `${this.dataPath}/backups/${backupFileName}`;
        
        await this.plugin.app.vault.adapter.write(
            backupPath,
            JSON.stringify(backupData, null, 2)
        );
        
        console.log(`DatabaseManager: 数据已备份到 ${backupPath}`);
    }

    /**
     * 恢复数据
     */
    async restore(backupData: string): Promise<void> {
        try {
            const data = JSON.parse(backupData);
            
            // 验证数据格式
            if (!data.terms || !data.relations) {
                throw new Error('备份数据格式无效');
            }
            
            // 清空当前缓存
            this.termsCache.clear();
            this.relationsCache.clear();
            
            // 恢复术语数据
            for (const [id, term] of data.terms) {
                this.termsCache.set(id, {
                    ...term,
                    createdAt: new Date(term.createdAt),
                    updatedAt: new Date(term.updatedAt)
                });
            }
            
            // 恢复关系数据
            for (const [id, relation] of data.relations) {
                this.relationsCache.set(id, {
                    ...relation,
                    createdAt: new Date(relation.createdAt),
                    lastUpdated: new Date(relation.lastUpdated)
                });
            }
            
            // 立即持久化
            await this.persistData();
            
            console.log('DatabaseManager: 数据恢复完成');
        } catch (error) {
            console.error('DatabaseManager: 数据恢复失败:', error);
            throw error;
        }
    }

    /**
     * 清理数据
     */
    async cleanup(): Promise<void> {
        // 清理孤立的关系（指向不存在术语的关系）
        const orphanedRelations: string[] = [];
        
        for (const [id, relation] of this.relationsCache) {
            if (!this.termsCache.has(relation.sourceTermId) || 
                !this.termsCache.has(relation.targetTermId)) {
                orphanedRelations.push(id);
            }
        }
        
        for (const id of orphanedRelations) {
            this.relationsCache.delete(id);
        }
        
        if (orphanedRelations.length > 0) {
            this.markDirty();
            await this.persistData();
            console.log(`DatabaseManager: 清理了 ${orphanedRelations.length} 个孤立关系`);
        }
    }

    /**
     * 确保数据目录存在
     */
    private async ensureDataDirectory(): Promise<void> {
        const adapter = this.plugin.app.vault.adapter;
        
        // 创建主数据目录
        if (!await adapter.exists(this.dataPath)) {
            await adapter.mkdir(this.dataPath);
        }
        
        // 创建备份目录
        const backupPath = `${this.dataPath}/backups`;
        if (!await adapter.exists(backupPath)) {
            await adapter.mkdir(backupPath);
        }
    }

    /**
     * 加载现有数据
     */
    private async loadExistingData(): Promise<void> {
        const adapter = this.plugin.app.vault.adapter;
        
        try {
            // 加载术语数据
            const termsPath = `${this.dataPath}/terms.json`;
            if (await adapter.exists(termsPath)) {
                const termsData = await adapter.read(termsPath);
                const terms = JSON.parse(termsData);
                
                for (const term of terms) {
                    this.termsCache.set(term.id, {
                        ...term,
                        createdAt: new Date(term.createdAt),
                        updatedAt: new Date(term.updatedAt)
                    });
                }
            }
            
            // 加载关系数据
            const relationsPath = `${this.dataPath}/relations.json`;
            if (await adapter.exists(relationsPath)) {
                const relationsData = await adapter.read(relationsPath);
                const relations = JSON.parse(relationsData);
                
                for (const relation of relations) {
                    this.relationsCache.set(relation.id, {
                        ...relation,
                        createdAt: new Date(relation.createdAt),
                        lastUpdated: new Date(relation.lastUpdated)
                    });
                }
            }
            
            console.log(`DatabaseManager: 加载了 ${this.termsCache.size} 个术语和 ${this.relationsCache.size} 个关系`);
        } catch (error) {
            console.error('DatabaseManager: 加载数据时出错:', error);
            // 不抛出错误，允许从空数据开始
        }
    }

    /**
     * 持久化数据到文件
     */
    private async persistData(): Promise<void> {
        if (!this.isDirty) return;
        
        const adapter = this.plugin.app.vault.adapter;
        
        try {
            // 保存术语数据
            const termsPath = `${this.dataPath}/terms.json`;
            const termsData = Array.from(this.termsCache.values());
            await adapter.write(termsPath, JSON.stringify(termsData, null, 2));
            
            // 保存关系数据
            const relationsPath = `${this.dataPath}/relations.json`;
            const relationsData = Array.from(this.relationsCache.values());
            await adapter.write(relationsPath, JSON.stringify(relationsData, null, 2));
            
            this.isDirty = false;
            this.lastSaveTime = Date.now();
            
            console.log('DatabaseManager: 数据已持久化');
        } catch (error) {
            console.error('DatabaseManager: 数据持久化失败:', error);
            throw error;
        }
    }

    /**
     * 标记数据为脏状态
     */
    private markDirty(): void {
        this.isDirty = true;
    }

    /**
     * 检查是否应该自动保存
     */
    private shouldAutoSave(): boolean {
        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaveTime;
        return timeSinceLastSave > 5000; // 5秒间隔
    }

    /**
     * 启动自动保存定时器
     */
    private startAutoSave(): void {
        setInterval(async () => {
            if (this.isDirty) {
                try {
                    await this.persistData();
                } catch (error) {
                    console.error('DatabaseManager: 自动保存失败:', error);
                }
            }
        }, 10000); // 每10秒检查一次
    }
}