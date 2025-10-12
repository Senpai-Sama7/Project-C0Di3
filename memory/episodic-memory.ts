import { IMemory, MemoryItem } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

export class EpisodicMemory implements IMemory {
  private events: MemoryItem[] = [];
  private encryptionKey: string | null = null;

  constructor(options?: { encryptionKey?: string }) {
    if (options?.encryptionKey) {
      this.encryptionKey = options.encryptionKey;
    }
  }

  async add(item: MemoryItem): Promise<void> {
    this.events.push(item);
  }

  async get(key: string): Promise<MemoryItem | null> {
    return this.events.find(event => event.key === key) || null;
  }

  async getAll(): Promise<MemoryItem[]> {
    return this.events;
  }

  async find(query: string): Promise<MemoryItem[]> {
    return this.events.filter(event =>
      (event.content && typeof event.content === 'object' && !Array.isArray(event.content)
        ? Object.values(event.content)
        : []).some(value =>
        typeof value === 'string' && value.includes(query)
      )
    );
  }

  async clear(): Promise<void> {
    this.events = [];
  }

  async remove(key: string): Promise<void> {
    this.events = this.events.filter(event => event.key !== key);
  }

  async count(): Promise<number> {
    return this.events.length;
  }

  async update(key: string, newItem: MemoryItem): Promise<void> {
    const index = this.events.findIndex(event => event.key === key);
    if (index !== -1) {
      this.events[index] = newItem;
    } else {
      throw new Error(`Item with key ${key} not found.`);
    }
  }

  async load(filePath: string): Promise<void> {
    try {
      if (await fs.pathExists(filePath)) {
        let rawData = await fs.readFile(filePath, 'utf-8');
        
        // Decrypt if encryption key is available
        if (this.encryptionKey) {
          rawData = this.decrypt(rawData);
        }
        
        const data = JSON.parse(rawData);
        this.events = data.events || [];
        console.log(`EpisodicMemory loaded from ${filePath}: ${this.events.length} events`);
      } else {
        console.log(`EpisodicMemory: No persistence file found at ${filePath}. Starting fresh.`);
      }
    } catch (error) {
      console.error(`EpisodicMemory: Failed to load from ${filePath}:`, error);
      this.events = [];
    }
  }

  async persist(filePath: string): Promise<void> {
    try {
      const data = { events: this.events, timestamp: Date.now() };
      let dataToPersist = JSON.stringify(data, null, 2);
      
      // Encrypt if encryption key is available
      if (this.encryptionKey) {
        dataToPersist = this.encrypt(dataToPersist);
      }
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));
      
      // Write to file
      await fs.writeFile(filePath, dataToPersist, 'utf-8');
      console.log(`EpisodicMemory persisted to ${filePath}: ${this.events.length} events`);
    } catch (error) {
      console.error(`EpisodicMemory: Failed to persist to ${filePath}:`, error);
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      return data;
    }

    const key = crypto.scryptSync(this.encryptionKey, 'episodic-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    });
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      return encryptedData;
    }

    const { iv, authTag, data } = JSON.parse(encryptedData);
    const key = crypto.scryptSync(this.encryptionKey, 'episodic-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
