import { ItemView, WorkspaceLeaf, Setting, Modal, Notice, TFile } from 'obsidian';
import { MathTerm, MathCategory, TermStatistics } from '../types';
import { IDatabaseManager } from '../interfaces/core';
import { TermEditModal } from './TermEditModal';
import { TermDetailModal } from './TermDetailModal';
import { TermImportModal } from './TermImportModal';
import MathMemoryGraphPlugin from '../../main';

export const TERM_MANAGEMENT_VIEW_TYPE = 'math-memory-graph-terms';

/**
 * 术语管理视图 - 侧边栏术语列表和管理界面
 */
export class TermManagementView extends ItemView {
    private plugin: MathMemoryGraphPlugin;
    private databaseManager: IDatabaseManager;
    private terms: MathTerm[] = [];
    private filteredTerms: MathTerm[] = [];
    private currentCategory: MathCategory | 'all' = 'all';
    private searchQuery: string = '';
    private statistics: TermStatistics | null = null;
    private eventHandlers: Map<string, (...args: any[]) => void> = new Map();

    constructor(leaf: WorkspaceLeaf, plugin: MathMemoryGraphPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.databaseManager = plugin.getServiceManager()?.getDatabaseManager();
    }

    getViewType(): string {
        return TERM_MANAGEMENT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return '数学术语管理';
    }

    getIcon(): string {
        return 'calculator';
    }

    async onOpen(): Promise<void> {
        await this.loadTerms();
        this.render();
        this.registerEventListeners();
    }

    async onClose(): Promise<void> {
        this.unregisterEventListeners();
    }

    /**
     * 加载术语数据
     */
    private async loadTerms(): Promise<void> {
        if (!this.databaseManager) {
            console.warn('TermManagementView: 数据库管理器未初始化');
            return;
        }

        try {
            this.terms = await this.databaseManager.getAllTerms();
            this.statistics = await this.databaseManager.getTermStatistics();
            this.applyFilters();
        } catch (error) {
            console.error('TermManagementView: 加载术语失败:', error);
            new Notice('加载术语数据失败');
        }
    }

    /**
     * 应用搜索和分类过滤
     */
    private applyFilters(): void {
        let filtered = [...this.terms];

        // 应用分类过滤
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(term => term.category === this.currentCategory);
        }

