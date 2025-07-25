import { App, Plugin, Editor, TFile, MarkdownPostProcessorContext, EventRef } from 'obsidian';
import { MathMemoryGraphSettings } from '../types/settings';

/**
 * 事件管理器 - 负责管理所有插件事件监听和处理
 */
export class EventManager {
    private app: App;
    private plugin: Plugin;
    private settings: MathMemoryGraphSettings;
    private eventRefs: EventRef[] = [];
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(app: App, plugin: Plugin, settings: MathMemoryGraphSettings) {
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
    }

    /**
     * 注册所有事件监听器
     */
    registerEventHandlers(): void {
        console.log('EventManager: 注册事件监听器...');

        // 注册编辑器事件
        this.registerEditorEvents();
        
        // 注册文件系统事件
        this.registerFileSystemEvents();
        
        // 注册工作区事件
        this.registerWorkspaceEvents();
        
        // 注册Markdown处理事件
        this.registerMarkdownEvents();

        console.log('EventManager: 所有事件监听器注册完成');
    }

    /**
     * 注销所有事件监听器
     */
    unregisterEventHandlers(): void {
        console.log('EventManager: 注销事件监听器...');

        // 清理所有事件引用
        this.eventRefs.forEach(ref => {
            this.app.workspace.offref(ref);
        });
        this.eventRefs = [];

        // 清理防抖定时器
        this.debounceTimers.forEach(timer => {
            clearTimeout(timer);
        });
        this.debounceTimers.clear();

        console.log('EventManager: 所有事件监听器已注销');
    }

    /**
     * 更新设置引用
     */
    updateSettings(newSettings: MathMemoryGraphSettings): void {
        this.settings = newSettings;
    }

    /**
     * 注册编辑器事件
     */
    private registerEditorEvents(): void {
        // 监听编辑器内容变化
        const editorChangeRef = this.app.workspace.on('editor-change', (editor: Editor, view) => {
            if (this.settings.enableAutoRecognition) {
                this.debounceTermRecognition('editor-change', () => {
                    this.handleEditorChange(editor, view);
                });
            }
        });
        this.eventRefs.push(editorChangeRef);

        // 监听编辑器选择变化
        const selectionChangeRef = this.app.workspace.on('editor-change', (editor: Editor) => {
            this.handleSelectionChange(editor);
        });
        this.eventRefs.push(selectionChangeRef);

        console.log('EventManager: 编辑器事件已注册');
    }

    /**
     * 注册文件系统事件
     */
    private registerFileSystemEvents(): void {
        // 监听文件打开事件
        const fileOpenRef = this.app.workspace.on('file-open', (file: TFile | null) => {
            if (file && this.settings.enableAutoRecognition) {
                this.handleFileOpen(file);
            }
        });
        this.eventRefs.push(fileOpenRef);

        // 监听文件重命名事件
        const fileRenameRef = this.app.vault.on('rename', (file, oldPath) => {
            this.handleFileRename(file, oldPath);
        });
        this.eventRefs.push(fileRenameRef);

        // 监听文件删除事件
        const fileDeleteRef = this.app.vault.on('delete', (file) => {
            this.handleFileDelete(file);
        });
        this.eventRefs.push(fileDeleteRef);

        console.log('EventManager: 文件系统事件已注册');
    }

    /**
     * 注册工作区事件
     */
    private registerWorkspaceEvents(): void {
        // 监听活动叶子变化
        const activeLeafChangeRef = this.app.workspace.on('active-leaf-change', (leaf) => {
            this.handleActiveLeafChange(leaf);
        });
        this.eventRefs.push(activeLeafChangeRef);

        // 监听布局变化
        const layoutChangeRef = this.app.workspace.on('layout-change', () => {
            this.handleLayoutChange();
        });
        this.eventRefs.push(layoutChangeRef);

        console.log('EventManager: 工作区事件已注册');
    }

    /**
     * 注册Markdown处理事件
     */
    private registerMarkdownEvents(): void {
        // 注册Markdown后处理器
        this.plugin.registerMarkdownPostProcessor((element: HTMLElement, context: MarkdownPostProcessorContext) => {
            this.handleMarkdownPostProcess(element, context);
        });

        console.log('EventManager: Markdown事件已注册');
    }

    // ==================== 事件处理方法 ====================

