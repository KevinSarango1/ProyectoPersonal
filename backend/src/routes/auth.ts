import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  login, getMe,
  createNutritionist, getNutritionists,
  updateNutritionist, deleteNutritionist,
} from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);

// Gestión de nutricionistas — solo admin
router.get('/users', authenticate, requireAdmin, getNutritionists);
router.post('/users', authenticate, requireAdmin, createNutritionist);
router.put('/users/:id', authenticate, requireAdmin, updateNutritionist);
router.delete('/users/:id', authenticate, requireAdmin, deleteNutritionist);

export default router;
