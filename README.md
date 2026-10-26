# Secure Task Manager — Full Stack (Node.js & Flutter)

Aplicación full-stack para la gestión segura de tareas personales con autenticación JWT, rotación de refresh tokens con detección de reutilización, autorización estricta a nivel de objeto (IDOR prevention) y frontend reactivo en Flutter con Riverpod.

---

## 🏛 Arquitectura del Proyecto

El proyecto está estructurado en dos módulos desacoplados dentro de la raíz de trabajo:

```
Api/
├── backend/                  # API REST en Node.js + Express + Prisma ORM + PostgreSQL
│   ├── compose.yaml          # Configuración de PostgreSQL para Docker Compose
│   ├── openapi.yaml          # Documentación de la API (OpenAPI 3.0.3)
│   ├── package.json          # Dependencias y scripts de ejecución y prueba
│   ├── jest.config.js        # Configuración de pruebas Jest
│   ├── .env.example          # Plantilla de variables de entorno
│   ├── .env                  # Variables locales (ignorado en Git)
│   ├── prisma/
│   │   └── schema.prisma     # Modelos User, Task y RefreshToken
│   ├── src/
│   │   ├── app.js            # Configuración de Express, Helmet, CORS, Rate Limit y Rutas
│   │   ├── server.js         # Entrypoint y graceful shutdown
│   │   ├── config.js         # Validación de variables de entorno con Zod
│   │   ├── controllers/      # auth.controller.js, task.controller.js
│   │   ├── routes/           # auth.routes.js, task.routes.js
│   │   ├── services/         # auth.service.js, task.service.js
│   │   ├── repositories/     # task.repository.js, refresh-token.repository.js, user.repository.js
│   │   ├── middleware/       # auth.middleware.js, error.middleware.js, validate.middleware.js
│   │   ├── schemas/          # auth.schema.js, task.schema.js
│   │   └── utils/            # tokens.js (JWT, crypto SHA-256)
│   └── tests/                # Pruebas con Jest y Supertest (Base de datos independiente)
│       ├── setup.js
│       ├── health.test.js
│       ├── tokens.test.js
│       ├── auth.test.js
│       └── task.test.js
│
├── mobile/                   # Aplicación móvil en Flutter + Riverpod
│   ├── pubspec.yaml          # Dependencias (flutter_riverpod, http, flutter_secure_storage)
│   ├── lib/
│   │   ├── main.dart         # Entrypoint con ProviderScope y control reactivo de sesión
│   │   ├── core/
│   │   │   ├── config/       # app_config.dart (--dart-define API_BASE_URL)
│   │   │   ├── network/      # api_client.dart (refresh-and-retry transparente, single-flight)
│   │   │   └── storage/      # token_store.dart (flutter_secure_storage)
│   │   └── features/
│   │       ├── auth/         # Autenticación (Login, Registro, Logout)
│   │       │   ├── data/auth_repository.dart
│   │       │   └── presentation/ (auth_controller.dart, auth_state.dart, login_page.dart, register_page.dart)
│   │       └── tasks/        # Gestión de tareas (CRUD, aislamiento, estados UI)
│   │           ├── domain/task.dart
│   │           ├── data/task_repository.dart
│   │           └── presentation/ (task_controller.dart, task_state.dart, task_page.dart, widgets/)
│   └── test/                 # Pruebas unitarias y de widgets
│       ├── api_client_test.dart
│       ├── task_model_test.dart
│       └── widget_test.dart
│
└── README.md                 # Guía completa de instalación, ejecución y verificación
```

---

## 🔒 Mecanismos de Seguridad Implementados

1. **Cifrado de Contraseñas:** Bcrypt con factor de costo 12. Comparaciones temporales constantes ante correos inexistentes para prevenir ataques de enumeración.
2. **Access Tokens de Corta Duración:** JSON Web Tokens (HS256) con expiración de 10 minutos y validación estricta de emisor (`task-manager-api`), audiencia (`task-manager-client`) y tipo (`access`).
3. **Refresh Tokens Opacos:** Generación criptográfica aleatoria de 48 bytes base64url con vigencia de 7 días. Solo se almacenan los hashes SHA-256 en base de datos.
4. **Rotación y Detección de Reutilización:** Cada refresco invalida el token usado y emite un nuevo par. Si un token revocado es presentado nuevamente, se revoca de inmediato toda la familia (`familyId`), cerrando la sesión comprometida.
5. **Cierre de Sesión Completo:** `logout` revoca la familia en el servidor y limpia `flutter_secure_storage`. `logout-all` revoca todas las sesiones activas del usuario.
6. **Autorización a Nivel de Objeto:** El `ownerId` proviene exclusivamente del token JWT verificado en middleware. Ninguna consulta permite consultar, modificar o eliminar registros de otro usuario.
7. **Defensa en Profundidad en Backend:** Helmet para cabeceras HTTP seguras, CORS configurado restrictivamente, Rate Limiting contra ataques de fuerza bruta, límites de tamaño en payloads (20 KB) y validador centralizado con esquemas Zod.
8. **Manejo de Errores Seguro:** No se filtran trazas de pila ni detalles internos de SQL a los clientes.

