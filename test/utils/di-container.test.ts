/**
 * Tests for DI Container utility
 */

import { Container } from '../../utils/di-container';

describe('DI Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('registration', () => {
    it('should register a factory function', () => {
      container.register('testService', () => ({ name: 'test' }));
      expect(() => container.resolve('testService')).not.toThrow();
    });

    it('should register a singleton', () => {
      container.registerSingleton('singleton', () => ({ id: Math.random() }));
      const instance1 = container.resolve('singleton');
      const instance2 = container.resolve('singleton');
      expect(instance1).toBe(instance2);
    });

    it('should register a value', () => {
      const config = { apiKey: 'test123' };
      container.registerValue('config', config);
      expect(container.resolve('config')).toBe(config);
    });
  });

  describe('resolution', () => {
    it('should resolve registered services', () => {
      const service = { method: () => 'result' };
      container.register('service', () => service);
      const resolved = container.resolve('service');
      expect(resolved).toBe(service);
    });

    it('should throw error for unregistered services', () => {
      expect(() => container.resolve('nonexistent')).toThrow();
    });

    it('should create new instances for transient registrations', () => {
      container.register('transient', () => ({ id: Math.random() }));
      const instance1 = container.resolve('transient');
      const instance2 = container.resolve('transient');
      expect(instance1).not.toBe(instance2);
    });

    it('should return same instance for singleton registrations', () => {
      let counter = 0;
      container.registerSingleton('counter', () => ({ value: ++counter }));
      const instance1 = container.resolve('counter');
      const instance2 = container.resolve('counter');
      expect(instance1).toBe(instance2);
      expect(instance1.value).toBe(1);
    });
  });

  describe('dependency injection', () => {
    it('should inject dependencies', () => {
      container.registerValue('config', { port: 3000 });
      container.register('server', (c: Container) => ({
        config: c.resolve('config'),
        start: () => 'started'
      }));

      const server = container.resolve('server');
      expect(server.config.port).toBe(3000);
    });

    it('should handle circular dependencies gracefully', () => {
      container.register('serviceA', (c: Container) => ({
        name: 'A',
        getB: () => c.resolve('serviceB')
      }));

      container.register('serviceB', (c: Container) => ({
        name: 'B',
        getA: () => c.resolve('serviceA')
      }));

      // First resolution should work
      const serviceA = container.resolve('serviceA');
      expect(serviceA.name).toBe('A');
    });
  });

  describe('check methods', () => {
    it('should check if service is registered', () => {
      container.register('existing', () => ({}));
      expect(container.has('existing')).toBe(true);
      expect(container.has('nonexistent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister services', () => {
      container.register('service', () => ({}));
      expect(container.has('service')).toBe(true);
      
      container.unregister('service');
      expect(container.has('service')).toBe(false);
    });

    it('should not throw when unregistering non-existent service', () => {
      expect(() => container.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple dependencies', () => {
      container.registerValue('dbConfig', { host: 'localhost', port: 5432 });
      container.registerValue('apiConfig', { port: 3000 });
      
      container.register('database', (c: Container) => ({
        config: c.resolve('dbConfig'),
        connect: () => 'connected'
      }));

      container.register('api', (c: Container) => ({
        config: c.resolve('apiConfig'),
        db: c.resolve('database'),
        start: () => 'started'
      }));

      const api = container.resolve('api');
      expect(api.config.port).toBe(3000);
      expect(api.db.config.host).toBe('localhost');
    });

    it('should support factory functions with parameters', () => {
      container.register('userFactory', () => (name: string) => ({
        name,
        created: new Date()
      }));

      const factory = container.resolve('userFactory');
      const user1 = factory('Alice');
      const user2 = factory('Bob');

      expect(user1.name).toBe('Alice');
      expect(user2.name).toBe('Bob');
      expect(user1).not.toBe(user2);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error messages', () => {
      expect(() => container.resolve('missingService'))
        .toThrow(/not registered|not found/i);
    });

    it('should handle factory errors', () => {
      container.register('failing', () => {
        throw new Error('Factory failed');
      });

      expect(() => container.resolve('failing')).toThrow('Factory failed');
    });
  });

  describe('lifecycle', () => {
    it('should clear all registrations', () => {
      container.register('service1', () => ({}));
      container.register('service2', () => ({}));
      
      container.clear();
      
      expect(container.has('service1')).toBe(false);
      expect(container.has('service2')).toBe(false);
    });

    it('should reset singleton instances on clear', () => {
      let counter = 0;
      container.registerSingleton('counter', () => ({ value: ++counter }));
      
      const instance1 = container.resolve('counter');
      expect(instance1.value).toBe(1);
      
      container.clear();
      container.registerSingleton('counter', () => ({ value: ++counter }));
      
      const instance2 = container.resolve('counter');
      expect(instance2.value).toBe(2);
      expect(instance1).not.toBe(instance2);
    });
  });
});
