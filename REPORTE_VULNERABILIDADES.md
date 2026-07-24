# Reporte de Auditoría de Seguridad y Corrección de Vulnerabilidades

Este reporte detalla los resultados de la auditoría de seguridad de dependencias en los proyectos **backend/** y **frontend/**, las correcciones aplicadas y el análisis de riesgos de seguridad.

---

## 1. Resumen Ejecutivo (Antes vs. Después)

A continuación se presenta un comparativo cuantitativo de las vulnerabilidades identificadas mediante `npm audit` antes y después del proceso de mitigación de seguridad en cada proyecto.

### Backend

| Severidad | Estado Inicial (Antes) | Estado Final (Después) |
|-----------|------------------------|------------------------|
| **Crítica** | 0                      | 0                      |
| **Alta**    | 1                      | 0                      |
| **Moderada**| 0                      | 0                      |
| **Baja**    | 1                      | 0                      |
| **Total**   | **2**                  | **0**                  |

*Nota: Todas las vulnerabilidades del backend fueron completamente eliminadas mediante actualizaciones seguras dentro del rango semántico (sin `--force`).*

---

### Frontend

| Severidad | Estado Inicial (Antes) | Estado Final (Después) |
|-----------|------------------------|------------------------|
| **Crítica** | 0                      | 0                      |
| **Alta**    | 4                      | 1 (Vite)*              |
| **Moderada**| 1                      | 1 (Esbuild)*           |
| **Baja**    | 1                      | 0                      |
| **Total**   | **6**                  | **2**                  |

*\*Nota: Las 2 vulnerabilidades remanentes en el frontend corresponden a `esbuild` y `vite`. Estas requieren una actualización mayor (actualización de Vite de la versión 5/6 a la versión 8.1.5), lo que rompería la compatibilidad y requeriría una reestructuración de la arquitectura de construcción, por lo que han sido registradas como riesgos pendientes según lo instruido.*

---

## 2. Tabla Detallada de Vulnerabilidades y Correcciones

Esta tabla documenta todos los componentes actualizados y corregidos en ambos proyectos, confirmando especialmente que el componente de alta severidad `postcss` en el frontend ha sido llevado a una versión segura.

| Proyecto | Componente | Versión Anterior | Versión Nueva | Severidad | Identificador GHSA | Acción Correctiva |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend** | `body-parser` | `1.20.5` | `1.20.6` | Baja | [GHSA-v422-hmwv-36x6](https://github.com/advisories/GHSA-v422-hmwv-36x6) | Actualización de parche no disruptiva vía `npm audit fix` para mitigar DoS por deshabilitación silenciosa del límite de tamaño. |
| **Backend** | `brace-expansion` | `1.1.14` | `1.1.16` | Alta | [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | Actualización de parche no disruptiva vía `npm audit fix` para mitigar DoS por expansión exponencial de llaves. |
| **Frontend**| `postcss` | `8.5.10` | `8.5.23` | Alta | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q)<br>[GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | **Corregido con éxito**. Se actualizó la dependencia transitiva a `8.5.23` mediante `npm audit fix`, mitigando la lectura arbitraria de archivos por inyección de `sourceMappingURL` y path traversal. |
| **Frontend**| `axios` | `1.15.2` | `1.18.1` | Alta | [GHSA-hfxv-24rg-xrqf](https://github.com/advisories/GHSA-hfxv-24rg-xrqf)<br>[GHSA-777c-7fjr-54vf](https://github.com/advisories/GHSA-777c-7fjr-54vf)<br>[GHSA-p92q-9vqr-4j8v](https://github.com/advisories/GHSA-p92q-9vqr-4j8v)<br>[GHSA-j5f8-grm9-p9fc](https://github.com/advisories/GHSA-j5f8-grm9-p9fc)<br>[GHSA-35jp-ww65-95wh](https://github.com/advisories/GHSA-35jp-ww65-95wh)<br>*(y 13 más)* | Actualización de versión menor vía `npm audit fix` dentro del rango semántico seguro, parchando la vulnerabilidad de fuga de credenciales en redirecciones HTTP-a-HTTPS y vulnerabilidades de DoS / prototype pollution. |
| **Frontend**| `form-data` | `4.0.5` | `4.0.6` | Alta | [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) | Actualización de parche vía `npm audit fix` para solucionar una vulnerabilidad de inyección CRLF mediante nombres de archivo no escapados. |
| **Frontend**| `@babel/core` | `7.29.0` | `7.29.7` | Baja | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) | Actualización de parche vía `npm audit fix` para corregir lectura arbitraria de archivos a través de comentarios `sourceMappingURL` controlados por el atacante. |
| **Frontend**| `@babel/code-frame` | `7.29.0` | `7.29.7` | N/A | N/A | Actualización automática de mantenimiento de Babel para asegurar consistencia del árbol de dependencias. |
| **Frontend**| `@babel/compat-data` | `7.29.0` | `7.29.7` | N/A | N/A | Actualización automática de mantenimiento de Babel para asegurar consistencia del árbol de dependencias. |
| **Frontend**| `@babel/generator` | `7.29.1` | `7.29.7` | N/A | N/A | Actualización automática de mantenimiento de Babel para asegurar consistencia del árbol de dependencias. |
| **Frontend**| `@babel/helper-compilation-targets` | `7.28.6` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/helper-globals` | `7.28.0` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/helper-module-imports` | `7.28.6` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/helper-module-transforms` | `7.28.6` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/helper-string-parser` | `7.27.1` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/helper-validator-identifier` | `7.28.5` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/helper-validator-option` | `7.27.1` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/helpers` | `7.29.2` | `7.29.7` | N/A | N/A | Actualización de dependencias internas de Babel. |
| **Frontend**| `@babel/parser` | `7.29.2` | `7.29.7` | N/A | N/A | Actualización de dependencias de análisis sintáctico de Babel. |
| **Frontend**| `@babel/template` | `7.28.6` | `7.29.7` | N/A | N/A | Actualización de dependencias de Babel. |
| **Frontend**| `@babel/traverse` | `7.29.0` | `7.29.7` | N/A | N/A | Actualización de dependencias de recorrido de AST de Babel. |
| **Frontend**| `@babel/types` | `7.29.0` | `7.29.7` | N/A | N/A | Actualización de utilidades de tipo AST de Babel. |
| **Frontend**| `nanoid` | `3.3.11` | `3.3.16` | N/A | N/A | Actualización automática de dependencia transitiva. |
| **Frontend**| `hasown` | `2.0.3` | `2.0.4` | N/A | N/A | Actualización automática de dependencia transitiva. |
| **Frontend**| `agent-base` | N/A (Nueva) | `6.0.2` | N/A | N/A | Agregada automáticamente como librería auxiliar de redirecciones seguras. |
| **Frontend**| `https-proxy-agent` | N/A (Nueva) | `5.0.1` | N/A | N/A | Agregada automáticamente como librería auxiliar para soporte de proxy HTTPS seguro. |

---

## 3. Registro de Riesgos Pendientes (No Aplicados)

Para mantener la estabilidad operativa de la aplicación sin alterar la compatibilidad ni forzar cambios mayores de dependencias, no se aplicó el comando `npm audit fix --force` sobre los siguientes componentes del frontend.

### Componente: `esbuild`
* **Vulnerabilidad**: GHSA-67mh-4wv8-2f99
* **Severidad**: Moderada
* **Descripción**: Permite que cualquier sitio web envíe solicitudes arbitrarias al servidor de desarrollo local de esbuild y lea las respuestas.
* **Justificación de Omisión**: Este componente es una dependencia directa de construcción de `vite@^5.3.1` (Vite 5). Solucionarlo requiere actualizar Vite a la versión 8, lo cual representa una actualización mayor de la herramienta de compilación completa. Un cambio así rompería la compatibilidad de plugins en caliente y la configuración de construcción actual del frontend React.
* **Acción Recomendada a Futuro**: Planificar una migración integral del entorno de desarrollo a Vite v8 (junto con React 19 si es pertinente) en un sprint de mantenimiento dedicado, asegurando la verificación mediante pruebas unitarias y de extremo a extremo.

### Componente: `vite`
* **Vulnerabilidad**: GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff
* **Severidad**: Alta
* **Descripción**: Múltiples fallos que incluyen evasión de reglas de denegación (`server.fs.deny`) en Windows, divulgación del hash NTLMv2 y vulnerabilidades de Path Traversal en el manejo de archivos `.map`.
* **Justificación de Omisión**: La corrección definitiva para estas vulnerabilidades en Vite solo está disponible en versiones de la rama v8 (`vite@8.1.5`). Aplicar este cambio mayor rompería de inmediato la compatibilidad de las herramientas de compilación con las dependencias actuales del frontend.
* **Acción Recomendada a Futuro**: Migrar el empaquetador del proyecto (Vite) de la rama v5/v6 a la rama v8 en una tarea planificada y aislada del flujo de desarrollo regular de características del negocio, realizando amplios ciclos de pruebas de regresión.

---

## 4. Auditoría de Credenciales (`seed.ts`)

Durante el análisis del archivo `backend/prisma/seed.ts`, se identificó un patrón de seguridad inseguro debido a una contraseña por defecto quemada en el código fuente, la cual actuaba como fallback en caso de no encontrarse definida la variable de entorno `ADMIN_SEED_PASSWORD`:

```typescript
passwordHash: await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD || '<CONTRASENA_POR_DEFECTO_QUEMADA>', 10)
```

### Acción Correctiva:
1. **Eliminación y Refactorización del código de Semilla**:
   Se eliminó por completo la credencial quemada por defecto de la base de código. Se implementó un control estricto que requiere obligatoriamente que la variable de entorno `ADMIN_SEED_PASSWORD` esté configurada. En caso de no estar definida, el script de inicialización lanzará un error explícito de seguridad (`Error`) y detendrá el proceso de seed de inmediato, evitando la creación de usuarios con credenciales predecibles o expuestas en el repositorio.
2. **Actualización de Plantilla de Entorno (`.env.example`)**:
   Se agregó explícitamente la variable de entorno `ADMIN_SEED_PASSWORD` en `backend/.env.example` debidamente documentada para que los administradores de sistemas y desarrolladores configuren obligatoriamente una clave robusta en su archivo local `.env` antes de ejecutar el cargador de datos.

---

## 5. Cambios fuera del alcance (Resolución de Errores de Compilación)

Para dar cumplimiento con el requisito **6** del encargo (*"Verifica al final que npm run build siga funcionando en backend y frontend"*), se identificó que el backend no compilaba en absoluto de forma inicial. Esto se debía a una discrepancia severa de diseño entre la base de datos de Prisma y el código TypeScript de los controladores de negocio.

### Diagnóstico de Errores Preexistentes en el Backend:
* En `authController.ts`, se intentaba autenticar y buscar registros del modelo `Patient` utilizando campos como `email` y `passwordHash`. Sin embargo, dichos campos se encontraban omitidos en la definición del modelo `Patient` dentro de `schema.prisma`.
* En `patientController.ts`, se intentaba registrar exámenes médicos utilizando múltiples campos como `uricAcid`, `tsh`, `t3`, `t4`, `systolicBP`, `diastolicBP` y `heartRate` en el modelo `Biometrics`. Sin embargo, estos campos de salud fundamentales no existían en el modelo `Biometrics` de Prisma.
* Adicionalmente, `patient.passwordHash` podía retornar como opcional (`null`), lo que causaba un error de tipo en `bcrypt.compare`.

### Cambios Aplicados en Prisma y Código:
1. **En `backend/prisma/schema.prisma`**:
   - Se reincorporaron los campos faltantes al modelo `Patient`: `email` (con índice único y opcional `String?`), `passwordHash` (`String?`), `phone` (`String?`) y `address` (`String?`). Cabe destacar que la migración inicial de la base de datos (`20260423132341_init/migration.sql`) sí incluía estos campos, por lo que su ausencia en el esquema era un error de sincronización de código de este archivo.
   - Se agregaron los campos bioquímicos y clínicos omitidos al modelo `Biometrics`: `uricAcid` (`Float?`), `tsh` (`Float?`), `t3` (`Float?`), `t4` (`Float?`), `systolicBP` (`Float?`), `diastolicBP` (`Float?`), `heartRate` (`Float?`) y `leukocytes` (`Float?`).
2. **En `backend/src/controllers/authController.ts`**:
   - Se mejoró la aserción de seguridad de tipos añadiendo la verificación `patient.passwordHash` antes de llamar a `bcrypt.compare()`.
3. **Generación de Cliente**:
   - Se ejecutó de manera exitosa `npx prisma generate` para regenerar los tipos correspondientes de Prisma Client.

### Confirmación sobre Migraciones y Afectación de Datos:
* **¿Se requiere generar una nueva migración de Prisma?**
  **Sí**. Para sincronizar estos cambios del esquema con una base de datos en producción, se debe ejecutar:
  ```bash
  npx prisma migrate dev --name add_missing_fields
  ```
  Esto creará la definición física SQL necesaria para soportar los nuevos campos del modelo `Biometrics` y `Patient`.
* **¿Se ven afectados los datos existentes?**
  **No**. Todos los campos añadidos se configuraron explícitamente como opcionales (`?` o `Nullable` en SQL) en la base de datos Prisma. Esto garantiza que la adición de campos no causará fallos en los registros previamente persistidos en la base de datos, manteniendo intacta la integridad referencial y de almacenamiento del aplicativo NutriApp.

---

## 6. Verificación Final de Compilación
Se ejecutó con total éxito la compilación de ambos proyectos:
* **Frontend**: Compila perfectamente generando los artefactos optimizados de Vite en `frontend/dist/` mediante `npm run build`.
* **Backend**: Compila de forma óptima mediante `npm run build` sin emitir ningún error de TypeScript (`tsc`), generando el código de servidor ejecutable JavaScript en `backend/dist/`.
