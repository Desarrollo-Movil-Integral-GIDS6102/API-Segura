# Guía Rápida de Ejecución: Backend, Frontend y Docker
## Secure Task Manager (Flutter + Node.js + PostgreSQL)

Esta guía describe paso a paso cómo poner en marcha los tres componentes del sistema en un entorno **Windows**:
1. Base de Datos con **Docker**
2. Servidor API con **Node.js y Express**
3. Aplicación móvil y cliente con **Flutter**

---

## 📋 Resumen de Terminales Recomendadas

Para trabajar cómodamente, abre **3 terminales** de PowerShell en la ruta principal:
`C:\INGENIERIA_4_AGOSTO-DIC2026\TACHO\UNIDAD II\Api`

- **Terminal 1:** Docker y Base de Datos
- **Terminal 2:** Backend (Node.js)
- **Terminal 3:** Frontend (Flutter)

---

## 🐳 PASO 1: Iniciar PostgreSQL con Docker

### 1.1 Iniciar el contenedor de PostgreSQL
En la **Terminal 1**, ingresa a la carpeta `backend` y levanta el servicio:
```powershell
cd "C:\INGENIERIA_4_AGOSTO-DIC2026\TACHO\UNIDAD II\Api\backend"
docker compose up -d
```
*(También puedes usar `docker-compose up -d`)*.

### 1.2 Verificar que el contenedor esté corriendo y saludable
```powershell
docker compose ps
```
Deberías ver el contenedor `backend-db-1` en estado `healthy` y escuchando en el puerto `5432:5432`.

### 1.3 Ver registros de PostgreSQL (Opcional)
```powershell
docker compose logs -f db
```

> **Alternativa sin Docker local:**
> Si no cuentas con Docker Desktop activo en tu equipo, puedes utilizar la base de datos PostgreSQL en la nube (Neon) que ya se encuentra configurada en el archivo `backend/.env`.

---

## 🟩 PASO 2: Iniciar el Backend (Node.js + Express + Prisma)

### 2.1 Configuración de Variables de Entorno
Asegúrate de que exista el archivo `.env` en la carpeta `backend`. Si no existe, créalo a partir de la plantilla:
```powershell
cd "C:\INGENIERIA_4_AGOSTO-DIC2026\TACHO\UNIDAD II\Api\backend"
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Revisa que tu archivo `.env` contenga los valores correspondientes:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://app_user:local_dev_only_change_me@localhost:5432/task_manager"
TEST_DATABASE_URL="postgresql://app_user:local_dev_only_change_me@localhost:5432/task_manager_test"
JWT_ACCESS_SECRET="clave_secreta_jwt_de_al_menos_32_caracteres_aleatorios"
JWT_REFRESH_SECRET="clave_secreta_refresh_de_al_menos_32_caracteres_aleatorios"
CORS_ORIGINS="http://localhost:3000,http://localhost:5000"
```

### 2.2 Sincronizar el Esquema con la Base de Datos (Prisma)
Aplica los modelos (`User`, `Task`, `RefreshToken`) a la base de datos:
```powershell
npx prisma db push
npx prisma generate
```

### 2.3 Arrancar el Servidor en Modo Desarrollo
Inicia el servidor con reinicio automático al guardar cambios:
```powershell
npm run dev
```

Deberás ver en consola:
```text
API listening on port 3000
```

### 2.4 Comprobar que el Backend Responde
En otra pestaña o navegador abre:
```powershell
curl http://localhost:3000/health
```
Respuesta esperada:
```json
{"status":"ok"}
```

---

## 📱 PASO 3: Ejecutar la Aplicación en Flutter

En la **Terminal 3**, navega a la carpeta del proyecto Flutter:
```powershell
cd "C:\INGENIERIA_4_AGOSTO-DIC2026\TACHO\UNIDAD II\Api\mobile"
```

### 3.1 Obtener dependencias y verificar análisis
```powershell
flutter pub get
flutter analyze
```

### 3.2 Ejecutar según tu entorno objetivo:

#### Opción A: En Emulador Android
> ⚠️ **Importante:** Desde un emulador Android, `localhost` se refiere al propio emulador. Para comunicarte con el backend que corre en Windows, se debe usar la IP de loopback especial de Android: `10.0.2.2`.
>
> El manifiesto de depuración de Android permite HTTP sin cifrar para conectar con el backend local. Esta excepción solo aplica a builds `debug`; para producción, configura HTTPS.

Inicia tu emulador Android y ejecuta:
```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

#### Opción B: En Windows Desktop
Ejecución nativa directa en el escritorio de Windows:
```powershell
flutter run -d windows --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

#### Opción C: En Navegador Web (Chrome / Edge)
```powershell
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

---

## 🧪 PASO 4: Ejecutar Pruebas Automatizadas

### Pruebas del Backend (Jest y Supertest)
Desde `backend/`:
```powershell
cd "C:\INGENIERIA_4_AGOSTO-DIC2026\TACHO\UNIDAD II\Api\backend"
npm test
```
*Ejecuta 23 pruebas de autenticación, validaciones, CRUD, tokens, rotación y aislamiento de datos.*

### Pruebas del Frontend (Flutter Unit & Widget Tests)
Desde `mobile/`:
```powershell
cd "C:\INGENIERIA_4_AGOSTO-DIC2026\TACHO\UNIDAD II\Api\mobile"
flutter test
```
*Ejecuta 9 pruebas del ciclo de refresco de tokens, modelos y estados de la interfaz.*

---

## 🛠 Solución de Problemas Comunes

| Problema | Causa | Solución |
| :--- | :--- | :--- |
| **Error 401 continuo en Flutter** | Tokens expirados o inválidos | Cierra sesión en la app (botón de logout) e inicia sesión nuevamente con tu correo y contraseña. |
| **No conecta al backend desde emulador Android** | Usar `localhost` en lugar de `10.0.2.2` | Asegúrate de pasar `--dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1` en el comando `flutter run`. |
| **Error 429: Too many requests** | Rate limiter de autenticación activado | Espera 15 minutos o reinicia el proceso del backend en la terminal (`Ctrl + C` y luego `npm run dev`). |
| **Error de puerto 5432 o 3000 en uso** | Otro servicio está ocupando el puerto | Revisa qué proceso lo ocupa con `netstat -ano \| findstr :3000` y ciérralo o cambia el puerto en `.env`. |
| **Error en build hooks con rutas que tienen espacios** | SDK de Flutter en ruta con espacios | Ejecuta las pruebas utilizando el junction creado en `C:\flutter` mediante `set PATH=C:\flutter\bin;%PATH%`. |
