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

## 🧪 Estrategia de Pruebas de Software (QA)

El proyecto implementa una estrategia integral de aseguramiento de calidad (QA) y pruebas de software, rigurosamente orientada por la guía metodológica **"Become a Better Application Tester: A Hands-On Task Manager Guide"**.

Esta estrategia se fundamenta en la **Pirámide de Pruebas** (*Test Pyramid*), dividida en dos etapas complementarias:

1. **Etapa 1 — Backend (Node.js + Express + Prisma + Jest + Supertest):**
   - **Pruebas unitarias puras y aisladas:** Implementación de pruebas rápidas e independientes de red y base de datos con mocks en Jest para `AuthService`, `TaskService`, middlewares (`auth`, `error`, `validate`) y repositorios (`UserRepository`).
   - **Pruebas de integración y persistencia:** Validación HTTP con Supertest contra la base de datos de pruebas PostgreSQL (`task_manager_test`).
   - **Validación y Análisis de Valores Límite (BVA):** Pruebas en fronteras exactas (longitudes mínimas y máximas de contraseñas, títulos de tareas de 1 a 120 caracteres, descripciones de hasta 2000 caracteres, y paginación).
   - **Seguridad API (OWASP API Security):** Verificación de aislamiento estricto de tareas entre usuarios (prevención de IDOR/BOLA), protección contra ataques de fuerza bruta mediante Rate Limiting (HTTP 429), rechazo de payloads superiores a 20 KB (HTTP 413), cabeceras defensivas Helmet y CORS restrictivo.
   - **Medición de Cobertura de Código:** Configuración de Jest Coverage alcanzando más del **99% en líneas y sentencias**, con reportes interactivos en HTML, LCOV y consola.

2. **Etapa 2 — Mobile y CI/CD (Flutter + Riverpod + GitHub Actions):**
   - **Pruebas unitarias mobile:** Validación del cliente de red `ApiClient` con interceptor de auto-refresco y reintento único transparente ante respuestas 401, serialización de modelos de dominio `Task` y controladores de estado reactivos con Riverpod (`AuthController`, `TaskController`).
   - **Pruebas de widgets:** Verificación de estados de interfaz: carga (`CircularProgressIndicator`), lista vacía (`No tasks yet`), error con botón de reintento (`Retry`) e interacciones de usuario.
   - **Análisis estático y regresión:** Verificación estricta de código limpio (`flutter analyze` con 0 errores) y ejecución acumulativa de suites con `flutter test`.
   - **Automatización CI/CD:** Definición del pipeline de integración continua en GitHub Actions para validar backend y frontend automáticamente en cada pull request y commit.

El catálogo completo de capturas y comprobación técnica se encuentra en:
- 📁 **[Carpeta Raíz de Evidencias](Evidencias/)**

---

## 📸 Galería General de Evidencias del Proyecto

A continuación se presentan las evidencias gráficas organizadas en dos partes:
1. **Primera Parte:** Puesta en marcha inicial, base de datos y funcionamiento de la interfaz de usuario.
2. **Segunda Parte:** Implementación de aseguramiento de calidad, pruebas unitarias, integración, análisis de valores límite (BVA), seguridad API y medición de cobertura de código.

---

### Primera Parte: Evidencias de Puesta en Marcha y Funcionamiento (Operacional)

Las siguientes capturas demuestran el correcto arranque de la infraestructura, migración de base de datos y flujos visuales del frontend en [`Evidencias/Fotos/`](Evidencias/Fotos/):

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

### Segunda Parte: Aseguramiento de Calidad, Cobertura y Pruebas de Software (QA)

#### 🎯 Objetivo General de la Actividad de Pruebas
El objetivo primordial de esta nueva fase de aseguramiento de calidad (QA) consistió en **elevar los estándares de confiabilidad, resiliencia y seguridad** de la aplicación *Secure Task Manager*, guiados por la metodología práctica descrita en el documento **"Become a Better Application Tester: A Hands-On Task Manager Guide"**. 

