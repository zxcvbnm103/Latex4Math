import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import { MathMemoryGraphSettings, SettingsValidator } from './src/types/settings';
import { MainController } from './src/core/MainController';
import { ServiceManager } from './src/core/ServiceManager';
import { CommandManager } from './src/core/CommandManager';
import { EventManager } from './src/core/EventManager';

export default class MathMemoryGraphPlugin extends Plugin {
	settings: MathMemoryGraphSettings;
	
	// 核心管理器
	private mainController: MainController;
	private serviceManager: ServiceManager;
	private commandManager: CommandManager;
	private eventManager: EventManager;

	async onload() {
		console.log('数学记忆图谱插件加载中...');
		
		try {
			// 加载设置
			await this.loadSettings();
			
			// 验证设置
			const validation = SettingsValidator.validate(this.settings);
			if (!validation.isValid) {
				console.warn('设置验证失败:', validation.errors);
				new Notice('插件设置存在问题，请检查设置面板');
			}
			
			// 加载样式
			this.loadStyles();
			
			// 初始化核心管理器
			await this.initializeManagers();
			
			// 添加设置面板
			this.addSettingTab(new MathMemoryGraphSettingTab(this.app, this));
			
			new Notice('数学记忆图谱插件已加载');
			console.log('数学记忆图谱插件加载完成');
		} catch (error) {
			console.error('插件加载失败:', error);
			new Notice('数学记忆图谱插件加载失败，请检查控制台错误信息');
		}
	}

	async onunload() {
		console.log('数学记忆图谱插件卸载中...');
		
		try {
			// 按相反顺序清理管理器
			await this.cleanupManagers();
			
			console.log('数学记忆图谱插件已卸载');
		} catch (error) {
			console.error('插件卸载过程中出现错误:', error);
		}
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = SettingsValidator.merge(loadedData || {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		// 通知管理器设置已更新
		if (this.serviceManager) {
			await this.serviceManager.updateSettings(this.settings);
		}
		if (this.commandManager) {
			this.commandManager.updateSettings(this.settings);
		}
		if (this.eventManager) {
			this.eventManager.updateSettings(this.settings);
		}
		if (this.mainController) {
			this.mainController.updateSettings(this.settings);
		}
	}

	/**
	 * 初始化所有管理器
	 */
	private async initializeManagers(): Promise<void> {
		console.log('初始化核心管理器...');

		// 初始化主控制器
		this.mainController = new MainController(this.app, this, this.settings);
		await this.mainController.onload();

		// 初始化服务管理器
		this.serviceManager = new ServiceManager(this.app, this, this.settings);
		await this.serviceManager.initialize();

		// 初始化命令管理器
		this.commandManager = new CommandManager(this.app, this, this.settings);
		this.commandManager.registerCommands();

		// 初始化事件管理器
		this.eventManager = new EventManager(this.app, this, this.settings);
		this.eventManager.registerEventHandlers();

		console.log('所有核心管理器初始化完成');
	}

	/**
	 * 清理所有管理器
	 */
	private async cleanupManagers(): Promise<void> {
		console.log('清理核心管理器...');

		// 按相反顺序清理
		if (this.eventManager) {
			this.eventManager.unregisterEventHandlers();
		}

		if (this.serviceManager) {
			await this.serviceManager.destroy();
		}

		if (this.mainController) {
			this.mainController.onunload();
		}

		console.log('所有核心管理器已清理');
	}

	/**
	 * 获取服务管理器（供其他模块使用）
	 */
	public getServiceManager(): ServiceManager {
		return this.serviceManager;
	}

	/**
	 * 检查插件是否已准备就绪
	 */
	public isReady(): boolean {
		return this.mainController?.isReady() && this.serviceManager?.isReady();
	}

	/**
	 * 加载插件样式
	 */
	private loadStyles(): void {
		// 动态加载CSS样式
		const styleEl = document.createElement('style');
		styleEl.id = 'math-memory-graph-styles';
		
		// 这里应该加载实际的CSS内容，目前先添加基本样式
		styleEl.textContent = `
			/* 数学记忆图谱插件样式 */
			.math-term-management {
				padding: 16px;
				height: 100%;
				overflow-y: auto;
			}
			
			.term-management-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 16px;
				padding-bottom: 12px;
				border-bottom: 1px solid var(--background-modifier-border);
			}
			
			.term-management-title {
				margin: 0;
				color: var(--text-normal);
			}
			
			.term-item {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				padding: 12px;
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 6px;
				transition: all 0.2s ease;
				margin-bottom: 8px;
			}
			
			.term-item:hover {
				background: var(--background-secondary);
				border-color: var(--text-accent);
			}
			
			.term-info {
				flex: 1;
				cursor: pointer;
			}
			
			.chinese-name {
				font-weight: bold;
				color: var(--text-normal);
				font-size: 16px;
			}
			
			.english-name {
				color: var(--text-muted);
				font-style: italic;
			}
			
			.term-category {
				background: var(--text-accent);
				color: var(--text-on-accent);
				padding: 2px 8px;
				border-radius: 12px;
				font-size: 11px;
				font-weight: bold;
				text-transform: uppercase;
			}
			
			.term-actions button {
				padding: 4px 8px;
				font-size: 12px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				background: var(--background-primary);
				color: var(--text-normal);
				cursor: pointer;
				transition: all 0.2s ease;
				margin-left: 6px;
			}
			
			.term-actions button:hover {
				background: var(--background-secondary);
			}
			
			.term-actions button.mod-cta {
				background: var(--text-accent);
				color: var(--text-on-accent);
				border-color: var(--text-accent);
			}
			
			.term-actions button.mod-warning {
				background: var(--text-error);
				color: var(--text-on-accent);
				border-color: var(--text-error);
			}
		`;
		
		document.head.appendChild(styleEl);
		console.log('数学记忆图谱插件样式已加载');
	}
}

// 设置面板类
class MathMemoryGraphSettingTab extends PluginSettingTab {
	plugin: MathMemoryGraphPlugin;

	constructor(app: App, plugin: MathMemoryGraphPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: '数学记忆图谱 - 设置' });

		// 基本功能设置
		this.addBasicSettings(containerEl);
		
		// 识别设置
		this.addRecognitionSettings(containerEl);
		
		// 图谱设置
		this.addGraphSettings(containerEl);
		
		// LaTeX设置
		this.addLaTeXSettings(containerEl);
		
		// 高级设置
		this.addAdvancedSettings(containerEl);
		
		// 快捷键设置
		this.addShortcutSettings(containerEl);

		// 信息和帮助
		this.addAboutSection(containerEl);
	}

