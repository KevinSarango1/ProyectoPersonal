# NutriApp — Guía de Inicio

## Requisitos
- Node.js 18+
- PostgreSQL 14+

---

## 1. Base de datos (PostgreSQL)
Crea la base de datos antes de continuar:
```sql
CREATE DATABASE nutriapp;
```

---

## 2. Backend
```bash
cd backend

# Instalar dependencias
npm install

# Copiar y configurar variables de entorno
copy .env.example .env
# Editar .env con tu usuario/contraseña de PostgreSQL

# Generar cliente Prisma y ejecutar migraciones
npm run db:generate
npm run db:migrate

# Cargar datos iniciales (admin + 10 alimentos)
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

---

## 3. Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
# → http://localhost:5173
```

---

## Credenciales iniciales
| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@nutriapp.com | admin123 |

---

## Endpoints disponibles
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Usuario actual |
| GET | /api/auth/users | Listar nutricionistas (admin) |
| POST | /api/auth/users | Crear nutricionista (admin) |
| PUT | /api/auth/users/:id | Editar nutricionista (admin) |
| DELETE | /api/auth/users/:id | Eliminar nutricionista (admin) |
| GET | /api/patients | Listar pacientes |
| POST | /api/patients | Crear paciente |
| GET | /api/patients/:id | Detalle de paciente |
| PUT | /api/patients/:id | Editar paciente |
| DELETE | /api/patients/:id | Eliminar paciente |
| PUT | /api/patients/:id/clinical-history | Actualizar historia clínica |
| POST | /api/patients/:id/biometrics | Agregar biometría |
| GET | /api/patients/:id/biometrics/history | Historial biometría |
| POST | /api/patients/:id/anthropometry | Agregar antropometría |
| GET | /api/patients/:id/anthropometry/history | Historial antropometría |
| POST | /api/patients/:id/weekly-menu | Guardar menú semanal |
| GET | /api/foods | Listar alimentos |
| POST | /api/foods | Crear alimento |
| PUT | /api/foods/:id | Editar alimento |
| DELETE | /api/foods/:id | Eliminar alimento |
