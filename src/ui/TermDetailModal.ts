import { App, Modal, Notice, TFile } from 'obsidian';
import { MathTerm, TermRelation } from '../types';
import { IDatabaseManager } from '../interfaces/core';

/**
 * 术语详情查看模态框
 */
export class TermDetailModal extends Modal {
    private term: MathTerm;
    private databaseManager: IDatabaseManager;
    private relations: TermRelation[] = [];
    private relatedTerms: MathTerm[] = [];

    constructor(app: App, term: MathTerm, databaseManager: IDatabaseManager) {
        super(app);
        this.term = term;
        this.databaseManager = databaseManager;
    }

    async onOpen(): Promise<void> {
        const { contentEl, titleEl } = this;
        
        titleEl.textContent = `术语详情 - ${this.term.chineseName}`;
        contentEl.empty();
        contentEl.addClass('term-detail-modal');

        // 加载关联数据
        await this.loadRelatedData();

        // 渲染内容
        this.renderContent();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * 加载关联数据
     */
    private async loadRelatedData(): Promise<void> {
        try {
            // 加载术语关系
            this.relations = await this.databaseManager.getRelationsForTerm(this.term.id);
            
            // 加载相关术语
            const relatedTermIds = new Set<string>();
            this.relations.forEach(relation => {
                if (relation.sourceTermId !== this.term.id) {
                    relatedTermIds.add(relation.sourceTermId);
                }
                if (relation.targetTermId !== this.term.id) {
                    relatedTermIds.add(relation.targetTermId);
                }
            });

            this.relatedTerms = [];
            for (const termId of relatedTermIds) {
                const term = await this.databaseManager.getTerm(termId);
                if (term) {
                    this.relatedTerms.push(term);
                }
            }
        } catch (error) {
            console.error('加载关联数据失败:', error);
        }
    }

    /**
     * 渲染内容
     */
    private renderContent(): void {
        const { contentEl } = this;

        // 基本信息区域
        this.renderBasicInfo(contentEl);

        // LaTeX预览区域
        this.renderLatexPreview(contentEl);

        // 关系网络区域
        this.renderRelationships(contentEl);

        // 操作按钮区域
        this.renderActions(contentEl);
    }

    /**
     * 渲染基本信息
     */
    private renderBasicInfo(container: HTMLElement): void {
        const infoSection = container.createDiv('term-basic-info');
        infoSection.createEl('h3', { text: '基本信息' });

        const infoGrid = infoSection.createDiv('info-grid');

        // 中文名称
        const chineseNameRow = infoGrid.createDiv('info-row');
        chineseNameRow.createSpan({ text: '中文名称:', cls: 'info-label' });
        chineseNameRow.createSpan({ text: this.term.chineseName, cls: 'info-value chinese-name' });

        // 英文名称
        if (this.term.englishName) {
            const englishNameRow = infoGrid.createDiv('info-row');
            englishNameRow.createSpan({ text: '英文名称:', cls: 'info-label' });
            englishNameRow.createSpan({ text: this.term.englishName, cls: 'info-value english-name' });
        }

        // 分类
        const categoryRow = infoGrid.createDiv('info-row');
        categoryRow.createSpan({ text: '分类:', cls: 'info-label' });
        const categoryBadge = categoryRow.createSpan({ text: this.term.category, cls: 'info-value category-badge' });
        categoryBadge.addClass(`category-${this.term.category.replace(/\s+/g, '-').toLowerCase()}`);

        // 别名
        if (this.term.aliases && this.term.aliases.length > 0) {
            const aliasesRow = infoGrid.createDiv('info-row');
            aliasesRow.createSpan({ text: '别名:', cls: 'info-label' });
            const aliasesContainer = aliasesRow.createSpan({ cls: 'info-value aliases-container' });
            
            this.term.aliases.forEach((alias, index) => {
                if (index > 0) {
                    aliasesContainer.createSpan({ text: ', ' });
                }
                aliasesContainer.createSpan({ text: alias, cls: 'alias-tag' });
            });
        }

        // 定义
        if (this.term.definition) {
            const definitionSection = infoSection.createDiv('definition-section');
            definitionSection.createEl('h4', { text: '定义' });
            const definitionContent = definitionSection.createDiv('definition-content');
            definitionContent.textContent = this.term.definition;
        }

        // 时间信息
        const timeInfo = infoSection.createDiv('time-info');
        timeInfo.createEl('small', { 
            text: `创建时间: ${this.formatDate(this.term.createdAt)}` 
        });
        timeInfo.createEl('br');
        timeInfo.createEl('small', { 
            text: `更新时间: ${this.formatDate(this.term.updatedAt)}` 
        });
    }

    /**
     * 渲染LaTeX预览
     */
    private renderLatexPreview(container: HTMLElement): void {
        if (!this.term.latexCode) return;

        const latexSection = container.createDiv('latex-preview-section');
        latexSection.createEl('h3', { text: 'LaTeX表示' });

        // LaTeX代码
        const codeContainer = latexSection.createDiv('latex-code-container');
        codeContainer.createEl('h4', { text: '代码' });
        const codeEl = codeContainer.createEl('code', { text: this.term.latexCode });
        codeEl.addClass('latex-code');

        // 复制按钮
        const copyBtn = codeContainer.createEl('button', { text: '复制' });
        copyBtn.addClass('copy-latex-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(this.term.latexCode).then(() => {
                new Notice('LaTeX代码已复制到剪贴板');
            });
        });

        // 渲染预览
        const previewContainer = latexSection.createDiv('latex-render-container');
        previewContainer.createEl('h4', { text: '预览' });
        const previewEl = previewContainer.createDiv('latex-render');
        
        try {
            previewEl.innerHTML = `$$${this.term.latexCode}$$`;
            // 触发Obsidian的数学渲染
            if ((this.app as any).plugins?.plugins?.['obsidian-latex']?.renderMath) {
                (this.app as any).plugins.plugins['obsidian-latex'].renderMath(previewEl);
            }
        } catch (error) {
            previewEl.textContent = 'LaTeX渲染失败';
            previewEl.addClass('render-error');
        }
    }

    /**
     * 渲染关系网络
     */
    private renderRelationships(container: HTMLElement): void {
        const relationSection = container.createDiv('relationships-section');
        relationSection.createEl('h3', { text: '关系网络' });

        if (this.relations.length === 0) {
            relationSection.createEl('p', { 
                text: '暂无相关术语',
                cls: 'no-relations' 
            });
            return;
        }

        // 按关系类型分组
        const relationsByType = new Map<string, TermRelation[]>();
        this.relations.forEach(relation => {
            const type = relation.relationType;
            if (!relationsByType.has(type)) {
                relationsByType.set(type, []);
            }
            relationsByType.get(type)!.push(relation);
        });

        // 渲染每种关系类型
        relationsByType.forEach((relations, type) => {
            const typeSection = relationSection.createDiv('relation-type-section');
            typeSection.createEl('h4', { text: `${type} (${relations.length})` });

            const relationsList = typeSection.createDiv('relations-list');

            relations.forEach(relation => {
                const relatedTermId = relation.sourceTermId === this.term.id 
                    ? relation.targetTermId 
                    : relation.sourceTermId;
                
                const relatedTerm = this.relatedTerms.find(t => t.id === relatedTermId);
                if (!relatedTerm) return;

                const relationItem = relationsList.createDiv('relation-item');
                
                // 术语信息
                const termInfo = relationItem.createDiv('related-term-info');
                termInfo.createSpan({ text: relatedTerm.chineseName, cls: 'related-term-name' });
                if (relatedTerm.englishName) {
                    termInfo.createSpan({ text: ` (${relatedTerm.englishName})`, cls: 'related-term-english' });
                }
                termInfo.createSpan({ text: relatedTerm.category, cls: 'related-term-category' });

                // 关系强度
                const strengthBar = relationItem.createDiv('relation-strength');
                const strengthFill = strengthBar.createDiv('strength-fill');
                strengthFill.style.width = `${relation.strength * 100}%`;
                strengthBar.title = `关系强度: ${(relation.strength * 100).toFixed(1)}%`;

                // 点击查看相关术语
                relationItem.addEventListener('click', () => {
                    new TermDetailModal(this.app, relatedTerm, this.databaseManager).open();
                });
                relationItem.addClass('clickable');
            });
        });
    }

    /**
     * 渲染操作按钮
     */
    private renderActions(container: HTMLElement): void {
        const actionsContainer = container.createDiv('term-detail-actions');

        // 编辑按钮
        const editBtn = actionsContainer.createEl('button', { text: '编辑术语' });
        editBtn.addClass('mod-cta');
        editBtn.addEventListener('click', () => {
            // 这里需要导入TermEditModal，但为了避免循环依赖，我们发送事件
            this.close();
            // 可以通过事件系统通知主视图打开编辑模态框
            this.app.workspace.trigger('math-memory-graph:edit-term', this.term);
        });

        // 创建笔记按钮
        const createNoteBtn = actionsContainer.createEl('button', { text: '创建术语笔记' });
        createNoteBtn.addEventListener('click', () => {
            this.createTermNote();
        });

        // 在图谱中查看按钮
        const viewInGraphBtn = actionsContainer.createEl('button', { text: '在图谱中查看' });
        viewInGraphBtn.addEventListener('click', () => {
            // 触发图谱视图并高亮当前术语
            this.app.workspace.trigger('math-memory-graph:view-in-graph', this.term.id);
            this.close();
        });

        // 关闭按钮
        const closeBtn = actionsContainer.createEl('button', { text: '关闭' });
        closeBtn.addEventListener('click', () => {
            this.close();
        });
    }

    /**
     * 创建术语笔记
     */
    private async createTermNote(): Promise<void> {
        try {
            const fileName = `${this.term.chineseName}.md`;
            
            // 检查文件是否已存在
            const existingFile = this.app.vault.getAbstractFileByPath(fileName);
            if (existingFile) {
                new Notice('该术语的笔记已存在');
                // 打开现有文件
                if (existingFile instanceof TFile) {
                    await this.app.workspace.getLeaf().openFile(existingFile);
                }
                return;
            }

            // 生成笔记内容
            let content = `# ${this.term.chineseName}\n\n`;
            
            if (this.term.englishName) {
                content += `**英文名称**: ${this.term.englishName}\n\n`;
            }
            
            content += `**分类**: ${this.term.category}\n\n`;
            
            if (this.term.latexCode) {
                content += `**LaTeX表示**: $${this.term.latexCode}$\n\n`;
            }
            
            if (this.term.definition) {
                content += `## 定义\n\n${this.term.definition}\n\n`;
            }
            
            if (this.term.aliases && this.term.aliases.length > 0) {
                content += `**别名**: ${this.term.aliases.join(', ')}\n\n`;
            }

            // 添加相关术语链接
            if (this.relatedTerms.length > 0) {
                content += `## 相关术语\n\n`;
                this.relatedTerms.forEach(relatedTerm => {
                    content += `- [[${relatedTerm.chineseName}]]\n`;
                });
                content += '\n';
            }

            content += `## 笔记\n\n<!-- 在这里添加你的学习笔记 -->\n\n`;
            content += `---\n`;
            content += `*此笔记由数学记忆图谱插件自动生成*\n`;
            content += `*创建时间: ${this.formatDate(new Date())}*\n`;

            // 创建文件
            const file = await this.app.vault.create(fileName, content);
            
            // 打开文件
            await this.app.workspace.getLeaf().openFile(file);
            
            new Notice('术语笔记创建成功');
            this.close();
        } catch (error) {
            console.error('创建术语笔记失败:', error);
            new Notice('创建术语笔记失败');
        }
    }

    /**
     * 格式化日期
     */
    private formatDate(date: Date): string {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}