    /**
     * 处理编辑器内容变化
     */
    private handleEditorChange(editor: Editor, view: any): void {
        console.log('EventManager: 处理编辑器变化');
        
        // 获取当前内容
        const content = editor.getValue();
        const cursor = editor.getCursor();
        
        // 检查是否需要触发术语识别
        if (content.length > 0 && this.shouldTriggerRecognition(content, cursor)) {
            this.triggerTermRecognition(editor, content);
        }
    }

    /**
     * 处理选择变化
     */
    private handleSelectionChange(editor: Editor): void {
        const selection = editor.getSelection();
        if (selection && selection.length > 0) {
            console.log('EventManager: 选择变化:', selection);
            // 这里可以实现选择文本的实时术语检查
        }
    }

    /**
     * 处理文件打开
     */
    private handleFileOpen(file: TFile): void {
        console.log('EventManager: 文件打开:', file.path);
        
        // 检查文件类型
        if (file.extension === 'md') {
            this.debounceTermRecognition('file-open', () => {
                this.processFileForTerms(file);
            });
        }
    }

    /**
     * 处理文件重命名
     */
    private handleFileRename(file: any, oldPath: string): void {
        console.log('EventManager: 文件重命名:', oldPath, '->', file.path);
        
        // 更新数据库中的文件路径引用
        // 具体实现将在后续任务中完成
    }

    /**
     * 处理文件删除
     */
    private handleFileDelete(file: any): void {
        console.log('EventManager: 文件删除:', file.path);
        
        // 清理相关的术语关系数据
        // 具体实现将在后续任务中完成
    }

    /**
     * 处理活动叶子变化
     */
    private handleActiveLeafChange(leaf: any): void {
        console.log('EventManager: 活动叶子变化');
        
        // 更新当前上下文
        // 具体实现将在后续任务中完成
    }

    /**
     * 处理布局变化
     */
    private handleLayoutChange(): void {
        console.log('EventManager: 布局变化');
        
        // 重新调整图谱视图等UI组件
        // 具体实现将在后续任务中完成
    }

    /**
     * 处理Markdown后处理
     */
    private handleMarkdownPostProcess(element: HTMLElement, context: MarkdownPostProcessorContext): void {
        console.log('EventManager: Markdown后处理，源路径:', context.sourcePath);
        
        // 处理数学公式渲染
        this.processMathElements(element, context);
        
        // 处理术语高亮
        this.processTermHighlighting(element, context);
    }

    // ==================== 辅助方法 ====================

    /**
     * 防抖处理
     */
    private debounceTermRecognition(key: string, callback: () => void, delay: number = 500): void {
        // 清除之前的定时器
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key)!);
        }

        // 设置新的定时器
        const timer = setTimeout(() => {
            callback();
            this.debounceTimers.delete(key);
        }, delay);

        this.debounceTimers.set(key, timer);
    }

    /**
     * 判断是否应该触发识别
     */
    private shouldTriggerRecognition(content: string, cursor: any): boolean {
        // 检查内容长度
        if (content.length < 10) {
            return false;
        }

        // 检查是否在代码块中
        const currentLine = content.split('\n')[cursor.line];
        if (currentLine && (currentLine.includes('```') || currentLine.includes('`'))) {
            return false;
        }

        return true;
    }

    /**
     * 触发术语识别
     */
    private triggerTermRecognition(editor: Editor, content: string): void {
        console.log('EventManager: 触发术语识别，内容长度:', content.length);
        
        // 这里将在后续任务中实现具体的术语识别逻辑
        // 目前只是占位符，确保架构完整性
    }

    /**
     * 处理文件中的术语
     */
    private processFileForTerms(file: TFile): void {
        console.log('EventManager: 处理文件术语:', file.path);
        
        // 这里将在后续任务中实现具体的文件术语处理逻辑
        // 目前只是占位符，确保架构完整性
    }

    /**
     * 处理数学元素
     */
    private processMathElements(element: HTMLElement, context: MarkdownPostProcessorContext): void {
        // 查找数学公式元素
        const mathElements = element.querySelectorAll('.math, .math-block');
        
        mathElements.forEach(mathEl => {
            console.log('EventManager: 处理数学元素:', mathEl.textContent);
            // 这里将在后续任务中实现具体的数学元素处理逻辑
        });
    }

    /**
     * 处理术语高亮
     */
    private processTermHighlighting(element: HTMLElement, context: MarkdownPostProcessorContext): void {
        // 这里将在后续任务中实现术语高亮逻辑
        console.log('EventManager: 处理术语高亮');
    }
}