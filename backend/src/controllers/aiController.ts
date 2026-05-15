import { Request, Response } from 'express';
import { aiService } from '../services/aiService';

export const generateRecommendation = async (req: Request, res: Response) => {
  try {
    const { name, age, gender, weight, height, objective } = req.body;

    if (!name || !age || !gender || !weight || !height) {
      return res.status(400).json({ message: 'Faltan datos del paciente' });
    }

    const recommendation = await aiService.generateNutritionRecommendation({
      name,
      age: parseInt(age),
      gender,
      weight: parseFloat(weight),
      height: parseFloat(height),
      objective,
    });

    res.json({ recommendation });
  } catch (error: any) {
    console.error('Error en IA:', error);
    res.status(500).json({ message: error.message || 'Error al generar recomendación' });
  }
};

export const analyzeFood = async (req: Request, res: Response) => {
  try {
    const { foodName, quantity } = req.body;

    if (!foodName || !quantity) {
      return res.status(400).json({ message: 'Nombre y cantidad del alimento son requeridos' });
    }

    const analysis = await aiService.analyzeFood(foodName, parseInt(quantity));
    res.json({ analysis });
  } catch (error: any) {
    console.error('Error en IA:', error);
    res.status(500).json({ message: error.message || 'Error al analizar alimento' });
  }
};

export const generateMealPlan = async (req: Request, res: Response) => {
  try {
    const { calories, restrictions, meals } = req.body;

    if (!calories || !meals) {
      return res.status(400).json({ message: 'Calorías y número de comidas son requeridos' });
    }

    const mealPlan = await aiService.generateMealPlan({
      calories: parseInt(calories),
      restrictions: restrictions || [],
      meals: parseInt(meals),
    });

    res.json({ mealPlan });
  } catch (error: any) {
    console.error('Error en IA:', error);
    res.status(500).json({ message: error.message || 'Error al generar plan de comidas' });
  }
};

export const chat = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'El mensaje es requerido' });
    }

    const reply = await aiService.chat(message);
    res.json({ reply });
  } catch (error: any) {
    console.error('Error en IA:', error);
    res.status(500).json({ message: error.message || 'Error al procesar la consulta' });
  }
};