Se buscó transformar un proyecto con verificación manual y pruebas básicas en un sistema de software con una arquitectura de pruebas robusta y auditable, validando de manera matemática y empírica:
1. El aislamiento de la lógica de negocio mediante pruebas unitarias deterministas.
2. La integridad en las fronteras de datos mediante el Análisis de Valores Límite (*Boundary Value Analysis - BVA*).
3. La resistencia ante vectores de ataque web comunes conforme al estándar OWASP API Security (prevención de IDOR, Rate Limiting y límites de carga).
4. La medición formal y automatizada de la cobertura de código (*Code Coverage*) superando el 99% en líneas y sentencias.

#### 💡 Justificación Metodológica: ¿Por qué se realizó esta actividad?
1. **Superar la falacia del "funciona en mi máquina":** Un software no puede considerarse seguro ni listo para producción únicamente porque funciona en flujos ideales (*happy path*). Se requería verificar sistemáticamente el comportamiento ante entradas inválidas, tipos corruptos, fallos de red y manipulaciones maliciosas.
2. **Rebalanceo de la Pirámide de Pruebas (*Test Pyramid*):** El backend dependía casi en su totalidad de pruebas de integración acopladas a PostgreSQL (`task_manager_test`). Si la base de datos no estaba disponible, la suite completa fallaba. Mediante esta actividad se implementaron **62 pruebas unitarias con mocks en Jest**, logrando que la verificación de lógica de negocio se ejecute en ~4 segundos sin depender de infraestructura externa.
3. **Control Riguroso en Fronteras (*Boundary Value Analysis*):** La mayoría de los defectos en producción surgen en los bordes de los campos (ej. contraseñas de 11 vs 12 caracteres, títulos de 120 vs 121 caracteres, paginación con valores negativos o límites superiores a 100). Era indispensable someter los esquemas Zod a pruebas de frontera exactas.
4. **Verificación de Seguridad Defensiva Activa:** Validar en la práctica que un usuario atacante (Usuario B) jamás pueda leer, modificar ni borrar tareas del Usuario A cambiando identificadores en la URL (IDOR/BOLA), que el servidor rechace ataques de denegación de servicio por cuerpos JSON excesivos (HTTP 413) y que bloquee ataques de fuerza bruta en credenciales (HTTP 429).
5. **Auditoría Transparente de Cobertura:** Reemplazar supuestos con evidencia cuantitativa verificable mediante Jest Coverage e Istanbul, generando reportes navegables que confirman el 100% de cobertura en los servicios centrales de autenticación y tareas.

---

#### 🧪 Evidencias Gráficas — Etapa 1: Backend (Jest, Supertest, Zod y Cobertura)

##### [X] E1-01. Cobertura Inicial del Backend (Estado Previo a Nuevas Pruebas)
Ejecución del comando `npm test` en el backend antes de configurar Jest Coverage, mostrando la suite inicial de 4 archivos y 23 pruebas sin reporte de cobertura activado.

![E1-01: Cobertura Inicial](<Evidencias/etapa-1-backend/E1-01-cobertura-inicial-consola.png>)

---

##### [X] E1-02. Configuración de Jest Coverage y Scripts en package.json
Vista en editor de código de `jest.config.js` (`collectCoverageFrom`, `coverageReporters: ['text', 'text-summary', 'lcov', 'html']`, `coverageThreshold`) y los scripts agregados en `package.json` (`test:coverage`, `test:unit`, `test:integration`).

![E1-02: Configuración de Jest Coverage](<Evidencias/etapa-1-backend/E1-02-configuracion-jest-coverage.png>)

---

##### [X] E1-03. Pruebas Unitarias Aisladas de AuthService
Ejecución exitosa de `tests/unit/auth.service.test.js` con 12 pruebas unitarias deterministas: registro con hash bcrypt, control de duplicados (P2002 -> HTTP 409), login con hash ficticio (*dummy hash*) contra ataques de temporización, rotación transaccional de tokens y revocación en cadena ante reuso de tokens comprometidos.

![E1-03: Pruebas Unitarias AuthService](<Evidencias/etapa-1-backend/E1-03-pruebas-unitarias-auth-service.png>)

---

##### [X] E1-04. Pruebas Unitarias Aisladas de TaskService
Ejecución de `tests/unit/task.service.test.js` validando con repositorios mockeados el cálculo de paginación (*offset*), creación delegada con `ownerId`, actualizaciones y lanzamiento estricto de error 404 (`NOT_FOUND`) cuando la tarea no pertenece al usuario autenticado.

