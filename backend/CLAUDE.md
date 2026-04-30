# Backend TrailAndMeet - Edge Functions Supabase

**Nota**: Las Edge Functions NO se ejecutan localmente. Se despliegan en Supabase y se invocan desde el frontend vía HTTP `fetch`.

## Stack
- **Runtime**: Deno (TypeScript)
- **Invocación**: `${SUPABASE_URL}/functions/v1/<function-name>`
- **Auth**: Bearer token (JWT) o ANON_KEY
- **Base de datos**: PostgreSQL (Supabase)

---

## � Client Creation Patterns (Critical for RLS)

### **Context: Stateless Functions**
Edge Functions en Deno son **completamente stateless**. Cada request ejecuta una nueva instancia del handler, sin persistencia de estado. Por esto, **cada función DEBE crear su cliente Supabase desde cero**.

### **Patrón 1: Operaciones Públicas / Server-Only (10 funciones)** ✅
**Usa SERVICE_ROLE_KEY sin Authorization header**

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

**Funciones que lo usan correctamente:**
- `auth-check-email`, `auth-check-username`, `auth-login`, `auth-logout`
- `get-filtered-excursions`, `get-excursion-detail`, `get-excursion-participants`
- `download-gpx`, `create-excursion-with-gpx`, `parse-and-create-excursion`

**Cuándo usarlo:**
- No requiere validar identidad del usuario (es pública)
- O la validación ocurre via Supabase Auth directamente
- RLS se ignora automáticamente (SERVICE_ROLE_KEY = super admin)

---

### **Patrón 2: Operaciones Sensibles con Autorización (DEBE SER DUAL-CLIENT)** ⚠️
**Usa authClient (ANON_KEY + Authorization header) PARA VALIDAR + supabase (SERVICE_ROLE_KEY) PARA ACTUAR**

```typescript
// ✅ CORRECTO: Dual-client pattern
const authClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: authHeader } }, ... }
)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Validar usuario
const { data: { user }, error } = await authClient.auth.getUser(token)

// Hacer operación (RLS NO aplica, pero usuario está verificado)
const { data } = await supabase.from('excursion').update(...).eq('id', id)
```

**Por qué es necesario:**
- SERVICE_ROLE_KEY ignora RLS → cualquiera podría bypassear si no validamos antes
- ANON_KEY + Authorization header = valida que el token sea legítimo
- Combinar ambos = máxima seguridad + máxima flexibilidad

**Funciones que YA LO USAN CORRECTAMENTE:**
- `update-excursion` (desde commit más reciente)

**Funciones que NECESITAN ESTA REFACTORIZACIÓN URGENTE:**
- **HIGH PRIORITY**: `delete-excursion`, `finish-excursion`, `respond-join-request`
- **MEDIUM PRIORITY**: `get-pending-requests`, `get-my-excursions`, `request-join-excursion`, `cancel-join-request`, `leave-excursion`, `confirm-attendance`, `auth-complete-registration`

---

### **Frontend: Cliente Único Reutilizable**
En contraste, el frontend **crea el cliente UNA sola vez** y lo reutiliza:

```typescript
// src/services/supabaseClient.ts
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { storage: AsyncStorage, ... }
)

// src/services/excursionService.ts
import { supabase } from './supabaseClient'
export async function getExcursions() {
  const { data } = await supabase.from('excursion').select()
  // ↑ Reutilizando cliente existente (correcto)
}
```

**Regla Simple:**
| Contexto | Patrón | Razón |
|---|---|---|
| **Edge Function** | Nuevo cliente en cada request | Stateless, sin persistencia entre requests |
| **Frontend Service** | Cliente singleton importado | Persiste durante sesión app, reutilización eficiente |

---

## �📋 Estructura Lógica

```
AUTENTICACIÓN
├─ auth-check-email/
├─ auth-check-username/
├─ auth-complete-registration/
├─ auth-login/
└─ auth-logout/

EXCURSIONES (CRUD)
├─ create-excursion-with-gpx/        (crear + procesar GPX)
├─ update-excursion/                 (solo organizador)
├─ delete-excursion/                 (solo organizador)
├─ get-filtered-excursions/          (listar públicas con filtros)
├─ get-my-excursions/                (mis excursiones creadas + unidas)
├─ get-excursion-detail/             (detalle + calcula isOrganizer)
├─ finish-excursion/                 (marcar como finalizada)
└─ download-gpx/                     (descargar ruta GPX)

PARTICIPACIÓN (Join/Leave)
├─ request-join-excursion/           (solicitar unirse)
├─ cancel-join-request/              (cancelar solicitud)
├─ join-excursion/                   (aceptado directo - NO USADO)
├─ leave-excursion/                  (abandonar excursión)
├─ confirm-attendance/               (confirmar asistencia)

SOLICITUDES & PARTICIPANTES (Solo organizador)
├─ get-pending-requests/             (ver solicitudes pendientes)
├─ respond-join-request/             (aceptar/rechazar solicitud)
└─ get-excursion-participants/       (listar participantes aceptados)

PARSING (Interno)
└─ parse-and-create-excursion/       (parsear GPX sin crear - LEGACY)
```