	private addBasicSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '基本功能' });

		new Setting(containerEl)
			.setName('自动术语识别')
			.setDesc('在编辑时自动识别数学术语')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoRecognition)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoRecognition = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('知识图谱视图')
			.setDesc('启用数学知识图谱可视化')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableGraphView)
				.onChange(async (value) => {
					this.plugin.settings.enableGraphView = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('智能数学输入')
			.setDesc('启用数学公式智能输入辅助')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMathInput)
				.onChange(async (value) => {
					this.plugin.settings.enableMathInput = value;
					await this.plugin.saveSettings();
				}));
	}

	private addRecognitionSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '术语识别设置' });

		new Setting(containerEl)
			.setName('识别敏感度')
			.setDesc('术语识别的敏感度 (0.1-1.0)')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.1)
				.setValue(this.plugin.settings.recognitionSensitivity)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.recognitionSensitivity = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('每个笔记最大术语数')
			.setDesc('限制每个笔记中识别的最大术语数量')
			.addText(text => text
				.setPlaceholder('100')
				.setValue(this.plugin.settings.maxTermsPerNote.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.maxTermsPerNote = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('自定义术语文件路径')
			.setDesc('指定自定义数学术语词典文件的路径')
			.addText(text => text
				.setPlaceholder('例如: custom-terms.json')
				.setValue(this.plugin.settings.customTermsPath)
				.onChange(async (value) => {
					this.plugin.settings.customTermsPath = value;
					await this.plugin.saveSettings();
				}));
	}

	private addGraphSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '知识图谱设置' });

		new Setting(containerEl)
			.setName('图谱布局')
			.setDesc('选择知识图谱的布局算法')
			.addDropdown(dropdown => dropdown
				.addOption('force', '力导向布局')
				.addOption('circular', '环形布局')
				.addOption('hierarchical', '层次布局')
				.setValue(this.plugin.settings.graphLayout)
				.onChange(async (value: 'force' | 'circular' | 'hierarchical') => {
					this.plugin.settings.graphLayout = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('显示节点标签')
			.setDesc('在图谱中显示术语名称标签')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showLabels)
				.onChange(async (value) => {
					this.plugin.settings.showLabels = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('节点最小尺寸')
			.setDesc('图谱节点的最小显示尺寸')
			.addText(text => text
				.setPlaceholder('10')
				.setValue(this.plugin.settings.nodeSize.min.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0 && num < this.plugin.settings.nodeSize.max) {
						this.plugin.settings.nodeSize.min = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('节点最大尺寸')
			.setDesc('图谱节点的最大显示尺寸')
			.addText(text => text
				.setPlaceholder('50')
				.setValue(this.plugin.settings.nodeSize.max.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > this.plugin.settings.nodeSize.min) {
						this.plugin.settings.nodeSize.max = num;
						await this.plugin.saveSettings();
					}
				}));
	}

	private addLaTeXSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'LaTeX设置' });

		new Setting(containerEl)
			.setName('LaTeX渲染器')
			.setDesc('选择LaTeX公式的渲染引擎')
			.addDropdown(dropdown => dropdown
				.addOption('obsidian', 'Obsidian内置')
				.addOption('mathjax', 'MathJax')
				.addOption('katex', 'KaTeX')
				.setValue(this.plugin.settings.latexRenderer)
				.onChange(async (value: 'mathjax' | 'katex' | 'obsidian') => {
					this.plugin.settings.latexRenderer = value;
					await this.plugin.saveSettings();
				}));
	}

	private addAdvancedSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '高级设置' });

		new Setting(containerEl)
			.setName('自动保存间隔')
			.setDesc('数据自动保存的时间间隔（毫秒）')
			.addText(text => text
				.setPlaceholder('5000')
				.setValue(this.plugin.settings.autoSaveInterval.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num >= 1000) {
						this.plugin.settings.autoSaveInterval = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('调试模式')
			.setDesc('启用详细的调试日志输出')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDebugMode)
				.onChange(async (value) => {
					this.plugin.settings.enableDebugMode = value;
					await this.plugin.saveSettings();
				}));
	}

	private addShortcutSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '快捷键设置' });

		new Setting(containerEl)
			.setName('数学输入模式')
			.setDesc('切换数学输入模式的快捷键')
			.addText(text => text
				.setPlaceholder('Ctrl+M')
				.setValue(this.plugin.settings.shortcutKeys.toggleMathInput)
				.onChange(async (value) => {
					this.plugin.settings.shortcutKeys.toggleMathInput = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('打开图谱视图')
			.setDesc('打开知识图谱视图的快捷键')
			.addText(text => text
				.setPlaceholder('Ctrl+Shift+G')
				.setValue(this.plugin.settings.shortcutKeys.openGraphView)
				.onChange(async (value) => {
					this.plugin.settings.shortcutKeys.openGraphView = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('识别术语')
			.setDesc('手动识别当前文档术语的快捷键')
			.addText(text => text
				.setPlaceholder('Ctrl+Shift+R')
				.setValue(this.plugin.settings.shortcutKeys.recognizeTerms)
				.onChange(async (value) => {
					this.plugin.settings.shortcutKeys.recognizeTerms = value;
					await this.plugin.saveSettings();
				}));
	}

	private addAboutSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '关于' });
		
		const aboutDiv = containerEl.createDiv();
		aboutDiv.innerHTML = `
			<p><strong>数学记忆图谱插件 v1.0.0</strong></p>
			<p>智能识别中文数学术语，构建个人化数学知识图谱</p>
			<p>提供LaTeX转换和智能输入辅助功能</p>
			<br>
			<p><strong>核心特性：</strong></p>
			<ul>
				<li>自动识别中文数学术语</li>
				<li>动态构建知识图谱</li>
				<li>LaTeX代码转换</li>
				<li>智能输入辅助</li>
				<li>个性化学习记录</li>
			</ul>
		`;
	}
}