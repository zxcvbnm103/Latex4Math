import { App, Modal, Setting, Notice } from 'obsidian';
import { MathTerm, MathCategory } from '../types';
import { IDatabaseManager } from '../interfaces/core';

/**
 * 术语导入模态框
 */
export class TermImportModal extends Modal {
    private databaseManager: IDatabaseManager;
    private onImportComplete: () => Promise<void>;
    private importData: string = '';
    private importMode: 'json' | 'csv' | 'text' = 'json';
    private previewTerms: MathTerm[] = [];

    constructor(app: App, databaseManager: IDatabaseManager, onImportComplete: () => Promise<void>) {
        super(app);
        this.databaseManager = databaseManager;
        this.onImportComplete = onImportComplete;
    }

    onOpen(): void {
        const { contentEl, titleEl } = this;
        
        titleEl.textContent = '导入术语';
        contentEl.empty();
        contentEl.addClass('term-import-modal');

        this.renderContent();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * 渲染内容
     */
    private renderContent(): void {
        const { contentEl } = this;

        // 导入模式选择
        this.renderImportModeSelection(contentEl);

        // 数据输入区域
        this.renderDataInput(contentEl);

        // 预览区域
        this.renderPreview(contentEl);

        // 操作按钮
        this.renderActions(contentEl);
    }

    /**
     * 渲染导入模式选择
     */
    private renderImportModeSelection(container: HTMLElement): void {
        const modeSection = container.createDiv('import-mode-section');
        modeSection.createEl('h3', { text: '导入格式' });

        new Setting(modeSection)
            .setName('选择导入格式')
            .setDesc('选择要导入的数据格式')
            .addDropdown(dropdown => {
                dropdown.addOption('json', 'JSON格式');
                dropdown.addOption('csv', 'CSV格式');
                dropdown.addOption('text', '文本格式');
                dropdown.setValue(this.importMode);
                dropdown.onChange(value => {
                    this.importMode = value as 'json' | 'csv' | 'text';
                    this.updateInstructions();
                });
            });

        // 格式说明
        const instructionsEl = modeSection.createDiv('format-instructions');
        this.updateInstructions(instructionsEl);
    }

    /**
     * 更新格式说明
     */
    private updateInstructions(container?: HTMLElement): void {
        const instructionsEl = container || this.contentEl.querySelector('.format-instructions') as HTMLElement;
        if (!instructionsEl) return;

        instructionsEl.empty();

        switch (this.importMode) {
            case 'json':
                instructionsEl.innerHTML = `
                    <h4>JSON格式说明</h4>
                    <p>请输入包含术语数组的JSON数据，格式如下：</p>
                    <pre><code>{
  "terms": [
    {
      "chineseName": "导数",
      "englishName": "Derivative",
      "category": "微积分",
      "latexCode": "\\\\frac{d}{dx}",
      "definition": "函数在某点的变化率",
      "aliases": ["微分", "求导"]
    }
  ]
}</code></pre>
                `;
                break;
            case 'csv':
                instructionsEl.innerHTML = `
                    <h4>CSV格式说明</h4>
                    <p>请输入CSV格式的数据，第一行为标题行：</p>
                    <pre><code>中文名称,英文名称,分类,LaTeX代码,定义,别名
导数,Derivative,微积分,\\\\frac{d}{dx},函数在某点的变化率,"微分,求导"
积分,Integral,微积分,\\\\int,求面积的数学运算,"求积,积分运算"</code></pre>
                `;
                break;
            case 'text':
                instructionsEl.innerHTML = `
                    <h4>文本格式说明</h4>
                    <p>每行一个术语，格式为：中文名称|英文名称|分类|LaTeX代码|定义</p>
                    <pre><code>导数|Derivative|微积分|\\\\frac{d}{dx}|函数在某点的变化率
积分|Integral|微积分|\\\\int|求面积的数学运算</code></pre>
                `;
                break;
        }
    }

    /**
     * 渲染数据输入区域
     */
    private renderDataInput(container: HTMLElement): void {
        const inputSection = container.createDiv('data-input-section');
        inputSection.createEl('h3', { text: '导入数据' });

        // 文件上传
        const fileInputContainer = inputSection.createDiv('file-input-container');
        const fileInput = fileInputContainer.createEl('input', {
            type: 'file',
            attr: { accept: '.json,.csv,.txt' }
        });
        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        const fileLabel = fileInputContainer.createEl('label');
        fileLabel.textContent = '选择文件上传';
        fileLabel.appendChild(fileInput);

        // 或者分隔线
        inputSection.createEl('div', { text: '或者', cls: 'separator' });

        // 文本输入
        new Setting(inputSection)
            .setName('直接输入数据')
            .setDesc('在下方文本框中直接输入或粘贴数据')
            .addTextArea(text => text
                .setPlaceholder('在此输入或粘贴数据...')
                .setValue(this.importData)
                .onChange(value => {
                    this.importData = value;
                    this.parseAndPreview();
                }));
    }

    /**
     * 处理文件上传
     */
    private handleFileUpload(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.importData = e.target?.result as string;
            
            // 更新文本框
            const textArea = this.contentEl.querySelector('textarea') as HTMLTextAreaElement;
            if (textArea) {
                textArea.value = this.importData;
            }
            
            this.parseAndPreview();
        };
        reader.readAsText(file);
    }

