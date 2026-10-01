import { Router } from 'express';
import { authenticate, requireNutritionist } from '../middleware/auth';
import {
  getFoods,
  getSmaeGroups,
  getFoodById,
  createFood,
  updateFood,
  deleteFood,
} from '../controllers/foodController';

const router = Router();

router.use(authenticate);

router.get('/', getFoods);
router.get('/smae-groups', getSmaeGroups);
router.get('/:id', getFoodById);
router.post('/', requireNutritionist, createFood);
router.put('/:id', requireNutritionist, updateFood);
router.delete('/:id', requireNutritionist, deleteFood);

export default router;