---

## 🔐 Autenticación

### `auth-check-email` (POST)
**Validar si email ya existe** (antes de registro)
- **Input**: `{ email: string }`
- **Output**: `{ exists: boolean }`
- **Token**: ANON_KEY
- **BD**: Consulta `auth.users` (tabla interna de Supabase)

### `auth-check-username` (POST)
**Validar si username ya existe**
- **Input**: `{ username: string }`
- **Output**: `{ exists: boolean }`
- **Token**: ANON_KEY
- **BD**: Consulta tabla `usuario` (nombreUsuario)

### `auth-complete-registration` (POST)
**Completar registro (Step 2 del flujo)**
- **Input**: `{ username: string }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN (usuario autenticado)
- **BD**: Inserta en tabla `usuario`
- **Nota**: Usuario ya existe en `auth.users` (creado en Step 1 del frontend)

### `auth-login` (POST)
**Login con email/password**
- **Input**: `{ email: string, password: string }`
- **Output**: `{ session: Session, user: User }`
- **Token**: ANON_KEY
- **BD**: Usa Supabase Auth directamente (`supabase.auth.signInWithPassword`)
- **Retorna**: Sesión completa (access_token, refresh_token, etc.)

### `auth-logout` (POST)
**Cerrar sesión**
- **Input**: `{ token: string }`
- **Output**: `{ success: boolean }`
- **Token**: ANON_KEY
- **BD**: Usa Supabase Auth

---

## 🗻 Excursiones - CRUD

### `create-excursion-with-gpx` (POST)
**Crear excursión + procesar archivo GPX**
- **Input**:
  ```typescript
  {
    gpxBase64: string,           // Archivo en base64
    p_titulo: string,
    p_dificultad: "Facil" | "Medio" | "Dificil",
    p_fecha_inicio: ISO8601,
    p_capacidad: number,
    p_tipo_excursion: string,
    p_punto_encuentro: string,
    p_imagen_url: string | null,
    p_gpx_path: string,          // Path en Storage (ya subido)
    p_status: "published"
  }
  ```
- **Output**: `{ success: boolean, routeInfo: { startPoint, totalDistance, maxElevation, ... } }`
- **Token**: ACCESS_TOKEN (usuario autenticado)
- **Proceso**:
  1. Descarga GPX de Storage (Storage.download)
  2. Parsea XML para extraer trackpoints
  3. Calcula estadísticas (distancia, elevación, etc.)
  4. Inserta excursión en tabla `excursion`
  5. Devuelve routeInfo al frontend
- **BD**: Inserta `excursion` + quizá `ruta` (si tabla existe)

### `update-excursion` (POST)
**Editar excursión (solo organizador)**
- **Input**:
  ```typescript
  {
    excursionId: number,
    titulo?: string,
    capacidad?: number,
    dificultad?: string,
    tipoExcursion?: string,
    puntoEncuentro?: string,
    meetingLat?: number,
    meetingLng?: number,
    imagenURL?: string
  }
  ```
- **Output**: `{ success: true, updated: string[] }`
- **Token**: ACCESS_TOKEN
- **Validaciones**:
  - Solo organizador puede editar (comparar userId con `excursion.creadoPor`)
  - Status debe ser 'published' (no finalizada/cancelada)
  - Capacidad NO puede bajar por debajo de participantes aceptados
  - Campos `fechaInicio` y `GPXPath` son NO editables (por requisito)
- **BD**: UPDATE `excursion` con campos permitidos

### `delete-excursion` (POST)
**Eliminar excursión (solo organizador)**
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN
- **Validaciones**: Solo organizador, status 'published'
- **BD**: DELETE de `excursion` + cascada limpia participantes

### `get-filtered-excursions` (POST)
**Listar excursiones públicas con filtros**
- **Input**:
  ```typescript
  {
    dificultad?: string,
    tipoExcursion?: string,
    offset?: number,
    limit?: number
  }
  ```
- **Output**: `{ excursions: Excursion[], total: number }`
- **Token**: ANON_KEY (público)
- **BD**: SELECT de `excursion` con WHERE filters
- **Nota**: No incluye info de participación del usuario (no autenticado)

### `get-my-excursions` (GET con query param)
**Mis excursiones (creadas + unidas)**
- **Query params**: `?tipo=todas|organizadas|unidas`
- **Output**: `Excursion[]`
- **Token**: ACCESS_TOKEN
- **Lógica**:
  - `organizadas`: WHERE `creadoPor = userId`
  - `unidas`: WHERE userId en tabla `participacion` con status='accepted'
  - `todas`: UNION de ambas
- **BD**: SELECT con JOINs a `participacion`

### `get-excursion-detail` (POST)
**Detalle completo de excursión + estado participación**
- **Input**: `{ excursionId: number }`
- **Output**: Objeto `ExcursionDetail` (ver frontend)
- **Token**: ACCESS_TOKEN o ANON_KEY
- **Proceso**:
  1. Llama RPC `obtener_detalle_excursion` (datos base)
  2. SELECT directo de tabla `excursion` para obtener `creadoPor`
  3. Si autenticado: obtiene userId del token
  4. **Calcula `isOrganizer = (userId === creadoPor)`** ← CRÍTICO para mostrar botones
  5. Cuenta participantes aceptados
  6. Si usuario autenticado: obtiene su estado (`pending`/`accepted`/null)
  7. Devuelve enriquecido
- **BD**: RPC + SELECT excursion + COUNT participación + SELECT estado usuario
- **Campos clave**:
  - `isOrganizer`: boolean (muestra OrganizerActions vs ParticipantActions)
  - `myParticipationStatus`: 'pending' | 'accepted' | null
  - `attendanceConfirmed`: boolean (asistencia confirmada)

### `finish-excursion` (POST)
**Marcar excursión como finalizada**
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN
- **Validaciones**: Solo organizador, status='published', fecha >= ahora
- **BD**: UPDATE `excursion` SET `status='finished'`

### `download-gpx` (POST)
**Descargar archivo GPX**
- **Input**: `{ gpxPath: string }`
- **Output**: Texto XML crudo
- **Token**: ANON_KEY o ACCESS_TOKEN
- **Storage**: Descarga desde Supabase Storage (`storage.download()`)
- **Frontend usa**: Para parsear XML y extraer coordenadas → renderizar en MapView

---

## 👥 Participación - Join/Leave

### `request-join-excursion` (POST)
**Solicitar unirse (crea row en participación con status='pending')**
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN
- **Validaciones**:
  - Usuario no es organizador (no puede unirse a su propia excursión)
  - Status excursión = 'published'
  - Hay plazas disponibles
  - Usuario no está ya (pending o accepted)
- **BD**: INSERT `participacion` con `status='pending'`

### `cancel-join-request` (POST)
**Cancelar solicitud pendiente**
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN
- **BD**: DELETE de fila `participacion` con status='pending'

### `leave-excursion` (POST)
**Abandonar excursión (user aceptado)**
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN
- **Validaciones**:
  - Usuario está accepted
  - No está dentro de ventana de asistencia (1h antes a 2h después)
- **BD**: DELETE de fila `participacion` con status='accepted'

### `confirm-attendance` (POST)
**Confirmar asistencia (set attendance_confirmed_at)**
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN
- **Validaciones**:
  - Usuario accepted
  - Dentro de ventana de asistencia (1h antes a 2h después de fecha inicio)
- **BD**: UPDATE `participacion` SET `attendance_confirmed_at = NOW()`

---

## 📋 Solicitudes & Gestión Participantes (Solo Organizador)

### `get-pending-requests` (POST)
**Ver todas las solicitudes pendientes de la excursión**
- **Input**: `{ excursionId: number }`
- **Output**: `{ requests: PendingRequest[] }` donde PendingRequest = { usuarioId, fechaSolicitud, usuario: { id, nombreUsuario, correo } }
- **Token**: ACCESS_TOKEN
- **Validaciones**: Solo organizador puede ver
- **BD**: SELECT `participacion` con `status='pending'` + JOIN a `usuario`

### `respond-join-request` (POST)
**Aceptar o rechazar solicitud**
- **Input**: `{ excursionId: number, applicantId: string, action: 'accept' | 'reject' }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN
- **Validaciones**:
  - Solo organizador
  - Solicitud existe con status='pending'
  - Si accept: hay plazas disponibles
