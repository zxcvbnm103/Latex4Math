// 导出所有存储相关的模块
export { DatabaseManager } from './DatabaseManager';
export { DataModelFactory } from './DataModelFactory';
export { MigrationManager } from './MigrationManager';
export { DataAccessLayer } from './DataAccessLayer';
export { DataIntegrityChecker } from './DataIntegrityChecker';
export { StorageTest } from './StorageTest';

// 导出存储相关的类型和接口
export interface StorageConfig {
    autoSaveInterval: number;
    maxBackups: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
}

export interface BackupMetadata {
    version: string;
    timestamp: string;
    size: number;
    checksum: string;
}

export interface MigrationResult {
    success: boolean;
    fromVersion: string;
    toVersion: string;
    migrationsApplied: string[];
    errors?: string[];
    warnings?: string[];
}

export interface DataIntegrityReport {
    totalTerms: number;
    totalRelations: number;
    orphanedRelations: number;
    duplicateTerms: number;
    corruptedEntries: number;
    lastChecked: Date;
    recommendations: string[];
}