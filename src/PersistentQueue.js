/**
 * @file PersistentQueue.js
 * @description Persistent queue implementation for reliable message delivery in multi-instance environments
 */

import fs from 'fs/promises';
import path from 'path';

export class PersistentQueue {
    constructor(platform, queueName = 'default') {
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.config = platform.config;
        this.queueName = queueName;
        
        // Queue configuration
        this.queueConfig = {
            maxSize: 10000,
            persistenceInterval: 5000, // Save to disk every 5 seconds
            retryAttempts: 3,
            retryDelay: 1000,
            maxBatchSize: 50,
            processingDelay: 100, // Delay between batch processing
        };

        // Queue state
        this.queue = [];
        this.processing = false;
        this.persistenceTimer = null;
        this.processingTimer = null;
        this.stats = {
            added: 0,
            processed: 0,
            failed: 0,
            retried: 0,
            dropped: 0,
            lastPersisted: 0,
        };

        // File paths for persistence
        this.queueDir = path.join(process.cwd(), '.homebridge', 'hubitat-queue');
        this.queueFile = path.join(this.queueDir, `${queueName}.json`);
        this.backupFile = path.join(this.queueDir, `${queueName}.backup.json`);

        // Initialize persistence
        this.initializePersistence();
    }

    /**
     * Initialize persistence directory and load existing queue
     */
    async initializePersistence() {
        try {
            // Create queue directory if it doesn't exist
            await fs.mkdir(this.queueDir, { recursive: true });

            // Load existing queue from disk
            await this.loadQueue();

            // Start persistence timer
            this.persistenceTimer = setInterval(() => {
                this.persistQueue();
            }, this.queueConfig.persistenceInterval);

            // Start processing timer
            this.startProcessing();

            this.logManager.logInfo(`Persistent queue '${this.queueName}' initialized with ${this.queue.length} items`);
        } catch (error) {
            this.logManager.logError(`Failed to initialize persistent queue: ${error.message}`);
        }
    }

    /**
     * Load queue from disk
     */
    async loadQueue() {
        try {
            // Try to load main queue file
            const data = await fs.readFile(this.queueFile, 'utf8');
            const savedData = JSON.parse(data);
            
            if (savedData.queue && Array.isArray(savedData.queue)) {
                this.queue = savedData.queue;
                this.stats = { ...this.stats, ...savedData.stats };
                this.logManager.logDebug(`Loaded ${this.queue.length} items from persistent queue`);
            }
        } catch (error) {
            // Try backup file if main file fails
            try {
                const backupData = await fs.readFile(this.backupFile, 'utf8');
                const savedData = JSON.parse(backupData);
                
                if (savedData.queue && Array.isArray(savedData.queue)) {
                    this.queue = savedData.queue;
                    this.stats = { ...this.stats, ...savedData.stats };
                    this.logManager.logWarn(`Loaded ${this.queue.length} items from backup queue file`);
                }
            } catch (backupError) {
                // If both files fail, start with empty queue
                this.logManager.logDebug(`No existing queue found for '${this.queueName}', starting fresh`);
            }
        }
    }

    /**
     * Persist queue to disk
     */
    async persistQueue() {
        try {
            const queueData = {
                queue: this.queue,
                stats: this.stats,
                timestamp: Date.now(),
                queueName: this.queueName
            };

            const jsonData = JSON.stringify(queueData, null, 2);

            // Create backup of current file first
            try {
                await fs.copyFile(this.queueFile, this.backupFile);
            } catch (error) {
                // Backup creation failure is not critical
                this.logManager.logDebug(`Failed to create backup: ${error.message}`);
            }

            // Write new data
            await fs.writeFile(this.queueFile, jsonData, 'utf8');
            this.stats.lastPersisted = Date.now();

        } catch (error) {
            this.logManager.logError(`Failed to persist queue: ${error.message}`);
        }
    }

    /**
     * Add item to queue
     */
    async enqueue(item, priority = 0) {
        if (this.queue.length >= this.queueConfig.maxSize) {
            this.stats.dropped++;
            this.logManager.logWarn(`Queue '${this.queueName}' is full, dropping item`);
            return false;
        }

        const queueItem = {
            id: this.generateItemId(),
            data: item,
            priority: priority,
            timestamp: Date.now(),
            attempts: 0,
            maxAttempts: this.queueConfig.retryAttempts,
            status: 'pending'
        };

        // Insert based on priority (higher priority = earlier in queue)
        const insertIndex = this.queue.findIndex(existing => existing.priority < priority);
        if (insertIndex >= 0) {
            this.queue.splice(insertIndex, 0, queueItem);
        } else {
            this.queue.push(queueItem);
        }

        this.stats.added++;
        return true;
    }

