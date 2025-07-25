import { App, Plugin } from 'obsidian';

/**
 * 数据迁移接口
 */
interface Migration {
    version: string;
    description: string;
    up: (adapter: any) => Promise<void>;
    down?: (adapter: any) => Promise<void>;
}

/**
 * 数据迁移管理器 - 处理数据结构的版本升级
 */
export class MigrationManager {
    private app: App;
    private plugin: Plugin;
    private dataPath: string;
    private migrations: Migration[] = [];
    private currentVersion: string = '1.0.0';

    constructor(app: App, plugin: Plugin, dataPath: string) {
        this.app = app;
        this.plugin = plugin;
        this.dataPath = dataPath;
        this.initializeMigrations();
    }

    /**
     * 初始化所有迁移
     */
    private initializeMigrations(): void {
        this.migrations = [
            {
                version: '1.0.0',
                description: '初始数据结构',
                up: async (adapter) => {
                    // 创建基础数据结构
                    await this.createInitialStructure(adapter);
                }
            },
            {
                version: '1.1.0',
                description: '添加术语使用频率统计',
                up: async (adapter) => {
                    await this.addUsageStatistics(adapter);
                }
            },
            {
                version: '1.2.0',
                description: '优化关系存储结构',
                up: async (adapter) => {
                    await this.optimizeRelationStorage(adapter);
                }
            }
        ];
    }

    /**
     * 执行数据迁移
     */
    async migrate(): Promise<void> {
        console.log('MigrationManager: 开始数据迁移检查...');
        
        const adapter = this.plugin.app.vault.adapter;
        const currentVersion = await this.getCurrentVersion(adapter);
        
        console.log(`MigrationManager: 当前版本 ${currentVersion}, 目标版本 ${this.currentVersion}`);
        
        if (this.needsMigration(currentVersion)) {
            await this.performMigration(adapter, currentVersion);
        } else {
            console.log('MigrationManager: 无需迁移');
        }
    }

    /**
     * 获取当前数据版本
     */
    private async getCurrentVersion(adapter: any): Promise<string> {
        const versionPath = `${this.dataPath}/version.json`;
        
        try {
            if (await adapter.exists(versionPath)) {
                const versionData = await adapter.read(versionPath);
                const version = JSON.parse(versionData);
                return version.version || '0.0.0';
            }
        } catch (error) {
            console.warn('MigrationManager: 无法读取版本信息:', error);
        }
        
        return '0.0.0';
    }

    /**
     * 保存版本信息
     */
    private async saveVersion(adapter: any, version: string): Promise<void> {
        const versionPath = `${this.dataPath}/version.json`;
        const versionData = {
            version,
            updatedAt: new Date().toISOString()
        };
        
        await adapter.write(versionPath, JSON.stringify(versionData, null, 2));
    }

    /**
     * 检查是否需要迁移
     */
    private needsMigration(currentVersion: string): boolean {
        return this.compareVersions(currentVersion, this.currentVersion) < 0;
    }

    /**
     * 执行迁移
     */
    private async performMigration(adapter: any, fromVersion: string): Promise<void> {
        console.log(`MigrationManager: 开始从版本 ${fromVersion} 迁移到 ${this.currentVersion}`);
        
        // 创建备份
        await this.createMigrationBackup(adapter);
        
        try {
            // 按顺序执行需要的迁移
            const migrationsToRun = this.migrations.filter(migration => 
                this.compareVersions(fromVersion, migration.version) < 0 &&
                this.compareVersions(migration.version, this.currentVersion) <= 0
            );
            
            for (const migration of migrationsToRun) {
                console.log(`MigrationManager: 执行迁移 ${migration.version} - ${migration.description}`);
                await migration.up(adapter);
            }
            
            // 更新版本信息
            await this.saveVersion(adapter, this.currentVersion);
            
            console.log('MigrationManager: 迁移完成');
        } catch (error) {
            console.error('MigrationManager: 迁移失败:', error);
            throw new Error(`数据迁移失败: ${error.message}`);
        }
    }

    /**
     * 创建迁移备份
     */
    private async createMigrationBackup(adapter: any): Promise<void> {
        const backupPath = `${this.dataPath}/migration-backup-${Date.now()}`;
        
        try {
            // 备份现有数据文件
            const filesToBackup = ['terms.json', 'relations.json', 'version.json'];
            
            for (const file of filesToBackup) {
                const sourcePath = `${this.dataPath}/${file}`;
                const backupFilePath = `${backupPath}/${file}`;
                
                if (await adapter.exists(sourcePath)) {
                    const data = await adapter.read(sourcePath);
                    await adapter.write(backupFilePath, data);
                }
            }
            
            console.log(`MigrationManager: 迁移备份已创建: ${backupPath}`);
        } catch (error) {
            console.error('MigrationManager: 创建备份失败:', error);
            throw error;
        }
    }

    /**
     * 比较版本号
     */
    private compareVersions(version1: string, version2: string): number {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        const maxLength = Math.max(v1Parts.length, v2Parts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }
        
        return 0;
    }

