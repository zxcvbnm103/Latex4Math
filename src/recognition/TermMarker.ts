import { App, TFile, EditorPosition, MarkdownView } from 'obsidian';
import { RecognizedTerm, MathCategory } from '../types';

/**
 * 术语标记器
 * 负责在Obsidian编辑器中标记和高亮数学术语
 */
export class TermMarker {
    private app: App;
    private markedTerms: Map<string, Set<string>> = new Map(); // 文件路径 -> 术语集合
    private styleElement: HTMLStyleElement | null = null;

    constructor(app: App) {
        this.app = app;
        this.initializeStyles();
    }

    /**
     * 在文件中标记术语
     */
    async markTerms(file: TFile, terms: RecognizedTerm[]): Promise<void> {
        try {
            // 记录已标记的术语
            const filePath = file.path;
            if (!this.markedTerms.has(filePath)) {
                this.markedTerms.set(filePath, new Set());
            }
            
            const markedSet = this.markedTerms.get(filePath)!;
            
            // 获取活动的编辑器视图
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView || activeView.file?.path !== filePath) {
                console.log('TermMarker: 当前文件不是活动编辑器，跳过标记');
                return;
            }
            
            const editor = activeView.editor;
            const content = editor.getValue();
            
            // 按位置倒序处理，避免索引偏移
            const sortedTerms = terms.sort((a, b) => b.startIndex - a.startIndex);
            
            for (const term of sortedTerms) {
                if (markedSet.has(term.text)) {
                    continue; // 已标记过，跳过
                }
                
                // 验证位置是否仍然有效
                const actualText = content.substring(term.startIndex, term.endIndex);
                if (actualText !== term.text) {
                    console.warn(`TermMarker: 术语位置已变化: ${term.text}`);
                    continue;
                }
                
                // 添加CSS类进行高亮
                await this.addTermHighlight(editor, term);
                
                // 记录已标记
                markedSet.add(term.text);
            }
            
            console.log(`TermMarker: 在 ${file.name} 中标记了 ${terms.length} 个术语`);
            
        } catch (error) {
            console.error('TermMarker: 标记术语失败:', error);
        }
    }

    /**
     * 清除文件中的术语标记
     */
    async clearMarks(file: TFile): Promise<void> {
        const filePath = file.path;
        
        if (this.markedTerms.has(filePath)) {
            this.markedTerms.delete(filePath);
        }
        
        // 清除编辑器中的高亮
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file?.path === filePath) {
            await this.clearEditorHighlights(activeView.editor);
        }
        
        console.log(`TermMarker: 清除了 ${file.name} 中的术语标记`);
    }

    /**
     * 切换术语标记显示
     */
    toggleTermMarking(enabled: boolean): void {
        if (this.styleElement) {
            this.styleElement.disabled = !enabled;
        }
        
        console.log(`TermMarker: 术语标记显示 ${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 获取术语的颜色
     */
    getTermColor(category: MathCategory): string {
        const colorMap = new Map<MathCategory, string>([
            [MathCategory.ALGEBRA, '#ff6b6b'],        // 红色
            [MathCategory.CALCULUS, '#4ecdc4'],       // 青色
            [MathCategory.GEOMETRY, '#45b7d1'],       // 蓝色
            [MathCategory.LINEAR_ALGEBRA, '#96ceb4'], // 绿色
            [MathCategory.STATISTICS, '#feca57'],     // 黄色
            [MathCategory.PROBABILITY, '#ff9ff3'],    // 粉色
            [MathCategory.NUMBER_THEORY, '#54a0ff'], // 深蓝
            [MathCategory.ANALYSIS, '#5f27cd'],       // 紫色
            [MathCategory.TOPOLOGY, '#00d2d3'],       // 青绿
            [MathCategory.DISCRETE_MATH, '#ff6348']   // 橙红
        ]);
        
        return colorMap.get(category) || '#666666';
    }

    /**
     * 添加术语高亮
     */
    private async addTermHighlight(editor: any, term: RecognizedTerm): Promise<void> {
        try {
            // 将字符索引转换为编辑器位置
            const startPos = this.indexToPosition(editor, term.startIndex);
            const endPos = this.indexToPosition(editor, term.endIndex);
            
            if (!startPos || !endPos) {
                console.warn('TermMarker: 无法转换术语位置');
                return;
            }
            
            // 创建标记
            const className = `math-term-${term.category.replace(/\s+/g, '-').toLowerCase()}`;
            
            // 使用Obsidian的编辑器API添加装饰
            if (editor.addHighlight) {
                editor.addHighlight(startPos, endPos, className);
            } else {
                // 备用方案：直接操作DOM
                await this.addDOMHighlight(editor, startPos, endPos, className, term);
            }
            
        } catch (error) {
            console.error('TermMarker: 添加高亮失败:', error);
        }
    }

    /**
     * 添加DOM高亮（备用方案）
     */
    private async addDOMHighlight(
        editor: any, 
        startPos: EditorPosition, 
        endPos: EditorPosition, 
        className: string,
        term: RecognizedTerm
    ): Promise<void> {
        // 这是一个简化的实现，实际可能需要更复杂的DOM操作
        const editorElement = editor.containerEl;
        if (!editorElement) return;
        
        // 查找对应的文本节点并添加高亮
        const textNodes = this.findTextNodes(editorElement);
        
        for (const node of textNodes) {
            if (node.textContent && node.textContent.includes(term.text)) {
                const parent = node.parentElement;
                if (parent && !parent.classList.contains('math-term-highlight')) {
                    const span = document.createElement('span');
                    span.className = `math-term-highlight ${className}`;
                    span.title = `${term.text} (${term.category}) - 置信度: ${(term.confidence * 100).toFixed(1)}%`;
                    
                    // 替换文本节点
                    const newContent = node.textContent.replace(
                        term.text,
                        `<span class="${className}">${term.text}</span>`
                    );
                    
                    if (newContent !== node.textContent) {
                        parent.innerHTML = parent.innerHTML.replace(term.text, 
                            `<span class="math-term-highlight ${className}" title="${span.title}">${term.text}</span>`
                        );
                        break;
                    }
                }
            }
        }
    }

    /**
     * 查找文本节点
     */
    private findTextNodes(element: Element): Text[] {
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node as Text);
        }
        
        return textNodes;
    }

    /**
     * 清除编辑器高亮
     */
    private async clearEditorHighlights(editor: any): Promise<void> {
        try {
            if (editor.clearHighlights) {
                editor.clearHighlights();
            } else {
                // 备用方案：清除DOM高亮
                const editorElement = editor.containerEl;
                if (editorElement) {
                    const highlights = editorElement.querySelectorAll('.math-term-highlight');
                    highlights.forEach(highlight => {
                        const parent = highlight.parentNode;
                        if (parent) {
                            parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('TermMarker: 清除高亮失败:', error);
        }
    }

    /**
     * 将字符索引转换为编辑器位置
     */
    private indexToPosition(editor: any, index: number): EditorPosition | null {
        try {
            const content = editor.getValue();
            if (index < 0 || index > content.length) {
                return null;
            }
            
            let line = 0;
            let ch = 0;
            
            for (let i = 0; i < index; i++) {
                if (content[i] === '\n') {
                    line++;
                    ch = 0;
                } else {
                    ch++;
                }
            }
            
            return { line, ch };
        } catch (error) {
            console.error('TermMarker: 位置转换失败:', error);
            return null;
        }
    }

    /**
     * 初始化样式
     */
    private initializeStyles(): void {
        // 创建样式元素
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'math-memory-graph-term-styles';
        
        // 定义CSS样式
        const css = `
            .math-term-highlight {
                position: relative;
                cursor: pointer;
                border-radius: 3px;
                padding: 1px 2px;
                margin: 0 1px;
                transition: all 0.2s ease;
            }
            
            .math-term-highlight:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            /* 不同类别的颜色 */
            .math-term-代数 {
                background-color: rgba(255, 107, 107, 0.2);
                border-bottom: 2px solid #ff6b6b;
            }
            
            .math-term-微积分 {
                background-color: rgba(78, 205, 196, 0.2);
                border-bottom: 2px solid #4ecdc4;
            }
            
            .math-term-几何 {
                background-color: rgba(69, 183, 209, 0.2);
                border-bottom: 2px solid #45b7d1;
            }
            
            .math-term-线性代数 {
                background-color: rgba(150, 206, 180, 0.2);
                border-bottom: 2px solid #96ceb4;
            }
            
            .math-term-统计 {
                background-color: rgba(254, 202, 87, 0.2);
                border-bottom: 2px solid #feca57;
            }
            
            .math-term-概率论 {
                background-color: rgba(255, 159, 243, 0.2);
                border-bottom: 2px solid #ff9ff3;
            }
            
            .math-term-数论 {
                background-color: rgba(84, 160, 255, 0.2);
                border-bottom: 2px solid #54a0ff;
            }
            
            .math-term-数学分析 {
                background-color: rgba(95, 39, 205, 0.2);
                border-bottom: 2px solid #5f27cd;
            }
            
            .math-term-拓扑学 {
                background-color: rgba(0, 210, 211, 0.2);
                border-bottom: 2px solid #00d2d3;
            }
            
            .math-term-离散数学 {
                background-color: rgba(255, 99, 72, 0.2);
                border-bottom: 2px solid #ff6348;
            }
            
            /* 置信度指示器 */
            .math-term-highlight::after {
                content: '';
                position: absolute;
                top: -2px;
                right: -2px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background-color: #4CAF50;
                opacity: 0.8;
            }
            
            .math-term-highlight[data-confidence="low"]::after {
                background-color: #FF9800;
            }
            
            .math-term-highlight[data-confidence="very-low"]::after {
                background-color: #F44336;
            }
            
            /* 暗色主题适配 */
            .theme-dark .math-term-highlight {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .theme-dark .math-term-highlight:hover {
                background-color: rgba(255, 255, 255, 0.15);
            }
        `;
        
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
        
        console.log('TermMarker: 样式初始化完成');
    }

    /**
     * 清理资源
     */
    cleanup(): void {
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
            this.styleElement = null;
        }
        
        this.markedTerms.clear();
        console.log('TermMarker: 资源清理完成');
    }
}