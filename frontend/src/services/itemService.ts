// src/services/itemService.ts
import { api } from './api';
import { Item, ItemCreate, ItemUpdate } from '../types/items';

const BASE_PATH = '/items';

export const itemService = {
  getItems: async (params?: { skip?: number; limit?: number }): Promise<Item[]> => {
    const response = await api.get(BASE_PATH, { params });
    return response.data;
  },

  getItem: async (id: number): Promise<Item> => {
    const response = await api.get(`${BASE_PATH}/${id}`);
    return response.data;
  },

  createItem: async (item: ItemCreate): Promise<Item> => {
    const response = await api.post(BASE_PATH, item);
    return response.data;
  },

  updateItem: async (id: number, item: ItemUpdate): Promise<Item> => {
    const response = await api.put(`${BASE_PATH}/${id}`, item);
    return response.data;
  },

  deleteItem: async (id: number): Promise<void> => {
    await api.delete(`${BASE_PATH}/${id}`);
  }
};