    /**
     * 创建初始数据结构 (v1.0.0)
     */
    private async createInitialStructure(adapter: any): Promise<void> {
        // 确保基础目录存在
        if (!await adapter.exists(this.dataPath)) {
            await adapter.mkdir(this.dataPath);
        }
        
        // 创建空的数据文件
        const termsPath = `${this.dataPath}/terms.json`;
        if (!await adapter.exists(termsPath)) {
            await adapter.write(termsPath, '[]');
        }
        
        const relationsPath = `${this.dataPath}/relations.json`;
        if (!await adapter.exists(relationsPath)) {
            await adapter.write(relationsPath, '[]');
        }
        
        // 创建配置文件
        const configPath = `${this.dataPath}/config.json`;
        if (!await adapter.exists(configPath)) {
            const defaultConfig = {
                autoCleanup: true,
                maxBackups: 10,
                compressionEnabled: false
            };
            await adapter.write(configPath, JSON.stringify(defaultConfig, null, 2));
        }
    }

    /**
     * 添加使用频率统计 (v1.1.0)
     */
    private async addUsageStatistics(adapter: any): Promise<void> {
        const termsPath = `${this.dataPath}/terms.json`;
        
        if (await adapter.exists(termsPath)) {
            const termsData = await adapter.read(termsPath);
            const terms = JSON.parse(termsData);
            
            // 为每个术语添加使用统计字段
            const updatedTerms = terms.map((term: any) => ({
                ...term,
                usageCount: term.usageCount || 0,
                lastUsed: term.lastUsed || term.createdAt,
                usageHistory: term.usageHistory || []
            }));
            
            await adapter.write(termsPath, JSON.stringify(updatedTerms, null, 2));
        }
        
        // 创建统计数据文件
        const statsPath = `${this.dataPath}/statistics.json`;
        if (!await adapter.exists(statsPath)) {
            const defaultStats = {
                totalSearches: 0,
                totalRecognitions: 0,
                categoryUsage: {},
                dailyStats: {}
            };
            await adapter.write(statsPath, JSON.stringify(defaultStats, null, 2));
        }
    }

    /**
     * 优化关系存储结构 (v1.2.0)
     */
    private async optimizeRelationStorage(adapter: any): Promise<void> {
        const relationsPath = `${this.dataPath}/relations.json`;
        
        if (await adapter.exists(relationsPath)) {
            const relationsData = await adapter.read(relationsPath);
            const relations = JSON.parse(relationsData);
            
            // 优化关系数据结构
            const optimizedRelations = relations.map((relation: any) => ({
                ...relation,
                // 添加索引字段以提高查询性能
                sourceIndex: relation.sourceTermId,
                targetIndex: relation.targetTermId,
                // 添加权重衰减机制
                decayFactor: relation.decayFactor || 0.95,
                // 添加上下文信息
                contextHash: this.generateContextHash(relation.noteIds || [])
            }));
            
            await adapter.write(relationsPath, JSON.stringify(optimizedRelations, null, 2));
        }
        
        // 创建关系索引文件
        const indexPath = `${this.dataPath}/relation-index.json`;
        if (!await adapter.exists(indexPath)) {
            await this.rebuildRelationIndex(adapter);
        }
    }

    /**
     * 重建关系索引
     */
    private async rebuildRelationIndex(adapter: any): Promise<void> {
        const relationsPath = `${this.dataPath}/relations.json`;
        const indexPath = `${this.dataPath}/relation-index.json`;
        
        if (await adapter.exists(relationsPath)) {
            const relationsData = await adapter.read(relationsPath);
            const relations = JSON.parse(relationsData);
            
            const index: { [termId: string]: string[] } = {};
            
            for (const relation of relations) {
                // 为源术语建立索引
                if (!index[relation.sourceTermId]) {
                    index[relation.sourceTermId] = [];
                }
                index[relation.sourceTermId].push(relation.id);
                
                // 为目标术语建立索引
                if (!index[relation.targetTermId]) {
                    index[relation.targetTermId] = [];
                }
                index[relation.targetTermId].push(relation.id);
            }
            
            await adapter.write(indexPath, JSON.stringify(index, null, 2));
        }
    }

    /**
     * 生成上下文哈希
     */
    private generateContextHash(noteIds: string[]): string {
        if (noteIds.length === 0) return '';
        
        const sortedIds = noteIds.sort();
        const combined = sortedIds.join('|');
        
        // 简单哈希函数
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * 回滚到指定版本
     */
    async rollback(targetVersion: string): Promise<void> {
        console.log(`MigrationManager: 开始回滚到版本 ${targetVersion}`);
        
        const adapter = this.plugin.app.vault.adapter;
        const currentVersion = await this.getCurrentVersion(adapter);
        
        if (this.compareVersions(targetVersion, currentVersion) >= 0) {
            throw new Error('目标版本不能高于或等于当前版本');
        }
        
        // 创建回滚备份
        await this.createMigrationBackup(adapter);
        
        try {
            // 执行回滚迁移
            const migrationsToRollback = this.migrations
                .filter(migration => 
                    this.compareVersions(targetVersion, migration.version) < 0 &&
                    this.compareVersions(migration.version, currentVersion) <= 0
                )
                .reverse(); // 反向执行
            
            for (const migration of migrationsToRollback) {
                if (migration.down) {
                    console.log(`MigrationManager: 回滚迁移 ${migration.version}`);
                    await migration.down(adapter);
                } else {
                    console.warn(`MigrationManager: 迁移 ${migration.version} 没有回滚方法`);
                }
            }
            
            // 更新版本信息
            await this.saveVersion(adapter, targetVersion);
            
            console.log('MigrationManager: 回滚完成');
        } catch (error) {
            console.error('MigrationManager: 回滚失败:', error);
            throw new Error(`数据回滚失败: ${error.message}`);
        }
    }
}