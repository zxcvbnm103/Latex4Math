/**
 * 使用频率跟踪器
 * 负责跟踪和统计术语的使用频率
 */
export class UsageTracker {
    private usageStats: Map<string, UsageData> = new Map();
    private sessionStats: Map<string, number> = new Map();
    private isInitialized: boolean = false;
    private saveTimer: NodeJS.Timeout | null = null;

    /**
     * 初始化使用频率跟踪器
     */
    async initialize(): Promise<void> {
        console.log('UsageTracker: 初始化使用频率跟踪器...');
        
        try {
            // 加载历史数据
            await this.loadUsageData();
            
            // 启动定期保存
            this.startPeriodicSave();
            
            this.isInitialized = true;
            console.log('UsageTracker: 使用频率跟踪器初始化完成');
        } catch (error) {
            console.error('UsageTracker: 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 记录术语使用
     */
    async recordUsage(termName: string, context?: UsageContext): Promise<void> {
        if (!this.isInitialized) {
            console.warn('UsageTracker: 跟踪器未初始化');
            return;
        }

        try {
            // 更新总体统计
            if (!this.usageStats.has(termName)) {
                this.usageStats.set(termName, {
                    termName,
                    totalCount: 0,
                    dailyCount: new Map(),
                    lastUsed: new Date(),
                    firstUsed: new Date(),
                    contexts: []
                });
            }

            const usageData = this.usageStats.get(termName)!;
            usageData.totalCount++;
            usageData.lastUsed = new Date();

            // 更新日统计
            const today = this.getDateKey(new Date());
            const currentDailyCount = usageData.dailyCount.get(today) || 0;
            usageData.dailyCount.set(today, currentDailyCount + 1);

            // 记录上下文（保留最近的10个）
            if (context) {
                usageData.contexts.unshift(context);
                if (usageData.contexts.length > 10) {
                    usageData.contexts = usageData.contexts.slice(0, 10);
                }
            }

            // 更新会话统计
            const sessionCount = this.sessionStats.get(termName) || 0;
            this.sessionStats.set(termName, sessionCount + 1);

            console.log(`UsageTracker: 记录术语使用 - ${termName} (总计: ${usageData.totalCount})`);
        } catch (error) {
            console.error('UsageTracker: 记录使用失败:', error);
        }
    }

    /**
     * 初始化术语
     */
    async initializeTerm(termName: string): Promise<void> {
        if (!this.usageStats.has(termName)) {
            this.usageStats.set(termName, {
                termName,
                totalCount: 0,
                dailyCount: new Map(),
                lastUsed: new Date(),
                firstUsed: new Date(),
                contexts: []
            });
            
            console.log(`UsageTracker: 初始化术语 - ${termName}`);
        }
    }

    /**
     * 获取术语使用次数
     */
    getUsageCount(termName: string): number {
        const usageData = this.usageStats.get(termName);
        return usageData ? usageData.totalCount : 0;
    }

    /**
     * 获取术语今日使用次数
     */
    getTodayUsageCount(termName: string): number {
        const usageData = this.usageStats.get(termName);
        if (!usageData) return 0;

        const today = this.getDateKey(new Date());
        return usageData.dailyCount.get(today) || 0;
    }

    /**
     * 获取会话使用次数
     */
    getSessionUsageCount(termName: string): number {
        return this.sessionStats.get(termName) || 0;
    }

    /**
     * 获取使用统计
     */
    async getStatistics(): Promise<Map<string, number>> {
        const stats = new Map<string, number>();
        
        Array.from(this.usageStats.entries()).forEach(([termName, usageData]) => {
            stats.set(termName, usageData.totalCount);
        });
        
        return stats;
    }

    /**
     * 获取详细统计信息
     */
    async getDetailedStatistics(): Promise<UsageStatistics> {
        const totalTerms = this.usageStats.size;
        const totalUsages = Array.from(this.usageStats.values())
            .reduce((sum, data) => sum + data.totalCount, 0);

        // 最常用术语（前10个）
        const mostUsedTerms = Array.from(this.usageStats.entries())
            .sort(([, a], [, b]) => b.totalCount - a.totalCount)
            .slice(0, 10)
            .map(([termName, data]) => ({
                termName,
                count: data.totalCount,
                lastUsed: data.lastUsed
            }));

        // 今日活跃术语
        const today = this.getDateKey(new Date());
        const todayActiveTerms = Array.from(this.usageStats.entries())
            .filter(([, data]) => data.dailyCount.has(today))
            .map(([termName, data]) => ({
                termName,
                count: data.dailyCount.get(today)!,
                totalCount: data.totalCount
            }))
            .sort((a, b) => b.count - a.count);

        // 最近使用的术语
        const recentlyUsedTerms = Array.from(this.usageStats.entries())
            .sort(([, a], [, b]) => b.lastUsed.getTime() - a.lastUsed.getTime())
            .slice(0, 10)
            .map(([termName, data]) => ({
                termName,
                lastUsed: data.lastUsed,
                totalCount: data.totalCount
            }));

        return {
            totalTerms,
            totalUsages,
            mostUsedTerms,
            todayActiveTerms,
            recentlyUsedTerms,
            sessionStats: new Map(this.sessionStats)
        };
    }

    /**
     * 获取术语使用趋势
     */
    async getUsageTrend(termName: string, days: number = 7): Promise<UsageTrend[]> {
        const usageData = this.usageStats.get(termName);
        if (!usageData) return [];

        const trend: UsageTrend[] = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = this.getDateKey(date);
            
            const count = usageData.dailyCount.get(dateKey) || 0;
            trend.push({
                date: new Date(date),
                count,
                dateKey
            });
        }

        return trend;
    }

    /**
     * 清理旧数据
     */
    async cleanupOldData(daysToKeep: number = 30): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffKey = this.getDateKey(cutoffDate);

        let cleanedCount = 0;

        for (const usageData of this.usageStats.values()) {
            const keysToDelete: string[] = [];
            
            for (const [dateKey] of usageData.dailyCount) {
                if (dateKey < cutoffKey) {
                    keysToDelete.push(dateKey);
                }
            }
            
            for (const key of keysToDelete) {
                usageData.dailyCount.delete(key);
                cleanedCount++;
            }
        }

        console.log(`UsageTracker: 清理了 ${cleanedCount} 条旧数据`);
        await this.saveUsageData();
    }

    /**
     * 重置会话统计
     */
    resetSessionStats(): void {
        this.sessionStats.clear();
        console.log('UsageTracker: 会话统计已重置');
    }

    /**
     * 加载使用数据
     */
    private async loadUsageData(): Promise<void> {
        try {
            // 从localStorage加载数据（简化实现）
            const savedData = localStorage.getItem('math-memory-graph-usage-stats');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                
                for (const [termName, data] of Object.entries(parsed)) {
                    const usageData = data as any;
                    this.usageStats.set(termName, {
                        termName,
                        totalCount: usageData.totalCount || 0,
                        dailyCount: new Map(Object.entries(usageData.dailyCount || {})),
                        lastUsed: new Date(usageData.lastUsed),
                        firstUsed: new Date(usageData.firstUsed),
                        contexts: usageData.contexts || []
                    });
                }
                
                console.log(`UsageTracker: 加载了 ${this.usageStats.size} 个术语的使用数据`);
            }
        } catch (error) {
            console.error('UsageTracker: 加载使用数据失败:', error);
        }
    }

