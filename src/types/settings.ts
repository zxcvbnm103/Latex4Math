/**
 * 插件设置接口
 */
export interface MathMemoryGraphSettings {
    // 基本功能开关
    enableAutoRecognition: boolean;
    enableGraphView: boolean;
    enableMathInput: boolean;
    
    // 识别设置
    recognitionSensitivity: number;
    customTermsPath: string;
    
    // 术语文件管理
    termFolderPath: string;
    autoCreateTermFiles: boolean;
    autoLinkTerms: boolean;
    
    // 快捷键设置
    shortcutKeys: {
        toggleMathInput: string;
        openGraphView: string;
        recognizeTerms: string;
    };
    
    // 高级设置
    maxTermsPerNote: number;
    autoSaveInterval: number;
    enableDebugMode: boolean;
    
    // 图谱设置
    graphLayout: 'force' | 'circular' | 'hierarchical';
    nodeSize: { min: number; max: number };
    showLabels: boolean;
    
    // LaTeX设置
    latexRenderer: 'mathjax' | 'katex' | 'obsidian';
    customLatexCommands: Record<string, string>;
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: MathMemoryGraphSettings = {
    // 基本功能开关
    enableAutoRecognition: true,
    enableGraphView: true,
    enableMathInput: true,
    
    // 识别设置
    recognitionSensitivity: 0.7,
    customTermsPath: '',
    
    // 术语文件管理
    termFolderPath: '图谱',
    autoCreateTermFiles: true,
    autoLinkTerms: true,
    
    // 快捷键设置
    shortcutKeys: {
        toggleMathInput: 'Ctrl+M',
        openGraphView: 'Ctrl+Shift+G',
        recognizeTerms: 'Ctrl+Shift+R'
    },
    
    // 高级设置
    maxTermsPerNote: 100,
    autoSaveInterval: 5000, // 5秒
    enableDebugMode: false,
    
    // 图谱设置
    graphLayout: 'force',
    nodeSize: { min: 10, max: 50 },
    showLabels: true,
    
    // LaTeX设置
    latexRenderer: 'obsidian',
    customLatexCommands: {}
};

/**
 * 设置验证器
 */
export class SettingsValidator {
    /**
     * 验证设置对象的有效性
     */
    static validate(settings: Partial<MathMemoryGraphSettings>): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证识别敏感度
        if (settings.recognitionSensitivity !== undefined) {
            if (settings.recognitionSensitivity < 0.1 || settings.recognitionSensitivity > 1.0) {
                errors.push('识别敏感度必须在0.1到1.0之间');
            }
        }

        // 验证节点大小设置
        if (settings.nodeSize) {
            if (settings.nodeSize.min >= settings.nodeSize.max) {
                errors.push('节点最小尺寸必须小于最大尺寸');
            }
            if (settings.nodeSize.min < 5 || settings.nodeSize.max > 100) {
                warnings.push('建议节点尺寸在5到100之间');
            }
        }

        // 验证自动保存间隔
        if (settings.autoSaveInterval !== undefined) {
            if (settings.autoSaveInterval < 1000) {
                warnings.push('自动保存间隔过短可能影响性能');
            }
        }

        // 验证最大术语数量
        if (settings.maxTermsPerNote !== undefined) {
            if (settings.maxTermsPerNote < 10) {
                warnings.push('每个笔记的最大术语数量过少可能影响功能');
            }
            if (settings.maxTermsPerNote > 1000) {
                warnings.push('每个笔记的最大术语数量过多可能影响性能');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 合并设置，确保所有必需字段都存在
     */
    static merge(userSettings: Partial<MathMemoryGraphSettings>): MathMemoryGraphSettings {
        return {
            ...DEFAULT_SETTINGS,
            ...userSettings,
            // 确保嵌套对象正确合并
            shortcutKeys: {
                ...DEFAULT_SETTINGS.shortcutKeys,
                ...(userSettings.shortcutKeys || {})
            },
            nodeSize: {
                ...DEFAULT_SETTINGS.nodeSize,
                ...(userSettings.nodeSize || {})
            },
            customLatexCommands: {
                ...DEFAULT_SETTINGS.customLatexCommands,
                ...(userSettings.customLatexCommands || {})
            }
        };
    }
}