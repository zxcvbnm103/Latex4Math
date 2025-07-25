import { App, Plugin, Notice } from 'obsidian';
import { IMainController } from '../interfaces/core';
import { MathMemoryGraphSettings } from '../types';
import { TermRecognitionEngine } from '../recognition';
import { NeuralLatexConverter, LaTeXPreviewWidget, LaTeXCopyHelper } from '../latex';
import { SmartMathInput } from '../input';

/**
 * 主控制器 - 负责插件的生命周期管理和模块协调
 */
export class MainController implements IMainController {
    private app: App;
    private plugin: Plugin;
    private settings: MathMemoryGraphSettings;
    private termRecognitionEngine: TermRecognitionEngine;
    private neuralLatexConverter: NeuralLatexConverter;
    private latexPreviewWidget: LaTeXPreviewWidget;
    private latexCopyHelper: LaTeXCopyHelper;
    private smartMathInput: SmartMathInput | null = null;
    private isInitialized: boolean = false;

    constructor(app: App, plugin: Plugin, settings: MathMemoryGraphSettings) {
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
        this.termRecognitionEngine = new TermRecognitionEngine(app);
        
        // 初始化LaTeX相关组件
        this.neuralLatexConverter = new NeuralLatexConverter(app);
        this.latexPreviewWidget = new LaTeXPreviewWidget(app, this.neuralLatexConverter);
        this.latexCopyHelper = new LaTeXCopyHelper(app, this.neuralLatexConverter);
    }

    async onload(): Promise<void> {
        console.log('MainController: 开始加载插件核心模块...');
        
        try {
            // 初始化核心服务
            await this.initializeCoreServices();
            
            // 注册事件处理器
            this.registerEventHandlers();
            
            // 设置插件状态
            this.isInitialized = true;
            
            console.log('MainController: 插件核心模块加载完成');
        } catch (error) {
            console.error('MainController: 插件加载失败:', error);
            new Notice('数学记忆图谱插件加载失败，请检查控制台错误信息');
            throw error;
        }
    }

    onunload(): void {
        console.log('MainController: 开始卸载插件核心模块...');
        
        try {
            // 清理资源
            this.cleanup();
            
            // 重置状态
            this.isInitialized = false;
            
            console.log('MainController: 插件核心模块卸载完成');
        } catch (error) {
            console.error('MainController: 插件卸载过程中出现错误:', error);
        }
    }

    async loadSettings(): Promise<void> {
        // 设置加载逻辑已在主插件类中处理
        console.log('MainController: 设置已加载');
    }

    async saveSettings(): Promise<void> {
        // 设置保存逻辑已在主插件类中处理
        console.log('MainController: 设置已保存');
    }

    registerEventHandlers(): void {
        console.log('MainController: 注册事件处理器');
        
        // 这里将在后续任务中实现具体的事件处理逻辑
        // 目前只是占位符，确保架构完整性
    }

    /**
     * 获取插件初始化状态
     */
    public isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 获取当前设置
     */
    public getSettings(): MathMemoryGraphSettings {
        return this.settings;
    }

    /**
     * 更新设置
     */
    public updateSettings(newSettings: MathMemoryGraphSettings): void {
        this.settings = newSettings;
    }

    /**
     * 获取术语识别引擎
     */
    public getTermRecognitionEngine(): TermRecognitionEngine {
        return this.termRecognitionEngine;
    }

    /**
     * 获取神经网络LaTeX转换器
     */
    public getNeuralLatexConverter(): NeuralLatexConverter {
        return this.neuralLatexConverter;
    }

    /**
     * 获取LaTeX预览小部件
     */
    public getLatexPreviewWidget(): LaTeXPreviewWidget {
        return this.latexPreviewWidget;
    }

    /**
     * 获取LaTeX复制助手
     */
    public getLatexCopyHelper(): LaTeXCopyHelper {
        return this.latexCopyHelper;
    }

    /**
     * 获取智能数学输入系统
     */
    public getSmartMathInput(): SmartMathInput | null {
        return this.smartMathInput;
    }

    /**
     * 激活智能数学输入模式
     */
    public activateSmartMathInput(): void {
        if (!this.isInitialized) {
            console.warn('MainController: 插件未初始化，无法激活智能输入');
            return;
        }

        if (!this.smartMathInput) {
            console.warn('MainController: 智能输入系统未初始化');
            return;
        }

        const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
        if (!activeView) {
            new Notice('请先打开一个Markdown文档');
            return;
        }

        this.smartMathInput.activate((activeView as any).editor);
        new Notice('🧠 AI智能数学输入已激活');
    }

    /**
     * 停用智能数学输入模式
     */
    public deactivateSmartMathInput(): void {
        if (this.smartMathInput) {
            this.smartMathInput.deactivate();
            new Notice('⏹️ AI智能数学输入已停用');
        }
    }