    /**
     * 解析并预览数据
     */
    private parseAndPreview(): void {
        if (!this.importData.trim()) {
            this.previewTerms = [];
            this.updatePreview();
            return;
        }

        try {
            switch (this.importMode) {
                case 'json':
                    this.previewTerms = this.parseJsonData(this.importData);
                    break;
                case 'csv':
                    this.previewTerms = this.parseCsvData(this.importData);
                    break;
                case 'text':
                    this.previewTerms = this.parseTextData(this.importData);
                    break;
            }
            this.updatePreview();
        } catch (error) {
            console.error('解析数据失败:', error);
            new Notice('数据格式错误，请检查输入');
            this.previewTerms = [];
            this.updatePreview();
        }
    }

    /**
     * 解析JSON数据
     */
    private parseJsonData(data: string): MathTerm[] {
        const parsed = JSON.parse(data);
        const termsData = parsed.terms || parsed;
        
        if (!Array.isArray(termsData)) {
            throw new Error('JSON数据必须包含术语数组');
        }

        return termsData.map((item, index) => this.createTermFromData(item, index));
    }

    /**
     * 解析CSV数据
     */
    private parseCsvData(data: string): MathTerm[] {
        const lines = data.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV数据至少需要标题行和一行数据');
        }

        // 跳过标题行
        const dataLines = lines.slice(1);
        
