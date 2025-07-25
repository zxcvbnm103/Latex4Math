import { App, Modal, Setting, Notice } from 'obsidian';
import { MathTerm, MathCategory } from '../types';

/**
 * 术语编辑模态框
 */
export class TermEditModal extends Modal {
    private term: MathTerm | null;
    private onSave: (term: MathTerm) => Promise<void>;
    private formData: Partial<MathTerm> = {};

    constructor(app: App, term: MathTerm | null, onSave: (term: MathTerm) => Promise<void>) {
        super(app);
        this.term = term;
        this.onSave = onSave;
        
        // 初始化表单数据
        if (term) {
            this.formData = { ...term };
        } else {
            this.formData = {
                id: this.generateId(),
                chineseName: '',
                englishName: '',
                category: MathCategory.ALGEBRA,
                latexCode: '',
                definition: '',
                aliases: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
    }

    onOpen(): void {
        const { contentEl, titleEl } = this;
        
        titleEl.textContent = this.term ? '编辑术语' : '添加新术语';
        contentEl.empty();
        contentEl.addClass('term-edit-modal');

        this.renderForm();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * 渲染表单
     */
    private renderForm(): void {
        const { contentEl } = this;

        // 中文名称（必填）
        new Setting(contentEl)
            .setName('中文名称 *')
            .setDesc('术语的中文名称')
            .addText(text => text
                .setPlaceholder('例如：导数')
                .setValue(this.formData.chineseName || '')
                .onChange(value => {
                    this.formData.chineseName = value;
                }));

        // 英文名称（可选）
        new Setting(contentEl)
            .setName('英文名称')
            .setDesc('术语的英文名称（可选）')
            .addText(text => text
                .setPlaceholder('例如：Derivative')
                .setValue(this.formData.englishName || '')
                .onChange(value => {
                    this.formData.englishName = value;
                }));

        // 分类
        new Setting(contentEl)
            .setName('分类 *')
            .setDesc('选择术语所属的数学分类')
            .addDropdown(dropdown => {
                Object.values(MathCategory).forEach(category => {
                    dropdown.addOption(category, category);
                });
                dropdown.setValue(this.formData.category || MathCategory.ALGEBRA);
                dropdown.onChange(value => {
                    this.formData.category = value as MathCategory;
                });
            });

        // LaTeX代码
        new Setting(contentEl)
            .setName('LaTeX代码')
            .setDesc('术语对应的LaTeX表示')
            .addTextArea(text => text
                .setPlaceholder('例如：\\frac{d}{dx}')
                .setValue(this.formData.latexCode || '')
                .onChange(value => {
                    this.formData.latexCode = value;
                }));

        // 定义
        new Setting(contentEl)
            .setName('定义')
            .setDesc('术语的数学定义或说明')
            .addTextArea(text => text
                .setPlaceholder('输入术语的定义...')
                .setValue(this.formData.definition || '')
                .onChange(value => {
                    this.formData.definition = value;
                }));

        // 别名
        new Setting(contentEl)
            .setName('别名')
            .setDesc('术语的其他名称，用逗号分隔')
            .addTextArea(text => text
                .setPlaceholder('例如：微分,求导')
                .setValue(this.formData.aliases?.join(', ') || '')
                .onChange(value => {
                    this.formData.aliases = value
                        .split(',')
                        .map(alias => alias.trim())
                        .filter(alias => alias.length > 0);
                }));

        // LaTeX预览区域
        this.renderLatexPreview();

        // 按钮区域
        this.renderButtons();
    }

    /**
     * 渲染LaTeX预览
     */
    private renderLatexPreview(): void {
        const { contentEl } = this;
        
        const previewContainer = contentEl.createDiv('latex-preview-container');
        previewContainer.createEl('h4', { text: 'LaTeX预览' });
        
        const previewEl = previewContainer.createDiv('latex-preview');
        
        const updatePreview = () => {
            if (this.formData.latexCode) {
                // 使用Obsidian的数学渲染
                previewEl.innerHTML = `$$${this.formData.latexCode}$$`;
                
                // 触发Obsidian的数学渲染
                if ((this.app as any).plugins?.plugins?.['obsidian-latex']?.renderMath) {
                    (this.app as any).plugins.plugins['obsidian-latex'].renderMath(previewEl);
                }
            } else {
                previewEl.textContent = '输入LaTeX代码以查看预览';
            }
        };

        // 初始预览
        updatePreview();

        // 监听LaTeX代码变化
        const latexInput = contentEl.querySelector('textarea[placeholder*="LaTeX"]') as HTMLTextAreaElement;
        if (latexInput) {
            latexInput.addEventListener('input', updatePreview);
        }
    }

    /**
     * 渲染按钮
     */
    private renderButtons(): void {
        const { contentEl } = this;
        
        const buttonContainer = contentEl.createDiv('modal-button-container');
        
        // 取消按钮
        const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => {
            this.close();
        });
        
        // 保存按钮
        const saveBtn = buttonContainer.createEl('button', { text: '保存' });
        saveBtn.addClass('mod-cta');
        saveBtn.addEventListener('click', async () => {
            await this.handleSave();
        });

        // 如果是编辑模式，添加预览按钮
        if (this.term) {
            const previewBtn = buttonContainer.createEl('button', { text: '在笔记中预览' });
            previewBtn.addEventListener('click', () => {
                this.previewInNote();
            });
        }
    }

    /**
     * 处理保存
     */
    private async handleSave(): Promise<void> {
        // 验证必填字段
        if (!this.formData.chineseName?.trim()) {
            new Notice('请输入中文名称');
            return;
        }

        if (!this.formData.category) {
            new Notice('请选择分类');
            return;
        }

        try {
            // 构建完整的术语对象
            const termToSave: MathTerm = {
                id: this.formData.id || this.generateId(),
                chineseName: this.formData.chineseName.trim(),
                englishName: this.formData.englishName?.trim() || undefined,
                category: this.formData.category,
                latexCode: this.formData.latexCode?.trim() || '',
                definition: this.formData.definition?.trim() || undefined,
                aliases: this.formData.aliases || [],
                createdAt: this.formData.createdAt || new Date(),
                updatedAt: new Date()
            };

            // 调用保存回调
            await this.onSave(termToSave);
            
            this.close();
        } catch (error) {
            console.error('保存术语失败:', error);
            new Notice('保存失败，请检查输入内容');
        }
    }

    /**
     * 在笔记中预览术语
     */
    private previewInNote(): void {
        if (!this.formData.chineseName) {
            new Notice('请先输入术语名称');
            return;
        }

        // 创建预览内容
        let previewContent = `# ${this.formData.chineseName}\n\n`;
        
        if (this.formData.englishName) {
            previewContent += `**英文名称**: ${this.formData.englishName}\n\n`;
        }
        
        previewContent += `**分类**: ${this.formData.category}\n\n`;
        
        if (this.formData.latexCode) {
            previewContent += `**LaTeX**: $${this.formData.latexCode}$\n\n`;
        }
        
        if (this.formData.definition) {
            previewContent += `**定义**: ${this.formData.definition}\n\n`;
        }
        
        if (this.formData.aliases && this.formData.aliases.length > 0) {
            previewContent += `**别名**: ${this.formData.aliases.join(', ')}\n\n`;
        }

        // 创建临时文件进行预览
        const fileName = `术语预览-${this.formData.chineseName}.md`;
        this.app.vault.create(fileName, previewContent).then(file => {
            // 打开文件
            this.app.workspace.getLeaf().openFile(file);
            new Notice('预览文件已创建');
        }).catch(error => {
            console.error('创建预览文件失败:', error);
            new Notice('创建预览文件失败');
        });
    }

    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}