import { MinHeap } from '../MinHeap';

describe('MinHeap', () => {
  let heap: MinHeap<{ f: number; id: string }>;

  beforeEach(() => {
    heap = new MinHeap<{ f: number; id: string }>((a, b) => a.f - b.f);
  });

  describe('constructor', () => {
    it('should create an empty heap', () => {
      expect(heap.size()).toBe(0);
    });
  });

  describe('push', () => {
    it('should add a single element', () => {
      heap.push({ f: 5, id: 'a' });
      expect(heap.size()).toBe(1);
    });

    it('should maintain heap property with multiple elements', () => {
      heap.push({ f: 10, id: 'a' });
      heap.push({ f: 5, id: 'b' });
      heap.push({ f: 15, id: 'c' });
      heap.push({ f: 3, id: 'd' });
      expect(heap.peek()!.f).toBe(3);
    });
  });

  describe('pop', () => {
    it('should return undefined for empty heap', () => {
      expect(heap.pop()).toBeUndefined();
    });

    it('should return the minimum element', () => {
      heap.push({ f: 10, id: 'a' });
      heap.push({ f: 3, id: 'b' });
      heap.push({ f: 7, id: 'c' });
      expect(heap.pop()!.f).toBe(3);
      expect(heap.pop()!.f).toBe(7);
      expect(heap.pop()!.f).toBe(10);
      expect(heap.pop()).toBeUndefined();
    });

    it('should handle many elements in sorted order', () => {
      const values = [5, 3, 8, 1, 9, 2, 7, 4, 6];
      values.forEach(v => heap.push({ f: v, id: String(v) }));
      const sorted: number[] = [];
      while (heap.size() > 0) {
        sorted.push(heap.pop()!.f);
      }
      expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('peek', () => {
    it('should return undefined for empty heap', () => {
      expect(heap.peek()).toBeUndefined();
    });

    it('should return minimum without removing it', () => {
      heap.push({ f: 5, id: 'a' });
      heap.push({ f: 2, id: 'b' });
      expect(heap.peek()!.f).toBe(2);
      expect(heap.size()).toBe(2);
    });
  });

  describe('decreaseKey', () => {
    it('should update priority and re-heapify', () => {
      heap.push({ f: 10, id: 'a' });
      heap.push({ f: 5, id: 'b' });
      heap.decreaseKey({ f: 1, id: 'a' }, (item) => item.id === 'a');
      expect(heap.peek()!.f).toBe(1);
      expect(heap.pop()!.id).toBe('a');
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      heap.push({ f: 5, id: 'a' });
      heap.push({ f: 3, id: 'b' });
      heap.clear();
      expect(heap.size()).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle 10000 push/pop operations quickly', () => {
      const start = performance.now();
      for (let i = 10000; i >= 0; i--) {
        heap.push({ f: i, id: String(i) });
      }
      for (let i = 0; i <= 10000; i++) {
        heap.pop();
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });
});
