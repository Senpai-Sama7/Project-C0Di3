import { IMemory, MemoryItem } from '../types';

export class ProceduralMemory implements IMemory {
  private procedures: Map<string, Function> = new Map();

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
    // TODO: Implement actual loading logic. Serializing/deserializing functions is complex.
    // May need to store function code as strings or use a dedicated procedure definition format.
    // Example (conceptual, for simple stringified functions):
    // if (fs.existsSync(filePath)) {
    //   const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    //   this.procedures = new Map(Object.entries(data.procedures).map(([k, v_str]: [string, string]) => [k, new Function('return ' + v_str)()]) );
    //   console.log(`ProceduralMemory loaded from ${filePath}`);
    // } else {
    //   console.log(`ProceduralMemory: No persistence file found at ${filePath}. Starting fresh.`);
    // }
    console.warn(`ProceduralMemory.load() called with ${filePath}, but not implemented due to complexity of function serialization.`);
  }

  async persist(filePath: string): Promise<void> {
    // TODO: Implement actual persistence logic. See note in load() about function serialization.
    // Example (conceptual, for simple stringified functions):
    // const serializableProcedures = {};
    // this.procedures.forEach((func, key) => { serializableProcedures[key] = func.toString(); });
    // fs.writeFileSync(filePath, JSON.stringify({ procedures: serializableProcedures }, null, 2));
    // console.log(`ProceduralMemory persisted to ${filePath}`);
    console.warn(`ProceduralMemory.persist() called with ${filePath}, but not implemented due to complexity of function serialization.`);
  }
}