- **BD**:
  - Accept: UPDATE `participacion` SET `status='accepted'`, `fechaUnion = NOW()`
  - Reject: DELETE fila

### `get-excursion-participants` (POST)
**Listar todos los participantes aceptados**
- **Input**: `{ excursionId: number }`
- **Output**: `{ participants: Participant[] }` donde Participant = { usuarioId, nombreUsuario, fechaUnion, attendanceConfirmed, attendanceConfirmedAt }
- **Token**: ANON_KEY (público) o ACCESS_TOKEN
- **BD**: SELECT `participacion` WHERE `status='accepted'` + JOIN a `usuario`
- **Nota**: Accesible para todos (organizador y participantes)

---

## 🔄 Flujos de Datos Clave

### Flujo: Ver Excursión Propia
1. Frontend: `GET /get-excursion-detail` con token autenticado
2. Backend:
   - Obtiene detalle del RPC
   - Obtiene `creadoPor` de tabla
   - Extrae userId del token
   - **Calcula**: `isOrganizer = (userId === creadoPor)`
3. Frontend recibe: `isOrganizer: true`
4. **Renderiza**: `OrganizerActions` (Editar, Eliminar, Ver Solicitudes)
5. **NO renderiza**: `ParticipantActions` (Solicitar unirse, Confirmar asistencia, etc.)

