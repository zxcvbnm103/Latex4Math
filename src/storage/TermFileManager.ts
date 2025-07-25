import { App, TFile, TFolder, Notice } from 'obsidian';
import { MathTerm, RecognizedTerm, TermRelation } from '../types';

/**
 * 术语文件管理器
 * 负责将识别的术语保存到用户指定的文件夹，并建立Obsidian双链关系
 */
export class TermFileManager {
    private app: App;
    private termFolderPath: string;
    private isInitialized: boolean = false;

    constructor(app: App, termFolderPath: string = '图谱') {
        this.app = app;
        this.termFolderPath = termFolderPath;
    }

    /**
     * 初始化术语文件管理器
     */
    async initialize(): Promise<void> {
        console.log('TermFileManager: 初始化术语文件管理器...');
        
        try {
            // 确保术语文件夹存在
            await this.ensureTermFolder();
            
            this.isInitialized = true;
            console.log(`TermFileManager: 术语文件管理器初始化完成，文件夹路径: ${this.termFolderPath}`);
        } catch (error) {
            console.error('TermFileManager: 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置术语文件夹路径
     */
    setTermFolderPath(path: string): void {
        this.termFolderPath = path || '图谱';
    }

    /**
     * 获取当前术语文件夹路径
     */
    getTermFolderPath(): string {
        return this.termFolderPath;
    }

    /**
     * 保存术语到文件
     */
    async saveTermToFile(term: MathTerm, relatedTerms: MathTerm[] = []): Promise<TFile | null> {
        if (!this.isInitialized) {
            throw new Error('术语文件管理器未初始化');
        }

        try {
            // 确保术语文件夹存在
            await this.ensureTermFolder();

            // 生成术语文件名
            const fileName = this.generateTermFileName(term.chineseName);
            const filePath = `${this.termFolderPath}/${fileName}`;

            // 检查文件是否已存在
            const existingFile = this.app.vault.getAbstractFileByPath(filePath);
            if (existingFile instanceof TFile) {
                // 文件已存在，更新内容
                return await this.updateTermFile(existingFile, term, relatedTerms);
            } else {
                // 创建新文件
                return await this.createTermFile(filePath, term, relatedTerms);
            }
        } catch (error) {
            console.error('TermFileManager: 保存术语文件失败:', error);
            return null;
        }
    }

    /**
     * 批量保存术语到文件
     */
    async saveTermsToFiles(terms: MathTerm[], termRelations: Map<string, MathTerm[]> = new Map()): Promise<TFile[]> {
        const savedFiles: TFile[] = [];

        for (const term of terms) {
            const relatedTerms = termRelations.get(term.id) || [];
            const file = await this.saveTermToFile(term, relatedTerms);
            if (file) {
                savedFiles.push(file);
            }
        }

        console.log(`TermFileManager: 批量保存了 ${savedFiles.length} 个术语文件`);
        return savedFiles;
    }

    /**
     * 从识别结果创建术语文件
     */
    async createTermFilesFromRecognition(recognizedTerms: RecognizedTerm[], sourceFile: TFile): Promise<TFile[]> {
        const savedFiles: TFile[] = [];

        for (const recognizedTerm of recognizedTerms) {
            // 将识别结果转换为术语对象
            const term: MathTerm = {
                id: this.generateTermId(recognizedTerm.text),
                chineseName: recognizedTerm.text,
                englishName: '',
                category: recognizedTerm.category,
                definition: '',
                aliases: [],
                latexCode: recognizedTerm.latexCode || '',
                examples: [],
                relatedTerms: [],
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                sourceFiles: [sourceFile.path],
                usageCount: 1,
                confidence: recognizedTerm.confidence
            };

            const file = await this.saveTermToFile(term);
            if (file) {
                savedFiles.push(file);
            }
        }

        return savedFiles;
    }

    /**
     * 更新源文件中的术语链接
     */
    async updateTermLinksInFile(file: TFile, recognizedTerms: RecognizedTerm[]): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            let modifiedContent = content;
            let hasChanges = false;

            // 按位置倒序排列，避免索引偏移
            const sortedTerms = recognizedTerms
                .filter(term => term.confidence > 0.5) // 只处理高置信度的术语
                .sort((a, b) => b.startIndex - a.startIndex);

            for (const term of sortedTerms) {
                // 检查是否已经是链接
                const beforeText = content.substring(Math.max(0, term.startIndex - 2), term.startIndex);
                const afterText = content.substring(term.endIndex, Math.min(content.length, term.endIndex + 2));
                
                if (beforeText.includes('[[') || afterText.includes(']]')) {
                    continue; // 已经是链接，跳过
                }

                // 创建指向术语文件的双链
                const termFileName = this.generateTermFileName(term.text);
                const linkText = `[[${this.termFolderPath}/${termFileName.replace('.md', '')}|${term.text}]]`;
                
                modifiedContent = modifiedContent.substring(0, term.startIndex) + 
                                linkText + 
                                modifiedContent.substring(term.endIndex);
                hasChanges = true;
            }

            if (hasChanges) {
                await this.app.vault.modify(file, modifiedContent);
                console.log(`TermFileManager: 在 ${file.name} 中创建了 ${sortedTerms.length} 个术语链接`);
            }
        } catch (error) {
            console.error('TermFileManager: 更新术语链接失败:', error);
        }
    }

    /**
     * 获取术语文件夹中的所有术语文件
     */
    async getTermFiles(): Promise<TFile[]> {
        const termFolder = this.app.vault.getAbstractFileByPath(this.termFolderPath);
        if (!(termFolder instanceof TFolder)) {
            return [];
        }

        const termFiles: TFile[] = [];
        for (const child of termFolder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                termFiles.push(child);
            }
        }

        return termFiles;
    }

