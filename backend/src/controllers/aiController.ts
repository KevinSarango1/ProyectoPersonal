import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { aiService } from '../services/aiService';

// pdf-parse v2 usa clase PDFParse en lugar de función directa
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } };

// Alias para evitar errores de caché de tipos de Prisma en el IDE
// (el cliente generado sí incluye chatMessage — reinicia TS server si persiste)
const db = prisma as any;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    cb(null, allowed.includes(file.mimetype));
  },
});

export const generateRecommendation = async (req: Request, res: Response) => {
  try {
    const { name, age, gender, weight, height, objective } = req.body;
    if (!name || !age || !gender || !weight || !height) {
      return res.status(400).json({ message: 'Faltan datos del paciente' });
    }
    const recommendation = await aiService.generateNutritionRecommendation({
      name, age: parseInt(age), gender,
      weight: parseFloat(weight), height: parseFloat(height), objective,
    });
    res.json({ recommendation });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al generar recomendación' });
  }
};

export const analyzeFood = async (req: Request, res: Response) => {
  try {
    const { foodName, quantity } = req.body;
    if (!foodName || !quantity) {
      return res.status(400).json({ message: 'Nombre y cantidad son requeridos' });
    }
    const analysis = await aiService.analyzeFood(foodName, parseInt(quantity));
    res.json({ analysis });
  } catch (error: any) {
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
      calories: parseInt(calories), restrictions: restrictions || [], meals: parseInt(meals),
    });
    res.json({ mealPlan });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al generar plan' });
  }
};

// DELETE /api/ai/chat-history/:patientId
export const clearChatHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    await db.chatMessage.deleteMany({
      where: { patientId: patientId === 'global' ? null : patientId },
    });
    res.json({ message: 'Historial eliminado' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/ai/chat-history/:patientId
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const messages = await db.chatMessage.findMany({
      where: { patientId: patientId === 'global' ? null : patientId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/ai/chat
export const chat = async (req: Request, res: Response) => {
  try {
    const { message, patientId, patientContext } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: 'El mensaje es requerido' });
    }
    const pid = patientId || null;

    // Cargar últimos 10 mensajes para mantener contexto de conversación
    const prevMessages = await db.chatMessage.findMany({
      where: { patientId: pid },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    const history = prevMessages.map((m: any) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));

    await db.chatMessage.create({ data: { role: 'user', content: message, patientId: pid } });
    const reply = await aiService.chat(message, patientContext || undefined, history);
    await db.chatMessage.create({ data: { role: 'ai', content: reply ?? '', patientId: pid } });
    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al procesar la consulta' });
  }
};

// POST /api/ai/chat-upload — RAG con documento PDF/TXT
export const chatWithFile = async (req: Request, res: Response) => {
  try {
    const { message, patientId } = req.body;
    const file = req.file;
    if (!file && !message?.trim()) {
      return res.status(400).json({ message: 'Se requiere un mensaje o un documento' });
    }

    const pid = patientId || null;
    let extractedText = '';
    let fileName = '';

    if (file) {
      fileName = file.originalname;
      if (file.mimetype === 'application/pdf') {
        const parser = new PDFParse({ data: file.buffer });
        const pdfData = await parser.getText();
        extractedText = pdfData.text.slice(0, 6000);
      } else {
        extractedText = file.buffer.toString('utf-8').slice(0, 6000);
      }
    }

    const userContent = file
      ? `[Documento: ${fileName}]\n${message || 'Analiza este documento.'}`
      : message;

    await db.chatMessage.create({
      data: { role: 'user', content: userContent, patientId: pid, fileName: fileName || null },
    });

    const reply = await aiService.chatWithDocument(
      message || 'Analiza este documento.',
      extractedText,
      fileName,
    );

    await db.chatMessage.create({ data: { role: 'ai', content: reply ?? '', patientId: pid } });

    res.json({ reply, fileName: fileName || null });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al procesar el documento' });
  }
};
