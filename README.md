# 💸 App Finanzas — Full-Stack Mobile

Aplicación móvil de **finanzas personales y división de gastos** (estilo Splitwise).

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| 📱 Mobile | React Native · Expo SDK · TypeScript |
| ⚙️ Backend | NestJS · TypeScript (strict) |
| 🗄️ Base de Datos | PostgreSQL |
| 🔗 ORM | Prisma |

## Estructura del Proyecto

```
App_Finanzas/
├── mobile/          # React Native (Expo) — Frontend móvil
│   ├── app/         # Pantallas y navegación (Expo Router)
│   ├── components/  # Componentes reutilizables
│   ├── hooks/       # Custom hooks
│   ├── constants/   # Colores, temas, config
│   └── package.json
│
├── api/             # NestJS — Backend REST API
│   ├── src/
│   │   ├── prisma/          # PrismaService + PrismaModule (global)
│   │   ├── app.module.ts    # Módulo raíz (irá importando features)
│   │   └── main.ts          # Entry point HTTP
│   ├── prisma/
│   │   └── schema.prisma    # Modelos de base de datos
│   ├── .env.example         # Variables de entorno de ejemplo
│   └── package.json
│
├── .gitignore
└── README.md
```

## Módulos del MVP

### 1. 💰 Finanzas Personales
- Registro rápido de **gastos e ingresos**
- **Categorización** de transacciones
- Definición de **presupuesto mensual**
- **Dashboard** con gráficos resumen

### 2. 🤝 Divisor de Gastos (Splitwise-like)
- Creación de **grupos temporales** (Viaje, Asado, etc.)
- Asignación de gastos dentro del grupo
- **Algoritmo de simplificación de deudas** (quién le debe a quién de forma mínima)

---

## 🚀 Cómo levantar el entorno localmente

### Pre-requisitos

- [Node.js v24+](https://nodejs.org/) y npm v11+
- [PostgreSQL 15+](https://www.postgresql.org/download/) corriendo localmente
- [Expo Go](https://expo.dev/go) instalado en tu dispositivo físico o emulador
- (Opcional) [pgAdmin](https://www.pgadmin.org/) o DBeaver para gestionar la BD

---

### 1️⃣ Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd App_Finanzas
```

---

### 2️⃣ Backend (API — NestJS + Prisma)

```bash
# Entrar a la carpeta del backend
cd api

# Copiar el archivo de variables de entorno
cp .env.example .env
```

Editar el archivo `.env` y completar los valores:

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/app_finanzas?schema=public"
JWT_SECRET=cambia_esto_a_un_secreto_largo
```

```bash
# Instalar dependencias
npm install

# Crear la base de datos y ejecutar las migraciones
npx prisma migrate dev --name init

# Generar el cliente de Prisma
npx prisma generate

# Levantar el servidor en modo desarrollo (hot-reload)
npm run start:dev
```

La API estará disponible en: **http://localhost:3000**

> 💡 También podés usar `npx prisma studio` para inspeccionar la BD visualmente en el browser.

---

### 3️⃣ Frontend (Mobile — Expo)

Abrir una **nueva terminal**:

```bash
cd mobile

# Instalar dependencias
npm install

# Levantar el servidor de desarrollo de Expo
npm start
# o también: npx expo start
```

Luego:
- **Dispositivo físico**: Escanear el QR con la app **Expo Go**
- **Emulador iOS**: Presionar `i` en la terminal
- **Emulador Android**: Presionar `a` en la terminal
- **Web**: Presionar `w` en la terminal

---

## 🛠️ Scripts útiles

### Backend (`/api`)

| Comando | Descripción |
|---|---|
| `npm run start:dev` | Servidor con hot-reload |
| `npm run build` | Compilar a producción |
| `npm run test` | Unit tests (Jest) |
| `npx prisma migrate dev` | Crear y aplicar una migración |
| `npx prisma studio` | GUI de base de datos en el browser |
| `npx prisma db seed` | Sembrar datos de prueba (cuando esté configurado) |

### Frontend (`/mobile`)

| Comando | Descripción |
|---|---|
| `npm start` | Levantar Metro Bundler |
| `npm run android` | Levantar en emulador Android |
| `npm run ios` | Levantar en emulador iOS |
| `npm run web` | Levantar en modo web |

---

## 🗄️ Base de Datos

El esquema de Prisma se encuentra en `api/prisma/schema.prisma`.

Para crear la base de datos por primera vez:

```bash
# Desde la carpeta /api
createdb app_finanzas               # Crear la BD en PostgreSQL
npx prisma migrate dev --name init  # Primera migración
```

---

## 📋 Roadmap

- [ ] Definir modelos de BD completos (User, Transaction, Category, Budget, Group, etc.)
- [ ] Autenticación con JWT
- [ ] Módulo de Finanzas Personales (CRUD Transacciones + Presupuesto)
- [ ] Módulo Divisor de Gastos (Grupos + Algoritmo de deudas)
- [ ] Dashboard con gráficos
- [ ] Notificaciones push
- [ ] Exportar reportes PDF/CSV