### Flujo: Unirse a Excursión
1. Frontend: `POST /request-join-excursion` con userId y excursionId
2. Backend: INSERT `participacion` con status='pending'
3. Organizador: `GET /get-pending-requests` ve la solicitud
4. Organizador: `POST /respond-join-request` con 'accept'
5. Backend: UPDATE a status='accepted', fechaUnion=NOW()
6. Usuario: Puede ver botón "Confirmar Asistencia" en ventana temporal

### Flujo: Crear Excursión
1. Frontend: Upload GPX a Storage → obtiene gpxPath
2. Frontend: `POST /create-excursion-with-gpx` con base64 + datos
3. Backend:
   - Descarga GPX de Storage
   - Parsea XML → extrae trackpoints
   - Calcula distancia, elevación, etc.
   - INSERT `excursion`
   - Retorna routeInfo (startPoint, totalDistance, etc.)
4. Frontend: Muestra toast con datos procesados

---

## 📊 Tablas Principales

```sql
-- Usuarios
usuario {
  id: UUID (PK, de auth.users)
  nombreUsuario: string (unique)
  correo: string (de auth.users)
  created_at: timestamp
}

-- Excursiones
excursion {
  id: SERIAL (PK)
  titulo: string
  dificultad: enum ("Facil", "Medio", "Dificil")
  tipoExcursion: string
  fechaInicio: timestamp
  capacidad: number
  puntoEncuentro: string
  meetingLat: float
  meetingLng: float
  distancia_total: float
  elevacion_maxima: float
  elevacion_minima: float
  desnivel_positivo: float
  GPXPath: string (ruta en Storage)
  imagenURL: string (opcional)
  status: enum ("published", "finished", "cancelled")
  creadoPor: UUID (FK → usuario.id)
  created_at: timestamp
}

-- Participación
participacion {
  usuarioId: UUID (FK → usuario.id)
  excursionId: number (FK → excursion.id)
  status: enum ("pending", "accepted", "rejected")
  fechaSolicitud: timestamp
  fechaUnion: timestamp (cuando fue aceptado)
  attendance_confirmed_at: timestamp (cuando confirmó asistencia)
  PRIMARY KEY (usuarioId, excursionId)
}
```

---

## 🔑 Convenciones

- **Errores HTTP**:
  - 400: Bad request (input inválido)
  - 401: No autorizado (token inválido/ausente)
  - 403: Forbidden (usuario válido pero sin permisos)
  - 404: No encontrado
  - 409: Conflict (validación de negocio falla)
  - 500: Server error

- **CORS**: Headers aplicados en todas las funciones

- **Timestamp**: `NOW()` en Postgres, ISO8601 en JSON

- **UUIDs**: Autogenerados por Supabase Auth para usuarios

---

## 🚀 Estado Actual (2026-04-29)

✅ **Implementado y testeado**:
- Autenticación (login, registro, logout)
- CRUD excursiones básico
- Participación (join/leave)
- Solicitudes (pedir/responder)
- Detail con isOrganizer correcto

⚠️ **Recientes fixes**:
- Token sync en AuthContext mejorado (retry loop)
- Backend: Obtiene `creadoPor` directo de tabla (RPC no lo devolvía)
- Frontend: Logs para debuguear isOrganizer
- Excursiones creadas por usuario ahora muestran botones de editar/eliminar
- **UPDATE-excursion: Dual-client pattern implementado** (authClient para validar, supabase SERVICE_ROLE_KEY para actualizar)

---

## 🔐 Security Audit & Client Pattern Status

