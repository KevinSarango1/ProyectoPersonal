import { Router } from 'express';
import { authenticate, requireNutritionist } from '../middleware/auth';
import { getFoods, createFood, updateFood, deleteFood } from '../controllers/foodController';

const router = Router();

router.use(authenticate);

router.get('/', getFoods);
router.post('/', requireNutritionist, createFood);
router.put('/:id', requireNutritionist, updateFood);
router.delete('/:id', requireNutritionist, deleteFood);

export default router;
