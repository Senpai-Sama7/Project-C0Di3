/**
 * Generic connection pool for managing database connections and other resources
 * Implements object pooling pattern to reduce connection overhead
 */

export interface PooledResource<T> {
  resource: T;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
}

export interface ConnectionPoolOptions<T> {
  min: number; // Minimum pool size
  max: number; // Maximum pool size
  idleTimeoutMs: number; // Time before idle connection is removed
  acquireTimeoutMs: number; // Max time to wait for a connection
  factory: () => Promise<T>; // Factory to create new resources
  validator?: (resource: T) => Promise<boolean>; // Validate resource is still good
  destroyer?: (resource: T) => Promise<void>; // Clean up resource
}

export class ConnectionPool<T> {
  private pool: PooledResource<T>[] = [];
  private waitQueue: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private readonly options: ConnectionPoolOptions<T>;
  private initialized = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: ConnectionPoolOptions<T>) {
    this.options = {
      min: Math.max(1, options.min),
      max: Math.max(options.min, options.max),
      idleTimeoutMs: options.idleTimeoutMs || 30000,
      acquireTimeoutMs: options.acquireTimeoutMs || 10000,
      factory: options.factory,
      validator: options.validator,
      destroyer: options.destroyer
    };
  }

  /**
   * Initialize the pool with minimum connections
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create minimum number of connections
    const initPromises = [];
    for (let i = 0; i < this.options.min; i++) {
      initPromises.push(this.createResource());
    }

    await Promise.all(initPromises);

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleResources().catch(err => {
        console.error('Error during idle resource cleanup:', err);
      });
    }, 10000); // Run cleanup every 10 seconds

    this.initialized = true;
  }

  /**
   * Acquire a resource from the pool
   */
  async acquire(): Promise<T> {
    // Try to find an available resource
    const available = this.pool.find(pr => !pr.inUse);
    
    if (available) {
      // Validate if validator is provided
      if (this.options.validator) {
        const isValid = await this.options.validator(available.resource);
        if (!isValid) {
          // Remove invalid resource and create new one
          await this.removeResource(available);
          return this.acquire(); // Recursive call to get a new resource
        }
      }
      
      available.inUse = true;
      available.lastUsed = Date.now();
      return available.resource;
    }

    // Try to create new resource if pool not at max
    if (this.pool.length < this.options.max) {
      const pooledResource = await this.createResource();
      pooledResource.inUse = true;
      pooledResource.lastUsed = Date.now();
      return pooledResource.resource;
    }

    // Wait for a resource to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }
        reject(new Error(`Timeout acquiring resource after ${this.options.acquireTimeoutMs}ms`));
      }, this.options.acquireTimeoutMs);

      this.waitQueue.push({ resolve, reject, timeout });
    });
  }

  /**
   * Release a resource back to the pool
   */
  async release(resource: T): Promise<void> {
    const pooledResource = this.pool.find(pr => pr.resource === resource);
    
    if (!pooledResource) {
      throw new Error('Resource not found in pool');
    }

    pooledResource.inUse = false;
    pooledResource.lastUsed = Date.now();

    // If there are waiters, give them the resource
    const waiter = this.waitQueue.shift();
    if (waiter) {
      clearTimeout(waiter.timeout);
      pooledResource.inUse = true;
      waiter.resolve(resource);
    }
  }

  /**
   * Execute a function with a pooled resource, automatically releasing it
   */
  async execute<R>(fn: (resource: T) => Promise<R>): Promise<R> {
    const resource = await this.acquire();
    try {
      return await fn(resource);
    } finally {
      await this.release(resource);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    available: number;
    inUse: number;
    waiting: number;
  } {
    return {
      total: this.pool.length,
      available: this.pool.filter(pr => !pr.inUse).length,
      inUse: this.pool.filter(pr => pr.inUse).length,
      waiting: this.waitQueue.length
    };
  }

  /**
   * Drain the pool and close all connections
   */
  async drain(): Promise<void> {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Reject all waiting requests
    for (const waiter of this.waitQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Pool is being drained'));
    }
    this.waitQueue = [];

    // Close all resources
    const closePromises = this.pool.map(pr => this.destroyResource(pr));
    await Promise.all(closePromises);
    
    this.pool = [];
    this.initialized = false;
  }

  /**
   * Create a new resource and add to pool
   */
  private async createResource(): Promise<PooledResource<T>> {
    const resource = await this.options.factory();
    const pooledResource: PooledResource<T> = {
      resource,
      inUse: false,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };
    
    this.pool.push(pooledResource);
    return pooledResource;
  }

  /**
   * Remove a resource from the pool
   */
  private async removeResource(pooledResource: PooledResource<T>): Promise<void> {
    const index = this.pool.indexOf(pooledResource);
    if (index !== -1) {
      this.pool.splice(index, 1);
    }
    await this.destroyResource(pooledResource);
  }

  /**
   * Destroy a resource using the destroyer if provided
   */
  private async destroyResource(pooledResource: PooledResource<T>): Promise<void> {
    if (this.options.destroyer) {
      try {
        await this.options.destroyer(pooledResource.resource);
      } catch (error) {
        console.error('Error destroying resource:', error);
      }
    }
  }

  /**
   * Clean up idle resources that exceed idle timeout
   */
  private async cleanupIdleResources(): Promise<void> {
    const now = Date.now();
    const toRemove: PooledResource<T>[] = [];

    for (const pr of this.pool) {
      // Don't remove resources if we're at minimum
      if (this.pool.length - toRemove.length <= this.options.min) {
        break;
      }

      // Only consider idle resources
      if (!pr.inUse && (now - pr.lastUsed) > this.options.idleTimeoutMs) {
        toRemove.push(pr);
      }
    }

    // Remove idle resources
    for (const pr of toRemove) {
      await this.removeResource(pr);
    }

    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} idle resources from pool`);
    }
  }
}

/**
 * Example usage with axios for HTTP connections:
 * 
 * const httpPool = new ConnectionPool({
 *   min: 2,
 *   max: 10,
 *   idleTimeoutMs: 30000,
 *   acquireTimeoutMs: 5000,
 *   factory: async () => axios.create({ baseURL: 'https://api.example.com' })
 * });
 * 
 * await httpPool.initialize();
 * 
 * const result = await httpPool.execute(async (client) => {
 *   return await client.get('/data');
 * });
 */
