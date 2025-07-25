import { App, Plugin, Notice, Editor } from 'obsidian';
import { MathMemoryGraphSettings } from '../types/settings';
import { TERM_MANAGEMENT_VIEW_TYPE } from '../ui';
import MathMemoryGraphPlugin from '../../main';

/**
 * 命令管理器 - 负责注册和管理所有插件命令
 */
export class CommandManager {
    private app: App;
    private plugin: Plugin;
    private settings: MathMemoryGraphSettings;

    constructor(app: App, plugin: Plugin, settings: MathMemoryGraphSettings) {
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
    }

    /**
     * 注册所有命令
     */
    registerCommands(): void {
        console.log('CommandManager: 注册插件命令...');

        // 注册数学输入相关命令
        this.registerMathInputCommands();
        
        // 注册图谱相关命令
        this.registerGraphCommands();
        
        // 注册术语识别相关命令
        this.registerRecognitionCommands();
        
        // 注册LaTeX相关命令
        this.registerLaTeXCommands();
        
        // 注册术语管理命令
        this.registerTermManagementCommands();
        
        // 注册工具命令
        this.registerUtilityCommands();

        console.log('CommandManager: 所有命令注册完成');
    }

    /**
     * 更新设置引用
     */
    updateSettings(newSettings: MathMemoryGraphSettings): void {
        this.settings = newSettings;
    }

    /**
     * 注册数学输入相关命令
     */
    private registerMathInputCommands(): void {
        // 切换数学输入模式
        this.plugin.addCommand({
            id: 'toggle-math-input',
            name: '切换数学输入模式',
            icon: 'calculator',
            callback: () => {
                this.toggleMathInput();
            },
            hotkeys: [
                {
                    modifiers: ['Ctrl'],
                    key: 'm'
                }
            ]
        });

        // 插入数学公式模板
        this.plugin.addCommand({
            id: 'insert-math-template',
            name: '插入数学公式模板',
            icon: 'formula',
            editorCallback: (editor: Editor) => {
                this.insertMathTemplate(editor);
            }
        });

        // 智能数学补全
        this.plugin.addCommand({
            id: 'smart-math-completion',
            name: '智能数学补全',
            icon: 'zap',
            editorCallback: (editor: Editor) => {
                this.triggerSmartCompletion(editor);
            }
        });
    }

    /**
     * 注册图谱相关命令
     */
    private registerGraphCommands(): void {
        // 打开知识图谱视图
        this.plugin.addCommand({
            id: 'open-graph-view',
            name: '打开数学知识图谱',
            icon: 'git-branch',
            callback: () => {
                this.openGraphView();
            },
            hotkeys: [
                {
                    modifiers: ['Ctrl', 'Shift'],
                    key: 'g'
                }
            ]
        });

        // 聚焦当前术语
        this.plugin.addCommand({
            id: 'focus-current-term',
            name: '在图谱中聚焦当前术语',
            icon: 'target',
            editorCallback: (editor: Editor) => {
                this.focusCurrentTerm(editor);
            }
        });

        // 导出图谱
        this.plugin.addCommand({
            id: 'export-graph',
            name: '导出数学知识图谱',
            icon: 'download',
            callback: () => {
                this.exportGraph();
            }
        });
    }

    /**
     * 注册术语识别相关命令
     */
    private registerRecognitionCommands(): void {
        // 识别当前文档中的数学术语
        this.plugin.addCommand({
            id: 'recognize-terms',
            name: '识别数学术语',
            icon: 'search',
            callback: () => {
                this.recognizeTermsInCurrentNote();
            },
            hotkeys: [
                {
                    modifiers: ['Ctrl', 'Shift'],
                    key: 'r'
                }
            ]
        });

        // 手动添加术语
        this.plugin.addCommand({
            id: 'add-custom-term',
            name: '添加自定义术语',
            icon: 'plus',
            editorCallback: (editor: Editor) => {
                this.addCustomTerm(editor);
            }
        });

        // 批量识别所有笔记
        this.plugin.addCommand({
            id: 'batch-recognize-all',
            name: '批量识别所有笔记中的术语',
            icon: 'layers',
            callback: () => {
                this.batchRecognizeAllNotes();
            }
        });
    }

    /**
     * 注册LaTeX相关命令
     */
    private registerLaTeXCommands(): void {
        // 转换选中文本为LaTeX
        this.plugin.addCommand({
            id: 'convert-to-latex',
            name: '转换为LaTeX代码',
            icon: 'code',
            editorCallback: (editor: Editor) => {
                this.convertSelectionToLaTeX(editor);
            }
        });

        // 预览LaTeX渲染
        this.plugin.addCommand({
            id: 'preview-latex',
            name: '预览LaTeX渲染',
            icon: 'eye',
            editorCallback: (editor: Editor) => {
                this.previewLaTeX(editor);
            }
        });

        // 复制LaTeX代码
        this.plugin.addCommand({
            id: 'copy-latex-code',
            name: '复制LaTeX代码',
            icon: 'copy',
            editorCallback: (editor: Editor) => {
                this.copyLaTeXCode(editor);
            }
        });
    }

