// src/hooks/useItems.ts
import { useState, useEffect } from 'react';
import { itemService } from '../services/itemService';
import { Item, ItemCreate, ItemUpdate } from '../types/item';

export const useItems = (initialSkip = 0, initialLimit = 10) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState<number>(initialSkip);
  const [limit, setLimit] = useState<number>(initialLimit);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await itemService.getItems({ skip, limit });
      setItems(data);
    } catch (err) {
      setError('Failed to fetch items');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createItem = async (item: ItemCreate) => {
    try {
      const newItem = await itemService.createItem(item);
      setItems((prev) => [...prev, newItem]);
      return newItem;
    } catch (err) {
      setError('Failed to create item');
      console.error(err);
      throw err;
    }
  };

  const updateItem = async (id: number, item: ItemUpdate) => {
    try {
      const updatedItem = await itemService.updateItem(id, item);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? updatedItem : i))
      );
      return updatedItem;
    } catch (err) {
      setError('Failed to update item');
      console.error(err);
      throw err;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await itemService.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    fetchItems();
  }, [skip, limit]);

  return {
    items,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
    fetchItems,
    setSkip,
    setLimit,
    skip,
    limit,
  };
};