        // 应用搜索过滤
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase().trim();
            filtered = filtered.filter(term => 
                term.chineseName.toLowerCase().includes(query) ||
                term.englishName?.toLowerCase().includes(query) ||
                term.aliases.some(alias => alias.toLowerCase().includes(query)) ||
                term.definition?.toLowerCase().includes(query)
            );
        }

        // 按名称排序
        filtered.sort((a, b) => a.chineseName.localeCompare(b.chineseName));

        this.filteredTerms = filtered;
    }

    /**
     * 渲染主界面
     */
    private render(): void {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('math-term-management');

        // 创建头部区域
        this.renderHeader(container);

        // 创建统计信息
        this.renderStatistics(container);

        // 创建搜索和过滤区域
        this.renderSearchAndFilter(container);

        // 创建术语列表
        this.renderTermList(container);

        // 创建操作按钮
        this.renderActionButtons(container);
    }

    /**
     * 渲染头部区域
     */
    private renderHeader(container: Element): void {
        const header = container.createDiv('term-management-header');
        
        const title = header.createEl('h2', { text: '数学术语管理' });
        title.addClass('term-management-title');

        const refreshBtn = header.createEl('button', { text: '刷新' });
        refreshBtn.addClass('mod-cta');
        refreshBtn.addEventListener('click', async () => {
            await this.loadTerms();
            this.render();
            new Notice('术语数据已刷新');
        });
    }

    /**
     * 渲染统计信息
     */
    private renderStatistics(container: Element): void {
        if (!this.statistics) return;

        const statsContainer = container.createDiv('term-statistics');
        statsContainer.createEl('h3', { text: '统计信息' });

        const statsGrid = statsContainer.createDiv('stats-grid');
        
        // 总术语数
        const totalCard = statsGrid.createDiv('stat-card');
        totalCard.createEl('div', { text: this.statistics.totalTerms.toString(), cls: 'stat-number' });
        totalCard.createEl('div', { text: '总术语数', cls: 'stat-label' });

        // 分类统计
        const categoryStats = statsGrid.createDiv('stat-card category-stats');
        categoryStats.createEl('div', { text: '分类分布', cls: 'stat-label' });
        
        const categoryList = categoryStats.createDiv('category-list');
        this.statistics.categoryCounts.forEach((count, category) => {
            const categoryItem = categoryList.createDiv('category-item');
            categoryItem.createSpan({ text: category, cls: 'category-name' });
            categoryItem.createSpan({ text: count.toString(), cls: 'category-count' });
        });
    }

    /**
     * 渲染搜索和过滤区域
     */
    private renderSearchAndFilter(container: Element): void {
        const filterContainer = container.createDiv('term-filters');

        // 搜索框
        const searchContainer = filterContainer.createDiv('search-container');
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: '搜索术语...',
            value: this.searchQuery
        });
        searchInput.addClass('search-input');
        
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value;
            this.applyFilters();
            this.renderTermList(container.querySelector('.term-list-container') as Element);
        });

        // 分类过滤
        const categoryContainer = filterContainer.createDiv('category-filter');
        const categorySelect = categoryContainer.createEl('select');
        categorySelect.addClass('category-select');

        // 添加"全部"选项
        const allOption = categorySelect.createEl('option', { value: 'all', text: '全部分类' });
        if (this.currentCategory === 'all') {
            allOption.selected = true;
        }

        // 添加各分类选项
        Object.values(MathCategory).forEach(category => {
            const option = categorySelect.createEl('option', { value: category, text: category });
            if (this.currentCategory === category) {
                option.selected = true;
            }
        });

        categorySelect.addEventListener('change', (e) => {
            const value = (e.target as HTMLSelectElement).value;
            this.currentCategory = value === 'all' ? 'all' : value as MathCategory;
            this.applyFilters();
            this.renderTermList(container.querySelector('.term-list-container') as Element);
        });

        // 显示过滤结果数量
        const resultCount = filterContainer.createDiv('result-count');
        resultCount.textContent = `显示 ${this.filteredTerms.length} / ${this.terms.length} 个术语`;
    }

    /**
     * 渲染术语列表
     */
    private renderTermList(container: Element): void {
        // 移除现有的术语列表容器
        const existingContainer = container.querySelector('.term-list-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        const listContainer = container.createDiv('term-list-container');
        
        if (this.filteredTerms.length === 0) {
            const emptyState = listContainer.createDiv('empty-state');
            emptyState.createEl('p', { text: '没有找到匹配的术语' });
            return;
        }

        const termList = listContainer.createDiv('term-list');

        this.filteredTerms.forEach(term => {
            const termItem = termList.createDiv('term-item');
            termItem.setAttribute('data-term-id', term.id);

            // 术语基本信息
            const termInfo = termItem.createDiv('term-info');
            
            const termName = termInfo.createDiv('term-name');
            termName.createSpan({ text: term.chineseName, cls: 'chinese-name' });
            if (term.englishName) {
                termName.createSpan({ text: ` (${term.englishName})`, cls: 'english-name' });
            }

            const termMeta = termInfo.createDiv('term-meta');
            termMeta.createSpan({ text: term.category, cls: 'term-category' });
            if (term.latexCode) {
                termMeta.createSpan({ text: term.latexCode, cls: 'latex-code' });
            }

            if (term.definition) {
                const definition = termInfo.createDiv('term-definition');
                definition.textContent = term.definition.length > 100 
                    ? term.definition.substring(0, 100) + '...' 
                    : term.definition;
            }

            // 操作按钮
            const termActions = termItem.createDiv('term-actions');
            
            const editBtn = termActions.createEl('button', { text: '编辑' });
            editBtn.addClass('mod-cta');
            editBtn.addEventListener('click', () => this.editTerm(term));

            const deleteBtn = termActions.createEl('button', { text: '删除' });
            deleteBtn.addClass('mod-warning');
            deleteBtn.addEventListener('click', () => this.deleteTerm(term));

            const viewBtn = termActions.createEl('button', { text: '查看' });
            viewBtn.addEventListener('click', () => this.viewTermDetails(term));

            // 点击术语项也可以查看详情
            termInfo.addEventListener('click', () => this.viewTermDetails(term));
            termInfo.addClass('clickable');
        });
    }

    /**
     * 渲染操作按钮
     */
    private renderActionButtons(container: Element): void {
        const actionsContainer = container.createDiv('term-actions-container');

        const addBtn = actionsContainer.createEl('button', { text: '添加新术语' });
        addBtn.addClass('mod-cta');
        addBtn.addEventListener('click', () => this.addNewTerm());

        const importBtn = actionsContainer.createEl('button', { text: '导入术语' });
        importBtn.addEventListener('click', () => this.importTerms());

        const exportBtn = actionsContainer.createEl('button', { text: '导出术语' });
        exportBtn.addEventListener('click', () => this.exportTerms());
    }

    /**
     * 添加新术语
     */
    private addNewTerm(): void {
        new TermEditModal(this.app, null, async (term) => {
            if (this.databaseManager) {
                try {
                    await this.databaseManager.saveTerm(term);
                    await this.loadTerms();
                    this.render();
                    new Notice('术语添加成功');
                } catch (error) {
                    console.error('添加术语失败:', error);
                    new Notice('添加术语失败');
                }
            }
        }).open();
    }

    /**
     * 编辑术语
     */
    private editTerm(term: MathTerm): void {
        new TermEditModal(this.app, term, async (updatedTerm) => {
            if (this.databaseManager) {
                try {
                    await this.databaseManager.updateTerm(updatedTerm);
                    await this.loadTerms();
                    this.render();
                    new Notice('术语更新成功');
                } catch (error) {
                    console.error('更新术语失败:', error);
                    new Notice('更新术语失败');
                }
            }
        }).open();
    }

    /**
     * 删除术语
     */
    private async deleteTerm(term: MathTerm): Promise<void> {
        const confirmed = await this.showConfirmDialog(
            '确认删除',
            `确定要删除术语"${term.chineseName}"吗？此操作不可撤销。`
        );

        if (confirmed && this.databaseManager) {
            try {
                await this.databaseManager.deleteTerm(term.id);
                await this.loadTerms();
                this.render();
                new Notice('术语删除成功');
            } catch (error) {
                console.error('删除术语失败:', error);
                new Notice('删除术语失败');
            }
        }
    }

    /**
     * 查看术语详情
     */
    private viewTermDetails(term: MathTerm): void {
        new TermDetailModal(this.app, term, this.databaseManager).open();
    }

    /**
     * 导入术语
     */
    private importTerms(): void {
        new TermImportModal(this.app, this.databaseManager, async () => {
            await this.loadTerms();
            this.render();
        }).open();
    }

    /**
     * 导出术语
     */
    private async exportTerms(): Promise<void> {
        try {
            const exportData = {
                terms: this.terms,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const fileName = `math-terms-export-${Date.now()}.json`;
            const content = JSON.stringify(exportData, null, 2);

            // 创建并下载文件
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            new Notice('术语数据导出成功');
        } catch (error) {
            console.error('导出术语失败:', error);
            new Notice('导出术语失败');
        }
    }

    /**
     * 显示确认对话框
     */
    private showConfirmDialog(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.textContent = title;
            
            const content = modal.contentEl;
            content.createEl('p', { text: message });
            
            const buttonContainer = content.createDiv('modal-button-container');
            
            const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
            cancelBtn.addEventListener('click', () => {
                modal.close();
                resolve(false);
            });
            
            const confirmBtn = buttonContainer.createEl('button', { text: '确认' });
            confirmBtn.addClass('mod-warning');
            confirmBtn.addEventListener('click', () => {
                modal.close();
                resolve(true);
            });
            
            modal.open();
        });
    }

    /**
     * 注册事件监听器
     */
    private registerEventListeners(): void {
        // 将视图实例注册到插件中，以便命令可以直接调用方法
        (this.plugin as any).termManagementView = this;
    }

    /**
     * 注销事件监听器
     */
    private unregisterEventListeners(): void {
        // 清理视图实例引用
        if ((this.plugin as any).termManagementView === this) {
            (this.plugin as any).termManagementView = null;
        }
    }

    /**
     * 聚焦搜索框（供外部调用）
     */
    public focusSearch(): void {
        const searchInput = this.containerEl.querySelector('.search-input') as HTMLInputElement;
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * 在图谱中查看术语（供外部调用）
     */
    public viewTermInGraph(termId: string): void {
        const term = this.terms.find(t => t.id === termId);
        if (term) {
            // 这里应该打开图谱视图并高亮术语，目前先显示通知
            new Notice(`在图谱中查看术语: ${term.chineseName}`);
        }
    }
}