    /**
     * 切换智能数学输入模式
     */
    public toggleSmartMathInput(): void {
        if (!this.smartMathInput) {
            console.warn('MainController: 智能输入系统未初始化');
            return;
        }

        // 检查当前状态（通过私有属性，这里简化处理）
        const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
        if (!activeView) {
            new Notice('请先打开一个Markdown文档');
            return;
        }

        // 简化的切换逻辑
        try {
            this.smartMathInput.activate((activeView as any).editor);
            new Notice('🧠 AI智能数学输入已激活');
        } catch (error) {
            this.smartMathInput.deactivate();
            new Notice('⏹️ AI智能数学输入已停用');
        }
    }

    /**
     * 手动触发术语识别
     */
    public async recognizeTermsInCurrentNote(): Promise<void> {
        if (!this.isInitialized) {
            console.warn('MainController: 插件未初始化');
            return;
        }

        try {
            await this.termRecognitionEngine.markTermsInCurrentNote();
        } catch (error) {
            console.error('MainController: 术语识别失败:', error);
            new Notice('术语识别失败，请检查控制台错误信息');
        }
    }

    /**
     * 初始化核心服务
     */
    private async initializeCoreServices(): Promise<void> {
        console.log('MainController: 初始化核心服务...');
        
        // 验证Obsidian环境
        this.validateObsidianEnvironment();
        
        // 初始化数据存储
        await this.initializeDataStorage();
        
        // 初始化术语识别引擎
        await this.initializeTermRecognition();
        
        // 初始化LaTeX支持
        this.initializeLaTeXSupport();
        
        // 初始化智能数学输入系统
        await this.initializeSmartMathInput();
        
        console.log('MainController: 核心服务初始化完成');
    }

    /**
     * 验证Obsidian环境
     */
    private validateObsidianEnvironment(): void {
        if (!this.app) {
            throw new Error('Obsidian App实例不可用');
        }
        
        if (!this.app.workspace) {
            throw new Error('Obsidian Workspace不可用');
        }
        
        console.log('MainController: Obsidian环境验证通过');
    }

    /**
     * 初始化数据存储
     */
    private async initializeDataStorage(): Promise<void> {
        console.log('MainController: 初始化数据存储...');
        
        // 检查数据目录
        const dataDir = this.plugin.manifest.dir;
        if (!dataDir) {
            console.warn('MainController: 无法获取插件数据目录');
        }
        
        // 这里将在后续任务中实现具体的数据库初始化逻辑
        console.log('MainController: 数据存储初始化完成');
    }

    /**
     * 初始化术语识别引擎
     */
    private async initializeTermRecognition(): Promise<void> {
        console.log('MainController: 初始化术语识别引擎...');
        
        try {
            await this.termRecognitionEngine.initialize();
            console.log('MainController: 术语识别引擎初始化完成');
        } catch (error) {
            console.error('MainController: 术语识别引擎初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化LaTeX支持
     */
    private initializeLaTeXSupport(): void {
        console.log('MainController: 初始化LaTeX渲染支持...');
        
        // 检查Obsidian内置的MathJax支持
        if (typeof window !== 'undefined' && (window as any).MathJax) {
            console.log('MainController: 检测到MathJax支持');
        } else {
            console.log('MainController: 使用Obsidian内置数学渲染');
        }
        
        console.log('MainController: LaTeX支持初始化完成');
    }

    /**
     * 初始化智能数学输入系统
     */
    private async initializeSmartMathInput(): Promise<void> {
        console.log('MainController: 初始化AI智能数学输入系统...');
        
        try {
            // 检查设置中是否启用了智能输入
            if (!this.settings.enableMathInput) {
                console.log('MainController: 智能数学输入功能已禁用');
                return;
            }

            // 确保依赖组件已初始化
            if (!this.neuralLatexConverter) {
                throw new Error('神经网络LaTeX转换器未初始化');
            }
            
            if (!this.termRecognitionEngine) {
                throw new Error('术语识别引擎未初始化');
            }

            // 创建智能输入系统实例
            this.smartMathInput = new SmartMathInput(
                this.app,
                this.neuralLatexConverter,
                this.termRecognitionEngine
            );

            console.log('✅ MainController: AI智能数学输入系统初始化完成');
        } catch (error) {
            console.error('MainController: 智能数学输入系统初始化失败:', error);
            // 不抛出错误，允许插件在没有智能输入的情况下继续运行
            this.smartMathInput = null;
        }
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        console.log('MainController: 清理资源...');
        
        // 清理术语识别引擎
        if (this.termRecognitionEngine) {
            this.termRecognitionEngine.cleanup();
        }
        
        // 清理LaTeX相关组件
        if (this.neuralLatexConverter) {
            this.neuralLatexConverter.unload();
        }
        
        if (this.latexPreviewWidget) {
            this.latexPreviewWidget.unload();
        }
        
        console.log('MainController: 资源清理完成');
    }
}