        return dataLines.map((line, index) => {
            const columns = this.parseCsvLine(line);
            return this.createTermFromData({
                chineseName: columns[0],
                englishName: columns[1],
                category: columns[2],
                latexCode: columns[3],
                definition: columns[4],
                aliases: columns[5] ? columns[5].split(',').map(s => s.trim()) : []
            }, index);
        });
    }

    /**
     * 解析文本数据
     */
    private parseTextData(data: string): MathTerm[] {
        const lines = data.trim().split('\n');
        
        return lines.map((line, index) => {
            const parts = line.split('|');
            return this.createTermFromData({
                chineseName: parts[0]?.trim(),
                englishName: parts[1]?.trim(),
                category: parts[2]?.trim(),
                latexCode: parts[3]?.trim(),
                definition: parts[4]?.trim(),
                aliases: []
            }, index);
        });
    }

    /**
     * 解析CSV行（处理引号和逗号）
     */
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    /**
     * 从数据创建术语对象
     */
    private createTermFromData(data: any, index: number): MathTerm {
        const id = `imported_${Date.now()}_${index}`;
        const now = new Date();

        // 验证必填字段
        if (!data.chineseName) {
            throw new Error(`第${index + 1}行：中文名称不能为空`);
        }

        // 验证分类
        let category = data.category;
        if (!Object.values(MathCategory).includes(category)) {
            // 尝试映射常见的分类名称
            const categoryMap: Record<string, MathCategory> = {
                '代数': MathCategory.ALGEBRA,
                '微积分': MathCategory.CALCULUS,
                '几何': MathCategory.GEOMETRY,
                '统计': MathCategory.STATISTICS,
                '线性代数': MathCategory.LINEAR_ALGEBRA,
                '离散数学': MathCategory.DISCRETE_MATH,
                '数论': MathCategory.NUMBER_THEORY,
                '拓扑学': MathCategory.TOPOLOGY,
                '数学分析': MathCategory.ANALYSIS,
                '概率论': MathCategory.PROBABILITY
            };
            
            category = categoryMap[category] || MathCategory.ALGEBRA;
        }

        return {
            id,
            chineseName: data.chineseName.trim(),
            englishName: data.englishName?.trim() || undefined,
            category,
            latexCode: data.latexCode?.trim() || '',
            definition: data.definition?.trim() || undefined,
            aliases: Array.isArray(data.aliases) ? data.aliases : [],
            createdAt: now,
            updatedAt: now
        };
    }

    /**
     * 渲染预览区域
     */
    private renderPreview(container: HTMLElement): void {
        const previewSection = container.createDiv('preview-section');
        previewSection.createEl('h3', { text: '预览' });

        const previewContainer = previewSection.createDiv('preview-container');
        this.updatePreview(previewContainer);
    }

    /**
     * 更新预览
     */
    private updatePreview(container?: HTMLElement): void {
        const previewContainer = container || this.contentEl.querySelector('.preview-container') as HTMLElement;
        if (!previewContainer) return;

        previewContainer.empty();

        if (this.previewTerms.length === 0) {
            previewContainer.createEl('p', { text: '暂无预览数据', cls: 'no-preview' });
            return;
        }

        // 显示统计信息
        const statsEl = previewContainer.createDiv('preview-stats');
        statsEl.textContent = `将导入 ${this.previewTerms.length} 个术语`;

        // 显示前几个术语的预览
        const previewList = previewContainer.createDiv('preview-list');
        const previewCount = Math.min(5, this.previewTerms.length);
        
        for (let i = 0; i < previewCount; i++) {
            const term = this.previewTerms[i];
            const termEl = previewList.createDiv('preview-term');
            
            termEl.createSpan({ text: term.chineseName, cls: 'term-name' });
            if (term.englishName) {
                termEl.createSpan({ text: ` (${term.englishName})`, cls: 'term-english' });
            }
            termEl.createSpan({ text: term.category, cls: 'term-category' });
        }

        if (this.previewTerms.length > previewCount) {
            previewList.createEl('p', { 
                text: `... 还有 ${this.previewTerms.length - previewCount} 个术语`,
                cls: 'more-terms' 
            });
        }
    }

    /**
     * 渲染操作按钮
     */
    private renderActions(container: HTMLElement): void {
        const actionsContainer = container.createDiv('import-actions');

        // 取消按钮
        const cancelBtn = actionsContainer.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        // 导入按钮
        const importBtn = actionsContainer.createEl('button', { text: '开始导入' });
        importBtn.addClass('mod-cta');
        importBtn.addEventListener('click', async () => {
            await this.performImport();
        });

        // 根据预览数据启用/禁用导入按钮
        importBtn.disabled = this.previewTerms.length === 0;
    }

    /**
     * 执行导入
     */
    private async performImport(): Promise<void> {
        if (this.previewTerms.length === 0) {
            new Notice('没有可导入的数据');
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const term of this.previewTerms) {
                try {
                    await this.databaseManager.saveTerm(term);
                    successCount++;
                } catch (error) {
                    console.error(`导入术语失败: ${term.chineseName}`, error);
                    errorCount++;
                }
            }

            // 显示导入结果
            if (errorCount === 0) {
                new Notice(`成功导入 ${successCount} 个术语`);
            } else {
                new Notice(`导入完成：成功 ${successCount} 个，失败 ${errorCount} 个`);
            }

            // 通知完成
            await this.onImportComplete();
            
            this.close();
        } catch (error) {
            console.error('导入过程中出现错误:', error);
            new Notice('导入失败，请检查数据格式');
        }
    }
}