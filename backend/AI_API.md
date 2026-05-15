# API de IA - NutriApp

Integración de Claude API (Anthropic) para generar recomendaciones nutricionales automáticas.

## Configuración

1. **Instalar dependencia** (ya hecho):
```bash
npm install @anthropic-ai/sdk
```

2. **Obtener API Key de Anthropic**:
   - Ve a: https://console.anthropic.com
   - Crea una cuenta
   - Genera una API Key
   - Agrega a `.env`:
   ```
   ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxx"
   ```

## Endpoints

Todos los endpoints requieren autenticación (header `Authorization: Bearer <token>`).

### 1. Generar Recomendación Nutricional

**POST** `/api/ai/recommendation`

```json
{
  "name": "Juan Pérez",
  "age": 35,
  "gender": "M",
  "weight": 75,
  "height": 180,
  "objective": "Perder peso"
}
```

**Respuesta:**
```json
{
  "recommendation": "Para Juan Pérez (35M, 75kg, 180cm):\n\n1. Ingesta calórica: 2000-2200 kcal/día\n2. Macronutrientes:\n   - Proteína: 25-30%\n   - Grasas: 25-30%\n   - Carbohidratos: 40-50%\n..."
}
```

---

### 2. Analizar Alimento

**POST** `/api/ai/analyze-food`

```json
{
  "foodName": "Pechuga de pollo",
  "quantity": 150
}
```

**Respuesta:**
```json
{
  "analysis": "150g de Pechuga de pollo:\n\n1. Calorías: ~245 kcal\n2. Proteína: ~46.5g\n3. Grasas: ~5.4g\n4. Carbohidratos: 0g\n..."
}
```

---

### 3. Generar Plan de Comidas

**POST** `/api/ai/meal-plan`

```json
{
  "calories": 2000,
  "restrictions": ["sin gluten", "sin lácteos"],
  "meals": 3
}
```

**Respuesta:**
```json
{
  "mealPlan": "Plan de 2000 kcal/día:\n\n**Desayuno (500 kcal)**\n- Huevos revueltos con aguacate\n- Tostadas sin gluten\n...\n\n**Almuerzo (700 kcal)**\n...\n\n**Cena (600 kcal)**\n..."
}
```

---

## Ejemplos de uso

### Con cURL

```bash
# Generar recomendación
curl -X POST http://localhost:3000/api/ai/recommendation \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "María",
    "age": 28,
    "gender": "F",
    "weight": 65,
    "height": 165,
    "objective": "Ganar musculatura"
  }'
```

### Con JavaScript/Frontend

```javascript
const generateRecommendation = async (patientData) => {
  const response = await fetch('http://localhost:3000/api/ai/recommendation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patientData)
  });
  return await response.json();
};
```

---

## Errores Comunes

| Error | Solución |
|-------|----------|
| 401 Unauthorized | Falta token de autenticación |
| 400 Bad Request | Faltan datos requeridos |
| 500 API Key invalid | ANTHROPIC_API_KEY incorrecta en .env |

---

## Límites

- **Rate Limit**: 100 requests/minuto (plan gratuito)
- **Tokens**: Máximo 500 tokens por respuesta
- **Timeout**: 30 segundos

---

## Notas

- Las respuestas incluyen nutrición aproximada
- Consultar siempre con profesional médico
- Modelo usado: `claude-3-5-sonnet-20241022`
