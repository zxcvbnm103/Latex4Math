import { App, Notice, Menu, MarkdownView } from 'obsidian';
import { NeuralLatexConverter } from './NeuralLatexConverter';
import { MathTerm } from '../types';

/**
 * LaTeX复制助手 - 提供便捷的LaTeX代码复制功能
 */
export class LaTeXCopyHelper {
    private app: App;
    private converter: NeuralLatexConverter;

    constructor(app: App, converter: NeuralLatexConverter) {
        this.app = app;
        this.converter = converter;
    }

    /**
     * 为术语元素添加右键菜单
     */
    addContextMenuToTerm(element: HTMLElement, term: MathTerm): void {
        element.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.showTermContextMenu(event, term);
        });
    }

    /**
     * 显示术语的右键菜单
     */
    private showTermContextMenu(event: MouseEvent, term: MathTerm): void {
        const menu = new Menu();

        // 复制LaTeX代码 (内联格式)
        menu.addItem((item) => {
            item.setTitle('复制 $...$')
                .setIcon('copy')
                .onClick(async () => {
                    await this.copyTermLatex(term, 'inline');
                });
        });

        // 复制LaTeX代码 (块格式)
        menu.addItem((item) => {
            item.setTitle('复制 $$...$$')
                .setIcon('copy')
                .onClick(async () => {
                    await this.copyTermLatex(term, 'block');
                });
        });

        // 分隔符
        menu.addSeparator();

        // 复制术语名称
        menu.addItem((item) => {
            item.setTitle('复制术语名称')
                .setIcon('text')
                .onClick(async () => {
                    await this.copyToClipboard(term.chineseName);
                    new Notice(`已复制术语名称: ${term.chineseName}`);
                });
        });

        // 如果有英文名称，也提供复制选项
        if (term.englishName) {
            menu.addItem((item) => {
                item.setTitle('复制英文名称')
                    .setIcon('text')
                    .onClick(async () => {
                        await this.copyToClipboard(term.englishName!);
                        new Notice(`已复制英文名称: ${term.englishName}`);
                    });
            });
        }

        // 分隔符
        menu.addSeparator();

        // 插入到当前编辑器
        menu.addItem((item) => {
            item.setTitle('插入到当前位置')
                .setIcon('plus')
                .onClick(() => {
                    this.insertLatexToEditor(term);
                });
        });

        // 显示菜单
        menu.showAtMouseEvent(event);
    }

    /**
     * 复制术语的LaTeX代码
     */
    private async copyTermLatex(term: MathTerm, format: 'inline' | 'block'): Promise<void> {
        try {
            await this.converter.copyLatexToClipboard(term.latexCode, format);
            
            const formatText = format === 'inline' ? '$...$' : '$$...$$';
            new Notice(`已复制 ${term.chineseName} 的 LaTeX 代码 (${formatText})`);
            
        } catch (error) {
            console.error('复制LaTeX代码失败:', error);
            new Notice('复制失败，请重试');
        }
    }

    /**
     * 插入LaTeX代码到当前编辑器
     */
    private insertLatexToEditor(term: MathTerm): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('请先打开一个Markdown文件');
            return;
        }

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        
        // 检查当前上下文，决定使用内联还是块格式
        const currentLine = editor.getLine(cursor.line);
        const isEmptyLine = currentLine.trim().length === 0;
        
        let latexText: string;
        if (isEmptyLine || this.shouldUseBlockFormat(term.latexCode)) {
            // 使用块格式
            latexText = `$$\n${term.latexCode}\n$$`;
        } else {
            // 使用内联格式
            latexText = `$${term.latexCode}$`;
        }
        
        editor.replaceRange(latexText, cursor);
        
        // 移动光标到合适位置
        if (latexText.startsWith('$$')) {
            editor.setCursor(cursor.line + 1, term.latexCode.length);
        } else {
            editor.setCursor(cursor.line, cursor.ch + latexText.length);
        }
        
        new Notice(`已插入 ${term.chineseName} 的 LaTeX 代码`);
    }

    /**
     * 判断是否应该使用块格式
     */
    private shouldUseBlockFormat(latexCode: string): boolean {
        // 复杂的LaTeX代码使用块格式
        const blockIndicators = [
            '\\begin{',
            '\\end{',
            '\\frac{',
            '\\int_',
            '\\sum_',
            '\\prod_',
            '\\lim_',
            '\\\\'  // 换行符
        ];
        
        return blockIndicators.some(indicator => latexCode.includes(indicator)) ||
               latexCode.length > 20;
    }

    /**
     * 创建LaTeX快速插入按钮
     */
    createQuickInsertButton(container: HTMLElement, term: MathTerm): HTMLElement {
        const button = container.createEl('button', {
            text: 'LaTeX',
            cls: 'latex-quick-insert-btn'
        });
        
        button.style.cssText = `
            font-size: 11px;
            padding: 2px 6px;
            margin-left: 8px;
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            opacity: 0.8;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.opacity = '1';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.opacity = '0.8';
        });
        
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.showQuickInsertMenu(event, term);
        });
        
        return button;
    }

    /**
     * 显示快速插入菜单
     */
    private showQuickInsertMenu(event: MouseEvent, term: MathTerm): void {
        const menu = new Menu();

        // 插入内联格式
        menu.addItem((item) => {
            item.setTitle('插入内联格式 ($...$)')
                .setIcon('plus-circle')
                .onClick(() => {
                    this.insertLatexToEditorWithFormat(term, 'inline');
                });
        });

        // 插入块格式
        menu.addItem((item) => {
            item.setTitle('插入块格式 ($$...$$)')
                .setIcon('plus-square')
                .onClick(() => {
                    this.insertLatexToEditorWithFormat(term, 'block');
                });
        });

        // 分隔符
        menu.addSeparator();

        // 复制到剪贴板
        menu.addItem((item) => {
            item.setTitle('复制到剪贴板')
                .setIcon('copy')
                .onClick(async () => {
                    await this.copyTermLatex(term, 'inline');
                });
        });

        menu.showAtMouseEvent(event);
    }

    /**
     * 以指定格式插入LaTeX到编辑器
     */
    private insertLatexToEditorWithFormat(term: MathTerm, format: 'inline' | 'block'): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('请先打开一个Markdown文件');
            return;
        }

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        
        let latexText: string;
        if (format === 'block') {
            latexText = `$$\n${term.latexCode}\n$$`;
        } else {
            latexText = `$${term.latexCode}$`;
        }
        
        editor.replaceRange(latexText, cursor);
        
        // 移动光标
        if (format === 'block') {
            editor.setCursor(cursor.line + 1, term.latexCode.length);
        } else {
            editor.setCursor(cursor.line, cursor.ch + latexText.length);
        }
        
        const formatText = format === 'inline' ? '内联' : '块';
        new Notice(`已插入 ${term.chineseName} 的 LaTeX 代码 (${formatText}格式)`);
    }

    /**
     * 批量复制多个术语的LaTeX代码
     */
    async copyMultipleTermsLatex(terms: MathTerm[], format: 'inline' | 'block' = 'inline'): Promise<void> {
        if (terms.length === 0) {
            new Notice('没有选择任何术语');
            return;
        }

        try {
            const latexCodes = terms.map(term => {
                if (format === 'block') {
                    return `$$\n${term.latexCode}\n$$`;
                } else {
                    return `$${term.latexCode}$`;
                }
            });
            
            const combinedLatex = latexCodes.join('\n\n');
            await this.copyToClipboard(combinedLatex);
            
            const formatText = format === 'inline' ? '内联' : '块';
            new Notice(`已复制 ${terms.length} 个术语的 LaTeX 代码 (${formatText}格式)`);
            
        } catch (error) {
            console.error('批量复制LaTeX代码失败:', error);
            new Notice('复制失败，请重试');
        }
    }

    /**
     * 通用的剪贴板复制方法
     */
    private async copyToClipboard(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            // 降级到传统方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    /**
     * 为页面上的所有术语元素添加LaTeX复制功能
     */
    enhanceTermElements(container: HTMLElement = document.body): void {
        const termElements = container.querySelectorAll('[data-term-id]');
        
        termElements.forEach((element) => {
            const termId = element.getAttribute('data-term-id');
            if (termId && element instanceof HTMLElement) {
                // 这里需要从数据库获取术语信息
                // 暂时跳过，等数据库集成完成后实现
                console.log('增强术语元素:', termId);
            }
        });
    }
}