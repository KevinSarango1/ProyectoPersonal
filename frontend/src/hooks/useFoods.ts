import { useState, useCallback } from 'react';
import { Food } from '../types/patient';
import { foodService } from '../services/foodService';

export const useFoods = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await foodService.getAll();
      setFoods(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (food: Omit<Food, 'id'>): Promise<Food> => {
    const newFood = await foodService.create(food);
    setFoods(prev => [...prev, newFood]);
    return newFood;
  }, []);

  const update = useCallback(async (id: string, food: Partial<Food>): Promise<Food> => {
    const updated = await foodService.update(id, food);
    setFoods(prev => prev.map(f => f.id === id ? updated : f));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await foodService.delete(id);
    setFoods(prev => prev.filter(f => f.id !== id));
  }, []);

  return { foods, loading, fetchAll, create, update, remove };
};
