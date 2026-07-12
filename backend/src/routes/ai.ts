import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  generateRecommendation, analyzeFood, generateMealPlan,
  chat, getChatHistory, clearChatHistory, chatWithFile, upload,
} from '../controllers/aiController';

const router = Router();
router.use(authenticate);

router.post('/recommendation', generateRecommendation);
router.post('/analyze-food', analyzeFood);
router.post('/meal-plan', generateMealPlan);
router.post('/chat', chat);
router.get('/chat-history/:patientId', getChatHistory);
router.delete('/chat-history/:patientId', clearChatHistory);
router.post('/chat-upload', upload.single('file'), chatWithFile);

export default router;
