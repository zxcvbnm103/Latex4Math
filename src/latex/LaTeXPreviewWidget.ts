import { App, Component } from 'obsidian';
import { NeuralLatexConverter } from './NeuralLatexConverter';

/**
 * LaTeX预览小部件 - 提供实时LaTeX预览功能
 */
export class LaTeXPreviewWidget extends Component {
    private app: App;
    private converter: NeuralLatexConverter;
    private container: HTMLElement;
    private previewElement: HTMLElement;
    private inputElement: HTMLInputElement | HTMLTextAreaElement;
    private isVisible: boolean = false;

    constructor(app: App, converter: NeuralLatexConverter) {
        super();
        this.app = app;
        this.converter = converter;
        this.createWidget();
    }

    /**
     * 创建预览小部件
     */
    private createWidget(): void {
        this.container = document.createElement('div');
        this.container.className = 'latex-preview-widget';
        this.container.style.cssText = `
            position: absolute;
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            padding: 12px;
            box-shadow: var(--shadow-s);
            z-index: 1000;
            max-width: 400px;
            display: none;
        `;

        // 创建标题
        const title = this.container.createDiv('latex-preview-title');
        title.textContent = 'LaTeX 预览';
        title.style.cssText = `
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-normal);
            font-size: 14px;
        `;

        // 创建预览区域
        this.previewElement = this.container.createDiv('latex-preview-content');
        this.previewElement.style.cssText = `
            min-height: 40px;
            padding: 8px;
            background: var(--background-secondary);
            border-radius: 4px;
            border: 1px solid var(--background-modifier-border);
            margin-bottom: 8px;
        `;

        // 创建操作按钮
        this.createActionButtons();

        // 添加到文档
        document.body.appendChild(this.container);
    }

    /**
     * 创建操作按钮
     */
    private createActionButtons(): void {
        const buttonContainer = this.container.createDiv('latex-preview-actions');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        `;

        // 复制内联格式按钮
        const copyInlineBtn = buttonContainer.createEl('button', {
            text: '复制 $...$',
            cls: 'mod-cta'
        });
        copyInlineBtn.style.fontSize = '12px';
        copyInlineBtn.onclick = () => this.copyLatex('inline');

        // 复制块格式按钮
        const copyBlockBtn = buttonContainer.createEl('button', {
            text: '复制 $$...$$',
        });
        copyBlockBtn.style.fontSize = '12px';
        copyBlockBtn.onclick = () => this.copyLatex('block');

        // 关闭按钮
        const closeBtn = buttonContainer.createEl('button', {
            text: '×',
        });
        closeBtn.style.cssText = `
            font-size: 16px;
            padding: 2px 8px;
            margin-left: 8px;
        `;
        closeBtn.onclick = () => this.hide();
    }

    /**
     * 显示预览小部件
     */
    async show(inputElement: HTMLInputElement | HTMLTextAreaElement, latexCode: string): Promise<void> {
        this.inputElement = inputElement;
        
        // 更新预览内容
        await this.updatePreview(latexCode);
        
        // 定位小部件
        this.positionWidget(inputElement);
        
        // 显示小部件
        this.container.style.display = 'block';
        this.isVisible = true;
        
        // 监听输入变化
        this.setupInputListener();
    }

    /**
     * 隐藏预览小部件
     */
    hide(): void {
        this.container.style.display = 'none';
        this.isVisible = false;
        this.removeInputListener();
    }

    /**
     * 更新预览内容
     */
    async updatePreview(latexCode: string): Promise<void> {
        if (!latexCode || latexCode.trim().length === 0) {
            this.previewElement.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">输入 LaTeX 代码以查看预览</span>';
            return;
        }

        try {
            // 清空之前的内容
            this.previewElement.innerHTML = '';
            
            // 使用转换器渲染LaTeX
            const renderedElement = await this.converter.renderLatex(latexCode);
            this.previewElement.appendChild(renderedElement);
            
        } catch (error) {
            console.warn('LaTeX预览渲染失败:', error);
            this.previewElement.innerHTML = `
                <span style="color: var(--text-error);">
                    渲染失败: ${error.message}
                </span>
            `;
        }
    }

    /**
     * 定位小部件位置
     */
    private positionWidget(inputElement: HTMLElement): void {
        const rect = inputElement.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        // 计算最佳位置
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // 确保不超出视窗右边界
        if (left + containerRect.width > window.innerWidth) {
            left = window.innerWidth - containerRect.width - 16;
        }
        
        // 确保不超出视窗下边界
        if (top + containerRect.height > window.innerHeight) {
            top = rect.top - containerRect.height - 8;
        }
        
        // 确保不超出视窗左边界和上边界
        left = Math.max(16, left);
        top = Math.max(16, top);
        
        this.container.style.left = `${left}px`;
        this.container.style.top = `${top}px`;
    }

    /**
     * 设置输入监听器
     */
    private setupInputListener(): void {
        if (!this.inputElement) return;
        
        const updatePreview = async () => {
            const latexCode = this.inputElement.value;
            await this.updatePreview(latexCode);
        };
        
        this.inputElement.addEventListener('input', updatePreview);
        this.inputElement.addEventListener('blur', () => {
            // 延迟隐藏，允许用户点击按钮
            setTimeout(() => {
                if (!this.container.matches(':hover')) {
                    this.hide();
                }
            }, 200);
        });
        
        // 保存事件监听器引用以便后续移除
        (this.inputElement as any)._latexPreviewListener = updatePreview;
    }

    /**
     * 移除输入监听器
     */
    private removeInputListener(): void {
        if (!this.inputElement) return;
        
        const listener = (this.inputElement as any)._latexPreviewListener;
        if (listener) {
            this.inputElement.removeEventListener('input', listener);
            this.inputElement.removeEventListener('blur', listener);
            delete (this.inputElement as any)._latexPreviewListener;
        }
    }

    /**
     * 复制LaTeX代码
     */
    private async copyLatex(format: 'inline' | 'block'): Promise<void> {
        if (!this.inputElement) return;
        
        const latexCode = this.inputElement.value;
        if (!latexCode) return;
        
        try {
            await this.converter.copyLatexToClipboard(latexCode, format);
            
            // 显示成功提示
            this.showCopySuccess(format);
            
        } catch (error) {
            console.error('复制LaTeX代码失败:', error);
            this.showCopyError();
        }
    }

    /**
     * 显示复制成功提示
     */
    private showCopySuccess(format: 'inline' | 'block'): void {
        const formatText = format === 'inline' ? '$...$' : '$$...$$';
        
        // 创建临时提示元素
        const toast = document.createElement('div');
        toast.textContent = `已复制 ${formatText} 格式到剪贴板`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    /**
     * 显示复制错误提示
     */
    private showCopyError(): void {
        const toast = document.createElement('div');
        toast.textContent = '复制失败，请手动复制';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--background-modifier-error);
            color: var(--text-error);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    /**
     * 检查是否可见
     */
    isShowing(): boolean {
        return this.isVisible;
    }

    /**
     * 组件卸载时的清理
     */
    onunload(): void {
        this.hide();
        this.removeInputListener();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.latex-preview-widget:hover {
    box-shadow: var(--shadow-l);
}

.latex-preview-content .math {
    text-align: center;
    margin: 0;
}

.latex-preview-content .latex-render-error {
    color: var(--text-error);
    font-family: var(--font-monospace);
    font-size: 12px;
}
`;

if (!document.head.querySelector('style[data-latex-preview]')) {
    style.setAttribute('data-latex-preview', 'true');
    document.head.appendChild(style);
}