    /**
     * 注册术语管理命令
     */
    private registerTermManagementCommands(): void {
        // 打开术语管理视图
        this.plugin.addCommand({
            id: 'open-term-management',
            name: '打开术语管理',
            icon: 'list',
            callback: () => {
                this.openTermManagement();
            }
        });

        // 添加新术语
        this.plugin.addCommand({
            id: 'add-new-term',
            name: '添加新术语',
            icon: 'plus-circle',
            callback: () => {
                this.addNewTerm();
            }
        });

        // 搜索术语
        this.plugin.addCommand({
            id: 'search-terms',
            name: '搜索术语',
            icon: 'search',
            callback: () => {
                this.searchTerms();
            }
        });
    }

    /**
     * 注册工具命令
     */
    private registerUtilityCommands(): void {
        // 显示术语统计
        this.plugin.addCommand({
            id: 'show-term-stats',
            name: '显示术语统计',
            icon: 'bar-chart',
            callback: () => {
                this.showTermStatistics();
            }
        });

        // 清理数据库
        this.plugin.addCommand({
            id: 'cleanup-database',
            name: '清理数据库',
            icon: 'trash',
            callback: () => {
                this.cleanupDatabase();
            }
        });

        // 导出数据
        this.plugin.addCommand({
            id: 'export-data',
            name: '导出术语数据',
            icon: 'package',
            callback: () => {
                this.exportData();
            }
        });

        // 导入数据
        this.plugin.addCommand({
            id: 'import-data',
            name: '导入术语数据',
            icon: 'upload',
            callback: () => {
                this.importData();
            }
        });
    }

    // ==================== 命令实现方法 ====================

    private toggleMathInput(): void {
        if (this.settings.enableMathInput) {
            new Notice('数学输入模式已激活');
            console.log('CommandManager: 激活数学输入模式');
            // 具体的数学输入逻辑将在后续任务中实现
        } else {
            new Notice('数学输入模式已禁用，请在设置中启用');
        }
    }

    private insertMathTemplate(editor: Editor): void {
        const cursor = editor.getCursor();
        const templates = [
            '$$\\begin{align}\n\n\\end{align}$$',
            '$\\frac{}{}$',
            '$\\sum_{i=1}^{n}$',
            '$\\int_{a}^{b}$'
        ];
        
        // 这里应该显示模板选择器，目前插入第一个模板
        editor.replaceRange(templates[0], cursor);
        new Notice('已插入数学公式模板');
    }

    private triggerSmartCompletion(editor: Editor): void {
        const cursor = editor.getCursor();
        const currentLine = editor.getLine(cursor.line);
        console.log('CommandManager: 触发智能补全，当前行:', currentLine);
        
        new Notice('智能数学补全功能将在后续版本中实现');
        // 具体的智能补全逻辑将在后续任务中实现
    }

    private openGraphView(): void {
        if (this.settings.enableGraphView) {
            new Notice('正在打开数学知识图谱...');
            console.log('CommandManager: 打开图谱视图');
            // 具体的图谱视图逻辑将在后续任务中实现
        } else {
            new Notice('知识图谱功能已禁用，请在设置中启用');
        }
    }

    private focusCurrentTerm(editor: Editor): void {
        const selection = editor.getSelection();
        if (selection) {
            console.log('CommandManager: 聚焦术语:', selection);
            new Notice(`正在图谱中聚焦术语: ${selection}`);
            // 具体的图谱聚焦逻辑将在后续任务中实现
        } else {
            new Notice('请先选择一个术语');
        }
    }

    private exportGraph(): void {
        new Notice('正在导出知识图谱...');
        console.log('CommandManager: 导出图谱');
        // 具体的图谱导出逻辑将在后续任务中实现
    }

    private async recognizeTermsInCurrentNote(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('请先打开一个笔记文件');
            return;
        }

        if (!this.settings.enableAutoRecognition) {
            new Notice('术语识别功能已禁用，请在设置中启用');
            return;
        }