    /**
     * 从术语文件中读取术语信息
     */
    async readTermFromFile(file: TFile): Promise<MathTerm | null> {
        try {
            const content = await this.app.vault.read(file);
            const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;

            if (!frontmatter) {
                return null;
            }

            // 从frontmatter中解析术语信息
            const term: MathTerm = {
                id: frontmatter.id || this.generateTermId(file.basename),
                chineseName: frontmatter.chineseName || file.basename,
                englishName: frontmatter.englishName || '',
                category: frontmatter.category || 'unknown',
                definition: frontmatter.definition || '',
                aliases: frontmatter.aliases || [],
                latexCode: frontmatter.latexCode || '',
                examples: frontmatter.examples || [],
                relatedTerms: frontmatter.relatedTerms || [],
                tags: frontmatter.tags || [],
                createdAt: new Date(frontmatter.createdAt || file.stat.ctime),
                updatedAt: new Date(frontmatter.updatedAt || file.stat.mtime),
                sourceFiles: frontmatter.sourceFiles || [],
                usageCount: frontmatter.usageCount || 0,
                confidence: frontmatter.confidence || 1.0
            };

            return term;
        } catch (error) {
            console.error('TermFileManager: 读取术语文件失败:', error);
            return null;
        }
    }

    /**
     * 确保术语文件夹存在
     */
    private async ensureTermFolder(): Promise<void> {
        const folder = this.app.vault.getAbstractFileByPath(this.termFolderPath);
        if (!folder) {
            await this.app.vault.createFolder(this.termFolderPath);
            console.log(`TermFileManager: 创建术语文件夹: ${this.termFolderPath}`);
        }
    }

    /**
     * 生成术语文件名
     */
    private generateTermFileName(termName: string): string {
        // 清理文件名中的非法字符
        const cleanName = termName
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, '_')
            .trim();
        