![E1-04: Pruebas Unitarias TaskService](<Evidencias/etapa-1-backend/E1-04-pruebas-unitarias-task-service.png>)

---

##### [X] E1-05. Pruebas Unitarias de Middlewares (Auth, Error, Validate)
Ejecución de las suites unitarias para `auth.middleware.js` (rechazo de tokens sin cabecera Bearer, tokens expirados y firmas corruptas), `error.middleware.js` (enmascaramiento seguro de errores 500 para evitar fugas de información) y `validate.middleware.js` (formateo de errores 400 Zod).

![E1-05: Pruebas Unitarias Middlewares](<Evidencias/etapa-1-backend/E1-05-pruebas-unitarias-middlewares.png>)

---

##### [X] E1-06. Pruebas Unitarias de UserRepository
Ejecución de `tests/unit/user.repository.test.js` validando los métodos `findByEmail`, `findById` y `create` mediante inyección del cliente de base de datos simulado.

![E1-06: Pruebas Unitarias UserRepository](<Evidencias/etapa-1-backend/E1-06-pruebas-unitarias-user-repository.png>)

---

##### [X] E1-07. Pruebas de Integración con Supertest y Base de Datos
Ejecución de `tests/auth.test.js` y `tests/task.test.js` validando flujos HTTP completos de autenticación y persistencia en PostgreSQL (`task_manager_test`), incluyendo la verificación de aislamiento entre Usuario A y Usuario B.

![E1-07: Pruebas de Integración](<Evidencias/etapa-1-backend/E1-07-pruebas-integracion-supertes.png>)

---

##### [X] E1-08. Validaciones de Esquemas Zod (Auth y Task)
Ejecución de las pruebas de validación de esquemas Zod en `schemas.test.js`, comprobando la sanitización, normalización de correos electrónicos en minúsculas y rechazo de campos con tipos incorrectos.

![E1-08: Validaciones Zod](<Evidencias/etapa-1-backend/E1-08-validaciones-esquemas-zod.png>)

---

##### [X] E1-09. Análisis de Valores Límite (Boundary Value Analysis - BVA)
Ejecución de las pruebas de frontera (BVA) en `schemas.test.js`: contraseñas de 11 caracteres (rechazada) vs 12 caracteres (aceptada) vs 128 (máximo) vs 129 (rechazada), títulos de 1 carácter vs 120 vs 121, y descripciones de hasta 2000 caracteres.

![E1-09: Análisis de Valores Límite BVA](<Evidencias/etapa-1-backend/E1-09-analisis-valores-limite-bva.png>)

---

##### [X] E1-10. Seguridad API — Cabeceras Defensivas Helmet y CORS
Ejecución de `tests/security.test.js` verificando la remoción de la cabecera `X-Powered-By` para prevenir fingerprinting, presencia de cabeceras seguras inyectadas por Helmet (`nosniff`, `X-Frame-Options`) y bloqueo controlado de peticiones desde orígenes CORS no autorizados.

![E1-10: Seguridad API Cabeceras](<Evidencias/etapa-1-backend/E1-10-seguridad-api-defensas-headers.png>)

---

##### [X] E1-11. Seguridad API — Rechazo de Cargas Superiores a 20 KB (HTTP 413)
Verificación de defensa contra denegación de servicio por sobrecarga de datos enviando un cuerpo JSON de 25 KB a la API y comprobando la respuesta con código HTTP 413 (*Payload Too Large*).

![E1-11: Límite de Payload HTTP 413](<Evidencias/etapa-1-backend/E1-11-seguridad-api-payload-limit-413.png>)

---

##### [X] E1-12. Seguridad API — Mitigación de Fuerza Bruta con Rate Limiting (HTTP 429)
Simulación de ráfaga de peticiones sobre rutas de autenticación (`/api/v1/auth/login`) verificando que al superar el umbral configurado (`limiter(10)`) el servidor bloquee inmediatamente con HTTP 429 y código de error `RATE_LIMITED`.

![E1-12: Rate Limiting HTTP 429](<Evidencias/etapa-1-backend/E1-12-seguridad-api-rate-limiting-429.png>)

---