        try {
            new Notice('正在识别数学术语...');
            console.log('CommandManager: 识别术语，文件:', activeFile.path);
            
            // 获取主插件实例并调用术语识别
            const mainPlugin = this.plugin as MathMemoryGraphPlugin;
            const mainController = (mainPlugin as any).mainController;
            
            if (mainController && mainController.getTermRecognitionEngine) {
                await mainController.recognizeTermsInCurrentNote();
                new Notice('术语识别完成');
            } else {
                new Notice('术语识别引擎未初始化');
            }
        } catch (error) {
            console.error('CommandManager: 术语识别失败:', error);
            new Notice('术语识别失败，请检查控制台错误信息');
        }
    }

    private addCustomTerm(editor: Editor): void {
        const selection = editor.getSelection();
        if (selection) {
            console.log('CommandManager: 添加自定义术语:', selection);
            new Notice(`正在添加自定义术语: ${selection}`);
            // 具体的术语添加逻辑将在后续任务中实现
        } else {
            new Notice('请先选择要添加的术语文本');
        }
    }

    private batchRecognizeAllNotes(): void {
        new Notice('正在批量识别所有笔记中的术语...');
        console.log('CommandManager: 批量识别所有笔记');
        // 具体的批量识别逻辑将在后续任务中实现
    }

    private convertSelectionToLaTeX(editor: Editor): void {
        const selection = editor.getSelection();
        if (selection) {
            console.log('CommandManager: 转换为LaTeX:', selection);
            new Notice(`正在转换为LaTeX: ${selection}`);
            // 具体的LaTeX转换逻辑将在后续任务中实现
        } else {
            new Notice('请先选择要转换的文本');
        }
    }

    private previewLaTeX(editor: Editor): void {
        const selection = editor.getSelection();
        if (selection) {
            console.log('CommandManager: 预览LaTeX:', selection);
            new Notice('正在预览LaTeX渲染...');
            // 具体的LaTeX预览逻辑将在后续任务中实现
        } else {
            new Notice('请先选择LaTeX代码');
        }
    }

    private copyLaTeXCode(editor: Editor): void {
        const selection = editor.getSelection();
        if (selection) {
            navigator.clipboard.writeText(selection).then(() => {
                new Notice('LaTeX代码已复制到剪贴板');
            }).catch(() => {
                new Notice('复制失败');
            });
        } else {
            new Notice('请先选择LaTeX代码');
        }
    }

    private showTermStatistics(): void {
        new Notice('正在生成术语统计...');
        console.log('CommandManager: 显示术语统计');
        // 具体的统计逻辑将在后续任务中实现
    }

    private cleanupDatabase(): void {
        new Notice('正在清理数据库...');
        console.log('CommandManager: 清理数据库');
        // 具体的数据库清理逻辑将在后续任务中实现
    }

    private exportData(): void {
        new Notice('正在导出术语数据...');
        console.log('CommandManager: 导出数据');
        // 具体的数据导出逻辑将在后续任务中实现
    }

    private importData(): void {
        new Notice('正在导入术语数据...');
        console.log('CommandManager: 导入数据');
        // 具体的数据导入逻辑将在后续任务中实现
    }

    // ==================== 术语管理命令实现 ====================

    private async openTermManagement(): Promise<void> {
        try {
            // 检查是否已经有术语管理视图打开
            const existingLeaf = this.app.workspace.getLeavesOfType(TERM_MANAGEMENT_VIEW_TYPE)[0];
            
            if (existingLeaf) {
                // 如果已存在，则激活该视图
                this.app.workspace.revealLeaf(existingLeaf);
            } else {
                // 创建新的术语管理视图
                const leaf = this.app.workspace.getRightLeaf(false);
                await leaf.setViewState({
                    type: TERM_MANAGEMENT_VIEW_TYPE,
                    active: true
                });
                
                // 激活右侧边栏
                this.app.workspace.rightSplit.expand();
            }
            
            new Notice('术语管理界面已打开');
        } catch (error) {
            console.error('CommandManager: 打开术语管理失败:', error);
            new Notice('打开术语管理失败');
        }
    }

    private addNewTerm(): void {
        // 直接调用术语管理视图的添加新术语功能
        const termManagementView = (this.plugin as any).termManagementView;
        if (termManagementView) {
            termManagementView.addNewTerm();
        } else {
            // 如果视图未打开，先打开视图再添加术语
            this.openTermManagement().then(() => {
                const view = (this.plugin as any).termManagementView;
                if (view) {
                    // 延迟一下确保视图完全加载
                    setTimeout(() => view.addNewTerm(), 100);
                }
            });
        }
    }

    private searchTerms(): void {
        // 打开术语管理视图并聚焦搜索框
        this.openTermManagement().then(() => {
            const termManagementView = (this.plugin as any).termManagementView;
            if (termManagementView) {
                // 延迟一下确保视图完全渲染
                setTimeout(() => termManagementView.focusSearch(), 100);
            }
        });
    }
}