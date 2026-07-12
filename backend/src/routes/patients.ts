import { Router } from 'express';
import { authenticate, requireNutritionist } from '../middleware/auth';
import {
  getPatients, getPatientById, createPatient, updatePatient, deletePatient,
  updateClinicalHistory,
  addBiometrics, getBiometrics,
  addAnthropometry, getAnthropometry,
  getDietaryHabits, saveDietaryHabits,
  saveWeeklyMenu,
} from '../controllers/patientController';

const router = Router();

router.use(authenticate);

router.get('/', requireNutritionist, getPatients);
router.post('/', requireNutritionist, createPatient);
router.get('/:id', getPatientById);
router.put('/:id', requireNutritionist, updatePatient);
router.delete('/:id', requireNutritionist, deletePatient);

router.put('/:id/clinical-history', requireNutritionist, updateClinicalHistory);

router.get('/:id/biometrics', getPatientById);
router.post('/:id/biometrics', requireNutritionist, addBiometrics);
router.get('/:id/biometrics/history', requireNutritionist, getBiometrics);

router.post('/:id/anthropometry', requireNutritionist, addAnthropometry);
router.get('/:id/anthropometry/history', requireNutritionist, getAnthropometry);

router.get('/:id/dietary-habits', requireNutritionist, getDietaryHabits);
router.post('/:id/dietary-habits', requireNutritionist, saveDietaryHabits);

router.post('/:id/weekly-menu', requireNutritionist, saveWeeklyMenu);

export default router;