##### [X] E1-13. Resumen Final de Cobertura en Terminal (>99% Líneas)
Salida completa en consola de `npm run test:coverage` mostrando las 12 suites y 91 pruebas aprobadas al 100%, con métricas sobresalientes: **99.11% en sentencias**, **89.39% en ramas**, **98.11% en funciones** y **99.07% en líneas**.

![E1-13: Resumen Final de Cobertura en Consola](<Evidencias/etapa-1-backend/E1-13-cobertura-final-terminal.png>)

---

##### [X] E1-14. Reporte Interactivo de Cobertura HTML en Navegador (Vista General)
Visualización en navegador web de la interfaz de reporte generada por Istanbul (`coverage/lcov-report/index.html`), mostrando todas las carpetas del código fuente con barras de progreso en verde.

![E1-14: Reporte HTML General](<Evidencias/etapa-1-backend/E1-14-reporte-cobertura-html-general.png>)

---

##### [X] E1-15. Reporte HTML en Navegador — Detalle de Servicios al 100%
Navegación al directorio `src/services/` dentro del reporte HTML, demostrando que tanto `auth.service.js` como `task.service.js` cuentan con el **100% de funciones y líneas cubiertas**.

![E1-15: Reporte HTML Servicios](<Evidencias/etapa-1-backend/E1-15-reporte-cobertura-html-detalle-services.png>)

---

#### 📱 Evidencias Gráficas — Etapa 2: Mobile y Regresión (Flutter y Riverpod)

##### [X] E2-01. Análisis Estático de Código en Flutter (flutter analyze)
Ejecución de `flutter analyze` en la terminal del módulo móvil, certificando que no existen errores de sintaxis, tipado ni advertencias del linter oficial (`No issues found!`).

![E2-01: Flutter Analyze](<Evidencias/etapa-2-mobile-cicd/E2-01-analisis-estatico-flutter.png>)

---

##### [X] E2-02. Pruebas Unitarias del Cliente de Red ApiClient
Ejecución de `mobile/test/api_client_test.dart` comprobando el interceptor HTTP de auto-refresco transparente de token ante respuestas 401 y el reintento exitoso de la solicitud original mediante `MockClient`.

![E2-02: Pruebas Unitarias ApiClient](<Evidencias/etapa-2-mobile-cicd/E2-02-pruebas-unitarias-api-client.png>)

---

##### [X] E2-03. Pruebas Unitarias de Modelos de Dominio (Task)
Ejecución de `mobile/test/task_model_test.dart` comprobando la serialización y deserialización JSON (`fromJson`, `toJson`), inmutabilidad con `copyWith` y rechazo seguro ante identificadores o títulos vacíos.

![E2-03: Pruebas Unitarias Modelos](<Evidencias/etapa-2-mobile-cicd/E2-03-pruebas-unitarias-modelos.png>)

---

##### [X] E2-04. Pruebas Unitarias de Controladores Riverpod (AuthController y TaskController)
Ejecución de pruebas unitarias sobre los controladores de estado reactivos de Riverpod, verificando las transiciones de estados (`AsyncValue.loading`, `data`, `error`) de sesión y tareas.

![E2-04: Controladores Riverpod](<Evidencias/etapa-2-mobile-cicd/E2-04-pruebas-unitarias-controllers.png>)

---

##### [X] E2-06. Pruebas de Widgets — Estados de Carga, Vacío y Error con Reintento
Ejecución de `mobile/test/widget_test.dart` verificando que el widget `TaskListView` responda correctamente a los 4 estados de UI: cargando (`CircularProgressIndicator`), lista vacía (`No tasks yet.`), error con mensaje seguro y ejecución del callback de reintento (`onRetry`).

![E2-06: Pruebas de Widgets](<Evidencias/etapa-2-mobile-cicd/E2-06-pruebas-widgets-estados-ui.png>)

---

##### [X] E2-09. Suite Completa de Pruebas de Regresión en Flutter
Ejecución acumulativa de todas las pruebas del cliente móvil con `flutter test`, confirmando que todas las suites pasaron satisfactoriamente sin regresiones en la interfaz ni en la lógica de negocio.

![E2-09: Regresión Completa Flutter](<Evidencias/etapa-2-mobile-cicd/E2-09-pruebas-regresion-suite-completa.png>)



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

