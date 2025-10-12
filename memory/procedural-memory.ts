import { IMemory, MemoryItem } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

export class ProceduralMemory implements IMemory {
  private procedures: Map<string, Function> = new Map();
  private encryptionKey: string | null = null;

  constructor(options?: { encryptionKey?: string }) {
    if (options?.encryptionKey) {
      this.encryptionKey = options.encryptionKey;
    }
  }

  async add(item: MemoryItem): Promise<void> {
    if (typeof item.content !== 'function') {
      throw new Error('Procedural memory can only store functions.');
    }
    this.procedures.set(item.key, item.content);
  }

  async get(key: string): Promise<MemoryItem | null> {
    const procedure = this.procedures.get(key);
    return procedure ? { key, content: procedure } : null;
  }

  async getAll(): Promise<MemoryItem[]> {
    return Array.from(this.procedures.entries()).map(([key, content]) => ({ key, content }));
  }

  async find(query: string): Promise<MemoryItem[]> {
    // Find procedures by key/name
    const results: MemoryItem[] = [];
    for (const [key, content] of this.procedures.entries()) {
      if (key.includes(query)) {
        results.push({ key, content });
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.procedures.clear();
  }

  async remove(key: string): Promise<void> {
    this.procedures.delete(key);
  }

  async count(): Promise<number> {
    return this.procedures.size;
  }

  async update(key: string, newProcedure: Function): Promise<void> {
    if (!this.procedures.has(key)) {
      throw new Error(`Procedure with key ${key} not found.`);
    }
    this.procedures.set(key, newProcedure);
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
        
        // Reconstruct procedures from stored function definitions
        if (data.procedures) {
          for (const [key, procDef] of Object.entries(data.procedures) as [string, ProcedureDefinition][]) {
            try {
              // Reconstruct function from stored code and parameters
              // Using Function constructor with proper parameter handling
              const func = new Function(...procDef.params, procDef.body);
              this.procedures.set(key, func);
            } catch (error) {
              console.error(`Failed to reconstruct procedure ${key}:`, error);
            }
          }
        }
        
        console.log(`ProceduralMemory loaded from ${filePath}: ${this.procedures.size} procedures`);
      } else {
        console.log(`ProceduralMemory: No persistence file found at ${filePath}. Starting fresh.`);
      }
    } catch (error) {
      console.error(`ProceduralMemory: Failed to load from ${filePath}:`, error);
      this.procedures = new Map();
    }
  }

  async persist(filePath: string): Promise<void> {
    try {
      const serializableProcedures: Record<string, ProcedureDefinition> = {};
      
      // Serialize each function
      for (const [key, func] of this.procedures.entries()) {
        try {
          const funcStr = func.toString();
          
          // Parse function to extract parameters and body
          // Handle both arrow functions and regular functions
          const parsed = this.parseFunctionDefinition(funcStr);
          
          serializableProcedures[key] = {
            params: parsed.params,
            body: parsed.body,
            originalCode: funcStr,
            metadata: {
              name: func.name || key,
              length: func.length,
              timestamp: Date.now()
            }
          };
        } catch (error) {
          console.error(`Failed to serialize procedure ${key}:`, error);
        }
      }
      
      const data = {
        procedures: serializableProcedures,
        timestamp: Date.now(),
        count: Object.keys(serializableProcedures).length
      };
      
      let dataToPersist = JSON.stringify(data, null, 2);
      
      // Encrypt if encryption key is available
      if (this.encryptionKey) {
        dataToPersist = this.encrypt(dataToPersist);
      }
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));
      
      // Write to file
      await fs.writeFile(filePath, dataToPersist, 'utf-8');
      console.log(`ProceduralMemory persisted to ${filePath}: ${Object.keys(serializableProcedures).length} procedures`);
    } catch (error) {
      console.error(`ProceduralMemory: Failed to persist to ${filePath}:`, error);
    }
  }

  /**
   * Parse function definition to extract parameters and body
   */
  private parseFunctionDefinition(funcStr: string): { params: string[]; body: string } {
    // Remove leading/trailing whitespace
    funcStr = funcStr.trim();
    
    // Handle arrow functions
    if (funcStr.includes('=>')) {
      const arrowIndex = funcStr.indexOf('=>');
      let paramsPart = funcStr.substring(0, arrowIndex).trim();
      let bodyPart = funcStr.substring(arrowIndex + 2).trim();
      
      // Extract parameters
      paramsPart = paramsPart.replace(/^\(|\)$/g, '').trim();
      const params = paramsPart ? paramsPart.split(',').map(p => p.trim()) : [];
      
      // Handle implicit return (no braces)
      if (!bodyPart.startsWith('{')) {
        bodyPart = `return ${bodyPart}`;
      } else {
        // Remove outer braces
        bodyPart = bodyPart.replace(/^\{|\}$/g, '').trim();
      }
      
      return { params, body: bodyPart };
    }
    
    // Handle regular functions
    const funcMatch = funcStr.match(/function\s*\w*\s*\((.*?)\)\s*\{([\s\S]*)\}/);
    if (funcMatch) {
      const params = funcMatch[1] ? funcMatch[1].split(',').map(p => p.trim()) : [];
      const body = funcMatch[2].trim();
      return { params, body };
    }
    
    // Fallback: treat entire function as body with no params
    return { params: [], body: funcStr };
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      return data;
    }

    const key = crypto.scryptSync(this.encryptionKey, 'procedural-salt', 32);
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
    const key = crypto.scryptSync(this.encryptionKey, 'procedural-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

interface ProcedureDefinition {
  params: string[];
  body: string;
  originalCode: string;
  metadata: {
    name: string;
    length: number;
    timestamp: number;
  };
}
