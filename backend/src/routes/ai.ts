import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { generateRecommendation, analyzeFood, generateMealPlan, chat } from '../controllers/aiController';

const router = Router();

router.use(authenticate);

// POST /api/ai/recommendation - Generar recomendación nutricional
router.post('/recommendation', generateRecommendation);

// POST /api/ai/analyze-food - Analizar un alimento
router.post('/analyze-food', analyzeFood);

// POST /api/ai/meal-plan - Generar plan de comidas
router.post('/meal-plan', generateMealPlan);

// POST /api/ai/chat - Chat libre con el asistente nutricional
router.post('/chat', chat);

export default router;