        return `${cleanName}.md`;
    }

    /**
     * 生成术语ID
     */
    private generateTermId(termName: string): string {
        return `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 创建术语文件
     */
    private async createTermFile(filePath: string, term: MathTerm, relatedTerms: MathTerm[]): Promise<TFile> {
        const content = this.generateTermFileContent(term, relatedTerms);
        const file = await this.app.vault.create(filePath, content);
        console.log(`TermFileManager: 创建术语文件: ${filePath}`);
        return file;
    }

    /**
     * 更新术语文件
     */
    private async updateTermFile(file: TFile, term: MathTerm, relatedTerms: MathTerm[]): Promise<TFile> {
        const content = this.generateTermFileContent(term, relatedTerms);
        await this.app.vault.modify(file, content);
        console.log(`TermFileManager: 更新术语文件: ${file.path}`);
        return file;
    }

    /**
     * 生成术语文件内容
     */
    private generateTermFileContent(term: MathTerm, relatedTerms: MathTerm[]): string {
        const frontmatter = {
            id: term.id,
            chineseName: term.chineseName,
            englishName: term.englishName,
            category: term.category,
            definition: term.definition,
            aliases: term.aliases,
            latexCode: term.latexCode,
            examples: term.examples,
            relatedTerms: term.relatedTerms,
            tags: term.tags,
            createdAt: term.createdAt.toISOString(),
            updatedAt: new Date().toISOString(),
            sourceFiles: term.sourceFiles,
            usageCount: term.usageCount,
            confidence: term.confidence
        };

        let content = '---\n';
        for (const [key, value] of Object.entries(frontmatter)) {
            if (Array.isArray(value)) {
                content += `${key}:\n`;
                for (const item of value) {
                    content += `  - ${item}\n`;
                }
            } else {
                content += `${key}: ${value}\n`;
            }
        }
        content += '---\n\n';

        // 添加术语标题
        content += `# ${term.chineseName}\n\n`;

        // 添加英文名称
        if (term.englishName) {
            content += `**英文名称**: ${term.englishName}\n\n`;
        }

        // 添加类别
        content += `**类别**: ${term.category}\n\n`;

        // 添加定义
        if (term.definition) {
            content += `## 定义\n\n${term.definition}\n\n`;
        }

        // 添加LaTeX代码
        if (term.latexCode) {
            content += `## LaTeX 表示\n\n\`\`\`latex\n${term.latexCode}\n\`\`\`\n\n`;
            content += `$$${term.latexCode}$$\n\n`;
        }

        // 添加别名
        if (term.aliases.length > 0) {
            content += `## 别名\n\n`;
            for (const alias of term.aliases) {
                content += `- ${alias}\n`;
            }
            content += '\n';
        }

        // 添加相关术语链接
        if (relatedTerms.length > 0) {
            content += `## 相关术语\n\n`;
            for (const relatedTerm of relatedTerms) {
                const relatedFileName = this.generateTermFileName(relatedTerm.chineseName);
                content += `- [[${this.termFolderPath}/${relatedFileName.replace('.md', '')}|${relatedTerm.chineseName}]]\n`;
            }
            content += '\n';
        }

        // 添加示例
        if (term.examples.length > 0) {
            content += `## 示例\n\n`;
            for (const example of term.examples) {
                content += `- ${example}\n`;
            }
            content += '\n';
        }

        // 添加标签
        if (term.tags.length > 0) {
            content += `## 标签\n\n`;
            for (const tag of term.tags) {
                content += `#${tag} `;
            }
            content += '\n\n';
        }

        // 添加元信息
        content += `## 元信息\n\n`;
        content += `- **创建时间**: ${term.createdAt.toLocaleString()}\n`;
        content += `- **更新时间**: ${new Date().toLocaleString()}\n`;
        content += `- **使用次数**: ${term.usageCount}\n`;
        content += `- **置信度**: ${(term.confidence * 100).toFixed(1)}%\n`;

        if (term.sourceFiles.length > 0) {
            content += `- **来源文件**:\n`;
            for (const sourceFile of term.sourceFiles) {
                content += `  - [[${sourceFile}]]\n`;
            }
        }

        return content;
    }
}