    /**
     * 保存使用数据
     */
    private async saveUsageData(): Promise<void> {
        try {
            const dataToSave: Record<string, any> = {};
            
            for (const [termName, usageData] of this.usageStats) {
                dataToSave[termName] = {
                    termName: usageData.termName,
                    totalCount: usageData.totalCount,
                    dailyCount: Object.fromEntries(usageData.dailyCount),
                    lastUsed: usageData.lastUsed.toISOString(),
                    firstUsed: usageData.firstUsed.toISOString(),
                    contexts: usageData.contexts
                };
            }
            
            localStorage.setItem('math-memory-graph-usage-stats', JSON.stringify(dataToSave));
            console.log('UsageTracker: 使用数据已保存');
        } catch (error) {
            console.error('UsageTracker: 保存使用数据失败:', error);
        }
    }

    /**
     * 启动定期保存
     */
    private startPeriodicSave(): void {
        // 每5分钟保存一次
        this.saveTimer = setInterval(async () => {
            await this.saveUsageData();
        }, 5 * 60 * 1000);
    }

    /**
     * 获取日期键
     */
    private getDateKey(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * 清理资源
     */
    cleanup(): void {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
        
        // 最后保存一次
        this.saveUsageData();
        
        console.log('UsageTracker: 资源清理完成');
    }
}

// 类型定义
interface UsageData {
    termName: string;
    totalCount: number;
    dailyCount: Map<string, number>;
    lastUsed: Date;
    firstUsed: Date;
    contexts: UsageContext[];
}

interface UsageContext {
    noteId: string;
    notePath: string;
    surroundingText: string;
    timestamp: Date;
}

interface UsageStatistics {
    totalTerms: number;
    totalUsages: number;
    mostUsedTerms: Array<{
        termName: string;
        count: number;
        lastUsed: Date;
    }>;
    todayActiveTerms: Array<{
        termName: string;
        count: number;
        totalCount: number;
    }>;
    recentlyUsedTerms: Array<{
        termName: string;
        lastUsed: Date;
        totalCount: number;
    }>;
    sessionStats: Map<string, number>;
}

interface UsageTrend {
    date: Date;
    count: number;
    dateKey: string;
}