---

## 🚀 Guía de Instalación y Ejecución en Windows

### 1. Iniciar PostgreSQL con Docker Compose
Desde la carpeta `backend`:
```powershell
cd backend
docker compose up -d
```
*(Alternativamente, puede utilizarse una base de datos PostgreSQL local o en la nube como Neon especificando su URL en `.env`)*.

### 2. Configurar Variables de Entorno del Backend
Copiar la plantilla y configurar los secretos:
```powershell
cp .env.example .env
```
Asegúrate de que `.env` contenga:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://app_user:local_dev_only_change_me@localhost:5432/task_manager"
TEST_DATABASE_URL="postgresql://app_user:local_dev_only_change_me@localhost:5432/task_manager_test"
JWT_ACCESS_SECRET="clave_secreta_aleatoria_de_al_menos_32_caracteres"
JWT_REFRESH_SECRET="otra_clave_secreta_aleatoria_de_al_menos_32_caracteres"
CORS_ORIGINS="http://localhost:3000,http://localhost:5000"
```

### 3. Ejecutar Migraciones de Base de Datos
```powershell
npx prisma db push
# O en modo desarrollo con historial de migraciones:
npx prisma migrate dev --name init
```

### 4. Iniciar el Servidor Backend
```powershell
npm run dev
```
La API escuchará en el puerto `3000`. Puedes verificar su estado en:
```powershell
curl http://localhost:3000/health
```

### 5. Ejecutar la Aplicación Flutter
Desde la carpeta `mobile`:

- **Para Emulador Android:**
  *(Usa `10.0.2.2` para acceder al localhost de Windows)*
  ```powershell
  cd ../mobile
  flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
  ```

- **Para Windows Desktop / Web / Dispositivo Local:**
  ```powershell
  cd ../mobile
  flutter run -d windows --dart-define=API_BASE_URL=http://localhost:3000/api/v1
  ```

---

## 🧪 Verificación y Pruebas Automatizadas

### Pruebas del Backend (Jest + Supertest)
Las pruebas se ejecutan contra una base de datos aislada (`task_manager_test`) para garantizar repetibilidad:
```powershell
cd backend
npm test
```
**Resultados verificados:**
- `health.test.js`: Comprobación de estado `/health` (PASS).
- `tokens.test.js`: Emisión, validación y hashing SHA-256 de tokens (PASS).
- `auth.test.js`: Registro, validaciones Zod, logins correctos e incorrectos con mensajes genéricos, rotación de refresh tokens, revocación de familia por detección de reutilización, `logout` y `logout-all` (PASS).
- `task.test.js`: Rechazo de peticiones no autenticadas, creación con validación de campos, paginación, edición, completado, eliminación y verificación estricta de aislamiento entre usuarios (User B no puede leer, actualizar ni borrar tareas de User A) (PASS).
- **Total:** 4 suites pasadas, 23 pruebas pasadas.

### Análisis y Pruebas de Flutter
Desde la carpeta `mobile`:
```powershell
cd mobile
flutter analyze
```
**Resultado:** `No issues found!` (0 errores, 0 advertencias).

```powershell
flutter test
```
**Resultados verificados:**
- `ApiClient`: Ciclo automático de refresco y reintento único ante 401 usando `MockClient` (PASS).
- `ApiClient`: Manejo seguro de excepciones `ApiException` sin filtrar datos confidenciales (PASS).
- `Task`: Serialización/deserialización y exclusión de identificadores de usuario en payloads de escritura (PASS).
- `TaskListView`: Renderizado en estado de carga (`CircularProgressIndicator`), estado vacío (`No tasks yet`), estado de error con botón `Retry` y visualización de tareas con selector de estado y confirmación de borrado (PASS).
- **Total:** 9 pruebas pasadas.

---

## 📖 Documentación OpenAPI 3.0
La especificación de la API se encuentra en [`backend/openapi.yaml`](backend/openapi.yaml).
Define todos los esquemas de datos, parámetros de paginación, códigos de respuesta HTTP (200, 201, 204, 400, 401, 404, 409) y el esquema de seguridad `bearerAuth`.

---

## 📸 Galería y Lista de Evidencias de Funcionamiento

Las capturas de pantalla de la ejecución real se encuentran almacenadas en [`Evidencias/Fotos/`](Evidencias/Fotos/). A continuación se presenta la integración y estado de cada una:

### Lista de Control de Evidencias

#### [X] 01. Base de datos e inicio de Docker
Ejecución de `docker compose up -d` levantando el servicio PostgreSQL en segundo plano.

![Docker Compose](<Evidencias/Fotos/docker_compose-up_d.png>)

---

#### [X] 02. Sincronización de Base de Datos con Prisma ORM
Ejecución de `npx prisma db push` sincronizando los modelos (`User`, `Task`, `RefreshToken`) y generando el cliente Prisma.

![Sincronización con Prisma](<Evidencias/Fotos/Sincronizar el Esquema con la Base de Datos (Prisma).png>)

---

#### [X] 03. Servidor Backend en Modo Desarrollo
Arranque del servidor Node.js/Express mediante `npm run dev` escuchando activamente en el puerto `3000`.

![Servidor Backend](<Evidencias/Fotos/Arrancar el Servidor en Modo Desarrollo.png>)

---

#### [X] 04. Registro de Usuario (Frontend Flutter)
Formulario de creación de cuenta ("Create Account" / "Join Secure Tasks") en Flutter con validación de contraseña mínima de 12 caracteres.

![Registro de Usuario](<Evidencias/Fotos/create count.png>)

---

#### [X] 05. Manejo de Errores y Seguridad (Cuenta Duplicada / Conflicto)
Respuesta segura y feedback visual en la aplicación ante intento de registro con un correo ya existente ("An account with this email already exists" - HTTP 409).

![Cuenta Duplicada](<Evidencias/Fotos/Create countalready exists.png>)

---

#### [X] 06. Inicio de Sesión Exitoso (Frontend Flutter)
Pantalla de inicio de sesión ("Sign In" / "Welcome Back") con campos validados y alternancia de visibilidad de contraseña.

![Inicio de Sesión](<Evidencias/Fotos/Iniciarsecion.png>)

---

#### [X] 07. Creación de Tarea (CRUD)
Diálogo modal interactivo ("New Task") en Flutter para añadir tareas personales con validación de longitud de título y descripción.

![Crear Tarea](<Evidencias/Fotos/Crear tarea.png>)

---

#### [X] 08. Consulta y Listado de Tareas
Panel principal de tareas en Flutter mostrando las tareas del usuario autenticado, checkboxes de completado y botones de eliminación.

![Listar Tareas](<Evidencias/Fotos/Listar tareas.png>)

---

#### [X] 09. Obtención de Dependencias y Análisis de Flutter (`flutter analyze`)
Comprobación de dependencias con `flutter pub get` y ejecución limpia de `flutter analyze` (`No issues found!`).

![Análisis Flutter](<Evidencias/Fotos/Obtener dependencias y verificar análisisfront.png>)

---

#### [X] 10. Documentación OpenAPI y Pruebas Automatizadas
- Contrato OpenAPI 3.0 documentado en [`backend/openapi.yaml`](backend/openapi.yaml).
- 23 pruebas automatizadas de backend (`health.test.js`, `tokens.test.js`, `auth.test.js`, `task.test.js`) ejecutadas y aprobadas al 100%.
- 9 pruebas automatizadas de Flutter (`api_client_test.dart`, `task_model_test.dart`, `widget_test.dart`) aprobadas al 100%.

---

### ¿Qué archivos se deben entregar además de las capturas?
1. **Código fuente completo:** Directorio `backend/` y directorio `mobile/`.
2. **Docker Compose:** `backend/compose.yaml` y `backend/docker-compose.yml`.
3. **Esquema de Base de Datos:** `backend/prisma/schema.prisma`.
4. **Variables de entorno de ejemplo:** `backend/.env.example` (sin contraseñas ni secretos reales).
5. **Pruebas automatizadas:** Directorio `backend/tests/` y `mobile/test/`.
6. **Documentación:** `README.md` y `GUIA_EJECUCION.md`.
7. **Especificación OpenAPI:** `backend/openapi.yaml`.

---

### Enfoque de Evidencias (Full-Stack vs Solo Frontend)
- **Full-Stack (Proyecto Completo):** Se demuestra Front-End (Flutter), Back-End (Node.js/Express) y Base de Datos (PostgreSQL/Prisma) según la lista documentada arriba.
- **Si únicamente se solicitan evidencias de Front-End:**
  1. Pantalla de registro ([`Evidencias/Fotos/create count.png`](<Evidencias/Fotos/create count.png>)).
  2. Pantalla de inicio de sesión ([`Evidencias/Fotos/Iniciarsecion.png`](<Evidencias/Fotos/Iniciarsecion.png>)).
  3. Lista de tareas ([`Evidencias/Fotos/Listar tareas.png`](<Evidencias/Fotos/Listar tareas.png>)).
  4. Formulario modal para crear una tarea ([`Evidencias/Fotos/Crear tarea.png`](<Evidencias/Fotos/Crear tarea.png>)).
  5. Edición y confirmación de eliminación de tareas.
  6. Estados de carga (`CircularProgressIndicator`), lista vacía (`No tasks yet`) y mensaje de error con botón `Retry` ([`Evidencias/Fotos/Create countalready exists.png`](<Evidencias/Fotos/Create countalready exists.png>)).
  7. Aplicación ejecutándose en emulador Android o ventana de Windows.
  8. Terminal con resultado de `flutter analyze` ([`Evidencias/Fotos/Obtener dependencias y verificar análisisfront.png`](<Evidencias/Fotos/Obtener dependencias y verificar análisisfront.png>)) y `flutter test`.

