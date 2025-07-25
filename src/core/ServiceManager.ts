import { App, Plugin } from 'obsidian';
import { MathMemoryGraphSettings } from '../types/settings';
import { DatabaseManager, MigrationManager, DataAccessLayer } from '../storage';
import { TermManagementView, TERM_MANAGEMENT_VIEW_TYPE } from '../ui';
import { IDatabaseManager } from '../interfaces/core';

/**
 * 服务管理器 - 负责管理和协调各个功能模块
 */
export class ServiceManager {
    private app: App;
    private plugin: Plugin;
    private settings: MathMemoryGraphSettings;
    private services: Map<string, any> = new Map();
    private isInitialized: boolean = false;

    constructor(app: App, plugin: Plugin, settings: MathMemoryGraphSettings) {
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
    }

    /**
     * 初始化所有服务
     */
    async initialize(): Promise<void> {
        console.log('ServiceManager: 开始初始化服务...');

        try {
            // 按依赖顺序初始化服务
            await this.initializeDataServices();
            await this.initializeRecognitionServices();
            await this.initializeLaTeXServices();
            await this.initializeUIServices();

            this.isInitialized = true;
            console.log('ServiceManager: 所有服务初始化完成');
        } catch (error) {
            console.error('ServiceManager: 服务初始化失败:', error);
            throw error;
        }
    }

    /**
     * 销毁所有服务
     */
    async destroy(): Promise<void> {
        console.log('ServiceManager: 开始销毁服务...');

        try {
            // 按相反顺序销毁服务
            await this.destroyUIServices();
            await this.destroyLaTeXServices();
            await this.destroyRecognitionServices();
            await this.destroyDataServices();

            this.services.clear();
            this.isInitialized = false;
            console.log('ServiceManager: 所有服务已销毁');
        } catch (error) {
            console.error('ServiceManager: 服务销毁过程中出现错误:', error);
        }
    }

    /**
     * 获取指定服务
     */
    getService<T>(serviceName: string): T | null {
        return this.services.get(serviceName) || null;
    }

    /**
     * 注册服务
     */
    registerService(serviceName: string, service: any): void {
        this.services.set(serviceName, service);
        console.log(`ServiceManager: 服务 ${serviceName} 已注册`);
    }

    /**
     * 注销服务
     */
    unregisterService(serviceName: string): void {
        if (this.services.has(serviceName)) {
            this.services.delete(serviceName);
            console.log(`ServiceManager: 服务 ${serviceName} 已注销`);
        }
    }

    /**
     * 检查服务是否已初始化
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 获取数据库管理器
     */
    getDatabaseManager(): IDatabaseManager | null {
        return this.getService<IDatabaseManager>('databaseManager');
    }

    /**
     * 更新设置并通知相关服务
     */
    async updateSettings(newSettings: MathMemoryGraphSettings): Promise<void> {
        const oldSettings = this.settings;
        this.settings = newSettings;

        // 通知各个服务设置已更新
        await this.notifySettingsChanged(oldSettings, newSettings);
    }

    /**
     * 初始化数据服务
     */
    private async initializeDataServices(): Promise<void> {
        console.log('ServiceManager: 初始化数据服务...');
        
        try {
            // 初始化数据迁移管理器
            const migrationManager = new MigrationManager(this.app, this.plugin, 'math-memory-graph');
            await migrationManager.migrate();
            this.registerService('migrationManager', migrationManager);
            
            // 初始化数据库管理器
            const databaseManager = new DatabaseManager(this.app, this.plugin);
            await databaseManager.initialize();
            this.registerService('databaseManager', databaseManager);
            
            // 初始化数据访问层
            const dataAccessLayer = new DataAccessLayer(databaseManager);
            this.registerService('dataAccessLayer', dataAccessLayer);
            
            console.log('ServiceManager: 数据服务初始化完成');
        } catch (error) {
            console.error('ServiceManager: 数据服务初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化识别服务
     */
    private async initializeRecognitionServices(): Promise<void> {
        console.log('ServiceManager: 初始化术语识别服务...');
        
        // 这里将在后续任务中实现具体的术语识别引擎初始化
        // 目前只是占位符，确保架构完整性
        
        console.log('ServiceManager: 术语识别服务初始化完成');
    }

    /**
     * 初始化LaTeX服务
     */
    private async initializeLaTeXServices(): Promise<void> {
        console.log('ServiceManager: 初始化LaTeX服务...');
        
        // 检查LaTeX渲染器设置
        const renderer = this.settings.latexRenderer;
        console.log(`ServiceManager: 使用 ${renderer} 作为LaTeX渲染器`);
        
        // 这里将在后续任务中实现具体的LaTeX转换器初始化
        // 目前只是占位符，确保架构完整性
        
        console.log('ServiceManager: LaTeX服务初始化完成');
    }

    /**
     * 初始化UI服务
     */
    private async initializeUIServices(): Promise<void> {
        console.log('ServiceManager: 初始化UI服务...');
        
        try {
            // 注册术语管理视图
            this.plugin.registerView(
                TERM_MANAGEMENT_VIEW_TYPE,
                (leaf) => new TermManagementView(leaf, this.plugin as any)
            );
            
            console.log('ServiceManager: 术语管理视图已注册');
            
            // 这里将在后续任务中实现具体的图谱可视化器和智能输入法初始化
            // 目前只是占位符，确保架构完整性
            
            console.log('ServiceManager: UI服务初始化完成');
        } catch (error) {
            console.error('ServiceManager: UI服务初始化失败:', error);
            throw error;
        }
    }

    /**
     * 销毁数据服务
     */
    private async destroyDataServices(): Promise<void> {
        console.log('ServiceManager: 销毁数据服务...');
        // 具体实现将在后续任务中完成
    }

    /**
     * 销毁识别服务
     */
    private async destroyRecognitionServices(): Promise<void> {
        console.log('ServiceManager: 销毁术语识别服务...');
        // 具体实现将在后续任务中完成
    }

    /**
     * 销毁LaTeX服务
     */
    private async destroyLaTeXServices(): Promise<void> {
        console.log('ServiceManager: 销毁LaTeX服务...');
        // 具体实现将在后续任务中完成
    }

    /**
     * 销毁UI服务
     */
    private async destroyUIServices(): Promise<void> {
        console.log('ServiceManager: 销毁UI服务...');
        // 具体实现将在后续任务中完成
    }

    /**
     * 通知设置变更
     */
    private async notifySettingsChanged(
        oldSettings: MathMemoryGraphSettings,
        newSettings: MathMemoryGraphSettings
    ): Promise<void> {
        console.log('ServiceManager: 通知设置变更...');
        
        // 检查关键设置的变更
        if (oldSettings.enableAutoRecognition !== newSettings.enableAutoRecognition) {
            console.log('ServiceManager: 自动识别设置已变更');
        }
        
        if (oldSettings.latexRenderer !== newSettings.latexRenderer) {
            console.log('ServiceManager: LaTeX渲染器设置已变更');
        }
        
        if (oldSettings.graphLayout !== newSettings.graphLayout) {
            console.log('ServiceManager: 图谱布局设置已变更');
        }
        
        // 这里将在后续任务中实现具体的设置变更通知逻辑
    }
}