    /**
     * Remove and return next item from queue
     */
    dequeue() {
        const item = this.queue.shift();
        if (item) {
            item.status = 'processing';
        }
        return item;
    }

    /**
     * Peek at next item without removing it
     */
    peek() {
        return this.queue[0] || null;
    }

    /**
     * Mark item as completed
     */
    markCompleted(itemId) {
        const index = this.queue.findIndex(item => item.id === itemId);
        if (index >= 0) {
            this.queue.splice(index, 1);
            this.stats.processed++;
            return true;
        }
        return false;
    }

    /**
     * Mark item as failed and handle retry
     */
    markFailed(itemId, error) {
        const index = this.queue.findIndex(item => item.id === itemId);
        if (index >= 0) {
            const item = this.queue[index];
            item.attempts++;
            item.lastError = error?.message || 'Unknown error';
            item.lastAttempt = Date.now();

            if (item.attempts >= item.maxAttempts) {
                // Max attempts reached, remove from queue
                this.queue.splice(index, 1);
                this.stats.failed++;
                this.logManager.logWarn(`Queue item ${itemId} failed after ${item.attempts} attempts: ${item.lastError}`);
            } else {
                // Schedule retry
                item.status = 'retry';
                item.nextAttempt = Date.now() + (this.queueConfig.retryDelay * Math.pow(2, item.attempts - 1));
                this.stats.retried++;
                this.logManager.logDebug(`Queue item ${itemId} scheduled for retry (attempt ${item.attempts}/${item.maxAttempts})`);
            }
            return true;
        }
        return false;
    }

    /**
     * Start queue processing
     */
    startProcessing() {
        if (this.processing) return;
        
        this.processing = true;
        this.processQueue();
    }

    /**
     * Stop queue processing
     */
    stopProcessing() {
        this.processing = false;
        if (this.processingTimer) {
            clearTimeout(this.processingTimer);
            this.processingTimer = null;
        }
    }

    /**
     * Process items in queue
     */
    async processQueue() {
        if (!this.processing) return;

        try {
            // Get ready items (pending or retry items whose time has come)
            const now = Date.now();
            const readyItems = this.queue.filter(item => 
                item.status === 'pending' || 
                (item.status === 'retry' && item.nextAttempt <= now)
            ).slice(0, this.queueConfig.maxBatchSize);

            if (readyItems.length > 0) {
                this.logManager.logDebug(`Processing ${readyItems.length} queue items`);
                
                // Process items (this would be implemented by subclasses or via callback)
                for (const item of readyItems) {
                    item.status = 'processing';
                    // Actual processing would be handled by the consumer
                }
            }

        } catch (error) {
            this.logManager.logError(`Error processing queue: ${error.message}`);
        }

        // Schedule next processing cycle
        if (this.processing) {
            this.processingTimer = setTimeout(() => {
                this.processQueue();
            }, this.queueConfig.processingDelay);
        }
    }

    /**
     * Get items ready for processing
     */
    getReadyItems(maxItems = null) {
        const now = Date.now();
        const ready = this.queue.filter(item => 
            item.status === 'pending' || 
            (item.status === 'retry' && item.nextAttempt <= now)
        );

        return maxItems ? ready.slice(0, maxItems) : ready;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const now = Date.now();
        const readyCount = this.getReadyItems().length;
        const retryCount = this.queue.filter(item => item.status === 'retry').length;
        const processingCount = this.queue.filter(item => item.status === 'processing').length;

        return {
            ...this.stats,
            queueSize: this.queue.length,
            readyItems: readyCount,
            retryItems: retryCount,
            processingItems: processingCount,
            timeSinceLastPersist: now - this.stats.lastPersisted,
            maxSize: this.queueConfig.maxSize,
            utilizationPercent: Math.round((this.queue.length / this.queueConfig.maxSize) * 100)
        };
    }

    /**
     * Clear all items from queue
     */
    async clear() {
        this.queue = [];
        this.stats = {
            added: 0,
            processed: 0,
            failed: 0,
            retried: 0,
            dropped: 0,
            lastPersisted: 0,
        };
        await this.persistQueue();
        this.logManager.logInfo(`Queue '${this.queueName}' cleared`);
    }

    /**
     * Generate unique item ID
     */
    generateItemId() {
        return `${this.queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup resources
     */
    async dispose() {
        this.stopProcessing();
        
        if (this.persistenceTimer) {
            clearInterval(this.persistenceTimer);
            this.persistenceTimer = null;
        }

        // Final persistence
        await this.persistQueue();
        
        this.logManager.logInfo(`Persistent queue '${this.queueName}' disposed with final stats:`, this.getStats());
    }
}