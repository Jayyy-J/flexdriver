# FlexDriver 🚗

Herramienta de gestión personal para repartidores de Amazon Flex. Permite registrar bloques de entrega, trackear gastos, calcular ganancias netas y visualizar el rendimiento mensual.

---

## Tabla de contenidos

1. [Requisitos](#requisitos)
2. [Instalación local (Ubuntu)](#instalación-local-ubuntu)
3. [Variables de entorno](#variables-de-entorno)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [API REST — Endpoints](#api-rest--endpoints)
6. [Base de datos](#base-de-datos)
7. [Despliegue en Railway](#despliegue-en-railway)
8. [Migrar de SQLite a PostgreSQL](#migrar-de-sqlite-a-postgresql)

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js     | 18.x o superior |
| npm         | 9.x o superior  |
| Git         | Cualquier versión reciente |

---

## Instalación local (Ubuntu)

### 1. Clonar o descomprimir el proyecto

```bash
# Si lo tienes como ZIP:
unzip flexdriver.zip -d flexdriver
cd flexdriver

# Si lo clonas desde Git:
git clone <repo-url>
cd flexdriver
```

### 2. Instalar dependencias

```bash
npm install
```

> ⚠️ `better-sqlite3` compila código nativo. Si falla en Ubuntu, instala las herramientas de compilación primero:
> ```bash
> sudo apt update && sudo apt install -y build-essential python3
> ```
> Luego vuelve a ejecutar `npm install`.

### 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Edita el archivo `.env` con los siguientes valores:

```env
PORT=3000
JWT_SECRET=pon_aqui_un_secreto_largo_y_aleatorio
NODE_ENV=development
DB_PATH=./database/flexdriver.db
```

> Para generar un JWT_SECRET seguro puedes usar:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 4. Iniciar el servidor

```bash
# Modo producción:
npm start

# Modo desarrollo (con auto-reload):
npm run dev
```

La app estará disponible en: **http://localhost:3000**

### 5. Primer uso

1. Abre el navegador en `http://localhost:3000`
2. Haz clic en **Registrarse**
3. Crea tu cuenta con nombre, apellido, email y contraseña
4. Comienza registrando tus bloques y gastos

---

## Variables de entorno

| Variable     | Descripción                                      | Valor por defecto          |
|--------------|--------------------------------------------------|----------------------------|
| `PORT`       | Puerto en que corre el servidor                  | `3000`                     |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT             | `secret_dev` *(no seguro)* |
| `NODE_ENV`   | Entorno (`development` / `production`)           | `development`              |
| `DB_PATH`    | Ruta al archivo SQLite                           | `./database/flexdriver.db` |

> En Railway, `PORT` es asignado automáticamente. No lo configures manualmente allá.

---

## Estructura del proyecto

```
flexdriver/
├── server.js                   # Punto de entrada — Express
├── package.json
├── .env.example
├── railway.json                # Configuración de despliegue Railway
├── Procfile                    # Comando de inicio para Railway
├── .gitignore
│
├── backend/
│   ├── database/
│   │   ├── init.js             # Crea tablas e índices al arrancar
│   │   └── db.js               # Conexión a SQLite (singleton)
│   ├── middleware/
│   │   └── auth.js             # Validación JWT
│   └── routes/
│       ├── auth.js             # Registro, login, perfil
│       ├── bloques.js          # CRUD bloques de entrega
│       ├── gastos.js           # CRUD gastos
│       └── dashboard.js        # Estadísticas agregadas
│
├── frontend/
│   ├── index.html              # SPA — toda la interfaz
│   ├── css/
│   │   └── app.css             # Estilos completos
│   └── js/
│       ├── api.js              # Cliente HTTP para la API
│       └── app.js              # Lógica de la interfaz
│
└── database/
    └── flexdriver.db           # Generado automáticamente al iniciar
```

---

## API REST — Endpoints

### Autenticación

| Método | Ruta               | Descripción           | Auth |
|--------|--------------------|-----------------------|------|
| POST   | `/api/auth/registro` | Crear cuenta         | No   |
| POST   | `/api/auth/login`    | Iniciar sesión       | No   |
| GET    | `/api/auth/me`       | Obtener perfil       | Sí   |
| PUT    | `/api/auth/perfil`   | Actualizar perfil    | Sí   |

**Ejemplo de registro:**
```bash
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan","apellido":"Driver","email":"juan@test.com","password":"123456"}'
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { "id": 1, "nombre": "Juan", "email": "juan@test.com", ... }
}
```

> Para todas las rutas protegidas, incluye el header:
> `Authorization: Bearer <token>`

---

### Bloques

| Método | Ruta               | Descripción                         |
|--------|--------------------|-------------------------------------|
| GET    | `/api/bloques`     | Listar bloques (filtros: mes, anio, estado) |
| GET    | `/api/bloques/:id` | Obtener un bloque                   |
| POST   | `/api/bloques`     | Crear bloque                        |
| PUT    | `/api/bloques/:id` | Actualizar bloque                   |
| DELETE | `/api/bloques/:id` | Eliminar bloque                     |

**Body para crear/actualizar:**
```json
{
  "fecha": "2026-06-01",
  "hora_inicio": "08:00",
  "hora_fin": "12:00",
  "zona": "Centro",
  "pago": 118.50,
  "km_recorridos": 45,
  "estado": "completado",
  "notas": "Tráfico en la avenida principal"
}
```

**Estados válidos:** `pendiente` | `completado` | `cancelado`

---

### Gastos

| Método | Ruta              | Descripción                         |
|--------|-------------------|-------------------------------------|
| GET    | `/api/gastos`     | Listar gastos (filtros: mes, anio, tipo) |
| GET    | `/api/gastos/:id` | Obtener un gasto                    |
| POST   | `/api/gastos`     | Registrar gasto                     |
| PUT    | `/api/gastos/:id` | Actualizar gasto                    |
| DELETE | `/api/gastos/:id` | Eliminar gasto                      |

**Body para crear:**
```json
{
  "fecha": "2026-06-01",
  "tipo": "combustible",
  "monto": 45.00,
  "km_recorridos": 120,
  "nota": "Gasolinera del norte"
}
```

**Tipos válidos:** `combustible` | `mantenimiento` | `seguro` | `datos_moviles` | `otro`

---

### Dashboard

| Método | Ruta                              | Descripción              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/dashboard?mes=6&anio=2026`  | Estadísticas del mes     |

**Respuesta incluye:**
- Ingresos brutos, ganancia neta, margen
- Km totales y costo por km
- Progreso hacia la meta mensual
- Ingresos por semana
- Mejores zonas por pago/hora
- Últimos 5 bloques

---

### Health check

```bash
GET /api/health
# Respuesta: { "status": "ok", "version": "1.0.0" }
```

---

## Base de datos

La base de datos es **SQLite** y se genera automáticamente en `./database/flexdriver.db` al iniciar el servidor por primera vez.

### Tablas

**`usuarios`** — Cuentas de usuario
```
id, nombre, apellido, email, password_hash,
vehiculo, consumo_km_litro, precio_combustible,
meta_mensual, created_at, updated_at
```

**`bloques`** — Bloques de entrega
```
id, usuario_id, fecha, hora_inicio, hora_fin,
duracion_horas, zona, pago, km_recorridos,
estado, notas, created_at, updated_at
```

**`gastos`** — Registro de gastos
```
id, usuario_id, fecha, tipo, monto,
km_recorridos, nota, created_at
```

### Ver la base de datos desde terminal

```bash
# Instalar sqlite3 si no lo tienes:
sudo apt install sqlite3

# Abrir la base de datos:
sqlite3 database/flexdriver.db

# Comandos útiles dentro de sqlite3:
.tables                          -- Ver todas las tablas
.schema bloques                  -- Ver estructura de una tabla
SELECT * FROM usuarios;          -- Ver usuarios registrados
SELECT * FROM bloques LIMIT 10;  -- Ver bloques
.quit                            -- Salir
```

---

## Despliegue en Railway

### Paso 1 — Preparar el repositorio

```bash
cd flexdriver
git init
git add .
git commit -m "feat: FlexDriver MVP inicial"
```

Crea un repositorio en GitHub y súbelo:

```bash
git remote add origin https://github.com/tu-usuario/flexdriver.git
git push -u origin main
```

### Paso 2 — Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app) e inicia sesión
2. Haz clic en **New Project**
3. Selecciona **Deploy from GitHub repo**
4. Conecta tu cuenta de GitHub y selecciona el repositorio `flexdriver`
5. Railway detectará automáticamente el proyecto Node.js con Nixpacks

### Paso 3 — Configurar variables de entorno

En el panel de Railway, ve a tu servicio → **Variables** → agrega:

| Variable     | Valor                            |
|--------------|----------------------------------|
| `JWT_SECRET` | `genera_uno_con_el_comando_de_arriba` |
| `NODE_ENV`   | `production`                     |
| `DB_PATH`    | `/app/database/flexdriver.db`    |

> `PORT` es asignado automáticamente por Railway — no lo configures.

### Paso 4 — Configurar volumen persistente (IMPORTANTE)

SQLite guarda los datos en un archivo. Para que no se pierdan en cada redeploy:

1. En Railway, ve a tu servicio → **Volumes**
2. Haz clic en **Add Volume**
3. Configura:
   - **Mount Path:** `/app/database`
4. Guarda y redespliega

> Sin el volumen, los datos se pierden cada vez que Railway redespliega el contenedor.

### Paso 5 — Desplegar

Railway despliega automáticamente al hacer push a `main`. También puedes forzarlo desde el panel con **Deploy Now**.

### Paso 6 — Obtener la URL

Una vez desplegado, Railway asigna una URL pública como:
`https://flexdriver-production.up.railway.app`

Puedes ver los logs en tiempo real desde la pestaña **Deployments → View Logs**.

---

## Migrar de SQLite a PostgreSQL

Cuando el proyecto crezca o en producción robusta, puedes migrar a PostgreSQL (Railway provee PostgreSQL gratuito).

### 1. Agrega PostgreSQL en Railway

En tu proyecto de Railway → **New** → **Database** → **Add PostgreSQL**

### 2. Instala el driver

```bash
npm install pg
npm uninstall better-sqlite3
```

### 3. Actualiza `backend/database/db.js`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
```

### 4. Agrega la variable en Railway

Railway agrega `DATABASE_URL` automáticamente cuando conectas una base de datos PostgreSQL al proyecto.

---

## Scripts disponibles

```bash
npm start       # Inicia el servidor en producción
npm run dev     # Inicia con nodemon (auto-reload en desarrollo)
npm run init-db # Inicializa la base de datos manualmente
```

---

## Tecnologías

| Capa       | Tecnología                        |
|------------|-----------------------------------|
| Backend    | Node.js + Express                 |
| Base de datos | SQLite (better-sqlite3)        |
| Auth       | JWT (jsonwebtoken) + bcryptjs     |
| Frontend   | HTML + CSS + JS vanilla           |
| Despliegue | Railway (Nixpacks)                |

---

## Construido con 💛 por Construyendo Diamantes