### **✅ Funciones Correctas (Pattern 1: SERVICE_ROLE_KEY simple)**
```
auth-check-email
auth-check-username
auth-login
auth-logout
get-filtered-excursions
get-excursion-detail
get-excursion-participants
download-gpx
create-excursion-with-gpx
parse-and-create-excursion
```
Estas no necesitan dual-client porque:
- Son públicas (sin validación de usuario específico)
- O la autorización ocurre vía Supabase Auth directamente
- No hacen UPDATE/DELETE que requieran verificación de propiedad

### **✅ Funciones Corregidas (Pattern 2: Dual-Client)**
```
update-excursion  ← CORREGIDA 29/04/2026
  - authClient valida usuario
  - supabase (SERVICE_ROLE_KEY) realiza UPDATE
  - Permite bypass seguro de RLS tras validación explícita
```

### **⚠️ REFACTOR QUEUE (Necesitan Dual-Client como update-excursion)**

**Priority 1 - HIGH RISK (DELETE/críticas):**
```
1. delete-excursion
   - Riesgo: Borrar cualquier excursión si auth check falla
   - Fix: Usar authClient para validar token → supabase para DELETE

2. finish-excursion
   - Riesgo: Cambiar status cualquier excursión
   - Fix: Usar authClient para validar token → supabase para UPDATE status

3. respond-join-request
   - Riesgo: Aceptar/rechazar cualquier solicitud
   - Fix: Usar authClient para validar token → supabase para UPDATE participacion
```

**Priority 2 - MEDIUM RISK (Filtrado deficiente):**
```
4. get-pending-requests
   - Riesgo: Ver solicitudes de otras excursiones
   - Fix: Usar authClient → supabase (añadir WHERE creadoPor = userId explícitamente)

5. get-my-excursions
   - Riesgo: Ver excursiones ajenas (si filtrado SQL falla)
   - Fix: Usar authClient → supabase con verificación userId en WHERE

6. request-join-excursion
   - Riesgo: Unirse como otro usuario si token validation falla
   - Fix: Usar authClient → supabase
```

**Priority 3 - MEDIUM RISK (Cambios de estado):**
```
7. cancel-join-request
   - Riesgo: Cancelar solicitud ajena
   - Fix: Usar authClient → supabase

8. leave-excursion
   - Riesgo: Dejar excursión como otro usuario
   - Fix: Usar authClient → supabase

9. confirm-attendance
   - Riesgo: Confirmar asistencia por otro
   - Fix: Usar authClient → supabase

10. auth-complete-registration
    - Riesgo: Completar registro para otro usuario
    - Fix: Usar authClient → supabase
```

### **Refactoring Template (Copia/Pega para arreglar)**
```typescript
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')

// Cliente PARA VALIDAR (respeta identidad real del usuario)
const authClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

// Cliente PARA OPERAR (bypassa RLS, pero usuario ya validado)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 1. Validar
const { data: { user }, error } = await authClient.auth.getUser(token)
if (error || !user) return 401

// 2. Verificar autorización (ej: es propietario)
const { data: record } = await supabase.from('table').select().eq('id', id).single()
if (record.owner !== user.id) return 403

// 3. Realizar operación (ya con permisos confirmados)
const { error: opError } = await supabase.from('table').update({...}).eq('id', id)
```

### **Justificación del Patrón Dual-Client**
| Aspecto | Single SERVICE_ROLE | Dual-Client |
|---|---|---|
| **RLS Override** | Automático (inseguro) | Explícito tras validar |
| **Token Validation** | Omitido si mal diseñado | Garantizado (authClient) |
| **Auditoría** | Difícil rastrear por qué se bypassa | Claro: se validó primero |
| **Mantenibilidad** | Fácil olvidar auth checks | Auth logic visible/testeable |
| **Risk** | Alto (funciones con múltiples checks) | Bajo (patrón uniforme) |

**Conclusión**: El patrón dual-client es el estándar de seguridad para operaciones sensibles en Edge Functions con RLS.

---

## 📝 Notas para Claude

- Si el usuario dice "no ve los botones de editar", revisar:
  1. isOrganizer está en false → verificar get-excursion-detail backend
  2. Token no llega → verificar getAuthToken retry en servicios
  3. RPC devuelve fila pero sin creadoPor → SELECT directo está implementado (línea ~65 en get-excursion-detail)

- Si hay error "Usuario no autenticado", probablemente:
  1. Token no se sincronizó en AuthContext.setSession
  2. getAuthToken() se llama antes de que sesión esté lista → uso retry loop
  3. Backend recibe Authorization header vacío

- Campos NO editables por diseño: `fechaInicio` y `GPXPath` (requiere eliminar y crear nueva)
