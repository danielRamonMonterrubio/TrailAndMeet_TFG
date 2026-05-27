# Backend TrailAndMeet - Edge Functions Supabase

**Nota**: Las Edge Functions NO se ejecutan localmente. Se despliegan en Supabase y se invocan desde el frontend vía HTTP `fetch`.

## Stack
- **Runtime**: Deno (TypeScript)
- **Invocación**: `${SUPABASE_URL}/functions/v1/<function-name>`
- **Auth**: Bearer token (JWT) o ANON_KEY
- **Base de datos**: PostgreSQL (Supabase)

---

## Patrones de Cliente (Crítico para RLS)

### **Contexto: Stateless Functions**
Edge Functions en Deno son **completamente stateless**. Cada request ejecuta una nueva instancia, sin persistencia de estado. Por esto, **cada función DEBE crear su cliente Supabase desde cero**.

### **Patrón 1: Operaciones Públicas / Server-Only** ✅
**Usa SERVICE_ROLE_KEY sin Authorization header**

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

**Funciones que lo usan:**
- `auth-check-email`, `auth-check-username`, `auth-login`, `auth-logout`
- `get-filtered-excursions`, `get-excursion-participants`, `download-gpx`
- `parse-and-create-excursion` (LEGACY)

**Cuándo usarlo:** No requiere validar identidad del usuario, o la operación es pública.

---

### **Patrón 2: Operaciones Autenticadas/Sensibles — DUAL-CLIENT** ✅
**Usa authClient (ANON_KEY + Authorization header) PARA VALIDAR + supabase (SERVICE_ROLE_KEY) PARA ACTUAR**

```typescript
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')

// Cliente PARA VALIDAR (verifica identidad real del usuario)
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
const { data: record } = await supabase.from('tabla').select().eq('id', id).single()
if (record.owner !== user.id) return 403

// 3. Realizar operación (ya con permisos confirmados)
const { error: opError } = await supabase.from('tabla').update({...}).eq('id', id)
```

**Funciones que usan dual-client (estado actual 2026-05-18):**
- `update-excursion`, `delete-excursion`, `finish-excursion`
- `request-join-excursion`, `cancel-join-request`, `leave-excursion`, `confirm-attendance`
- `get-pending-requests`, `respond-join-request`, `get-my-excursions`
- `send-message`, `get-chat-messages`, `mark-chat-read`, `get-my-chats`

**⚠️ Pendiente de dual-client:**
- `auth-complete-registration` — MEDIUM priority (actualmente usa SERVICE_ROLE_KEY)

---

### **Frontend: Cliente Único Reutilizable**
El frontend **crea el cliente UNA sola vez** y lo reutiliza:

```typescript
// src/services/supabaseClient.ts
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { storage: AsyncStorage })
```

---

## Estructura Lógica

```
AUTENTICACIÓN
├─ auth-check-email/
├─ auth-check-username/
├─ auth-complete-registration/      (⚠️ pendiente dual-client)
├─ auth-login/
└─ auth-logout/

EXCURSIONES (CRUD)
├─ create-excursion-with-gpx/       (crear + procesar GPX + insertar organizador en participacion)
├─ update-excursion/                (solo organizador, dual-client)
├─ delete-excursion/                (solo organizador, dual-client, borra GPX de Storage)
├─ get-filtered-excursions/         (listar públicas con filtros)
├─ get-my-excursions/               (mis excursiones creadas + unidas, dual-client)
├─ get-excursion-detail/            (detalle + calcula isOrganizer + counts)
├─ finish-excursion/                (marcar como finalizada, dual-client)
└─ download-gpx/                    (descargar GPX; el frontend usa URL pública directa en su lugar)

PARTICIPACIÓN
├─ request-join-excursion/          (dual-client)
├─ cancel-join-request/             (dual-client)
├─ join-excursion/                  (NO USADO por el frontend)
├─ leave-excursion/                 (dual-client)
└─ confirm-attendance/              (dual-client, ventana 1h antes a 2h después)

SOLICITUDES & PARTICIPANTES (Solo organizador)
├─ get-pending-requests/            (dual-client)
├─ respond-join-request/            (dual-client)
└─ get-excursion-participants/      (público)

CHAT
├─ send-message/                    (dual-client, valida participante accepted + excursión no finished)
├─ get-chat-messages/               (dual-client, cursor pagination por id ASC, 50 msgs/página)
├─ mark-chat-read/                  (dual-client, UPSERT en chat_lectura)
└─ get-my-chats/                    (dual-client, RPC obtener_mis_chats)

PARSING (Legado)
└─ parse-and-create-excursion/      (DEPRECATED - no usar)
```

---

## Autenticación

### `auth-check-email` (POST)
- **Input**: `{ email: string }`
- **Output**: `{ exists: boolean }`
- **BD**: Consulta `auth.users`

### `auth-check-username` (POST)
- **Input**: `{ username: string }`
- **Output**: `{ exists: boolean }`
- **BD**: Consulta tabla `usuario` (nombreUsuario)

### `auth-complete-registration` (POST)
- **Input**: `{ username, nombre, apellido, edad, telefono, fotoUrl? }`
- **Output**: `{ success: boolean }`
- **Token**: ACCESS_TOKEN (usuario autenticado)
- **BD**: Inserta en tabla `usuario`
- **⚠️ Usa solo SERVICE_ROLE_KEY — pendiente refactorizar a dual-client**

### `auth-login` (POST)
- **Input**: `{ email: string, password: string }`
- **Output**: `{ session: Session, user: User }`
- **BD**: `supabase.auth.signInWithPassword`

### `auth-logout` (POST)
- **Input**: `{ token: string }`
- **Output**: `{ success: boolean }`

---

## Excursiones - CRUD

### `create-excursion-with-gpx` (POST)
- **Input**: `{ gpxBase64, p_titulo, p_dificultad, p_fecha_inicio, p_capacidad, p_tipo_excursion, p_punto_encuentro, p_imagen_url, p_gpx_path, p_status }`
- **Output**: `{ success: boolean, routeInfo: { startPoint, totalDistance, maxElevation, ... } }`
- **Proceso**:
  1. Descarga GPX de Storage
  2. Parsea XML → extrae trackpoints
  3. Calcula distancia, elevación, etc.
  4. INSERT `excursion` via RPC `crear_excursion`
  5. **INSERT organizador en `participacion`** con `status='accepted'` (ocupa una plaza)
  6. Devuelve routeInfo

### `update-excursion` (POST) — dual-client
- **Input**: `{ excursionId, titulo?, capacidad?, dificultad?, tipoExcursion?, puntoEncuentro?, meetingLat?, meetingLng?, imagenURL? }`
- **Output**: `{ success: true, updated: string[] }`
- **Validaciones**: Solo organizador, status='published', capacidad no puede bajar de participantes aceptados
- **Campos NO editables**: `fechaInicio`, `GPXPath`

### `delete-excursion` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **Proceso**: DELETE excursion (CASCADE limpia participacion) + borra GPX de Storage
- **Nota**: GPX puede ser path relativo o URL pública; la función extrae el path si es URL completa

### `get-filtered-excursions` (POST)
- **Input**: `{ dificultad?, tipoExcursion?, offset?, limit? }`
- **Output**: `{ excursions: Excursion[], total: number }`

### `get-my-excursions` (GET con query param) — dual-client
- **Query params**: `?tipo=todas|organizadas|unidas`
- **Output**: `Excursion[]`

### `get-excursion-detail` (POST)
- **Input**: `{ excursionId: number }`
- **Output**: Objeto `ExcursionDetail`
- **Campos clave devueltos**:
  - `creadoPor`: UUID del organizador (→ `organizerId` en frontend)
  - `isOrganizer`: boolean (calculado: `userId === creadoPor`)
  - `acceptedCount`, `pendingCount`
  - `myParticipationStatus`: 'pending' | 'accepted' | null
  - `attendanceConfirmed`: boolean
  - `availableSpots`: plazas libres
  - `status`: 'published' | 'finished' | 'cancelled'

### `finish-excursion` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **Validaciones**: Solo organizador, status='published'
- **BD**: UPDATE `excursion` SET `status='finished'`

### `download-gpx` (POST)
- **Input**: `{ gpxPath: string }`
- **Output**: Texto XML crudo
- **Nota**: El frontend lo evita y usa URL pública directa vía `supabase.storage.from('gpx-files').getPublicUrl(path)`

---

## Participación - Join/Leave

### `request-join-excursion` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **Validaciones**: No es organizador, status='published', plazas disponibles, no está ya (pending/accepted)
- **BD**: INSERT `participacion` con `status='pending'`

### `cancel-join-request` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **BD**: DELETE fila `participacion` con status='pending'

### `leave-excursion` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **BD**: DELETE fila `participacion` con status='accepted'

### `confirm-attendance` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **Validaciones**: Usuario accepted, dentro de ventana (1h antes a 2h después de fechaInicio)
- **BD**: UPDATE `participacion` SET `attendance_confirmed_at = NOW()`

---

## Solicitudes & Gestión Participantes (Solo Organizador)

### `get-pending-requests` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **Output**: `{ requests: [{ usuarioId, fechaSolicitud, usuario: { id, nombreUsuario, correo } }] }`

### `respond-join-request` (POST) — dual-client
- **Input**: `{ excursionId: number, applicantId: string, action: 'accept' | 'reject' }`
- **Accept**: UPDATE `participacion` SET `status='accepted'`, `fechaUnion = NOW()`
- **Reject**: DELETE fila

### `get-excursion-participants` (POST)
- **Input**: `{ excursionId: number }`
- **Output**: `{ participants: [{ usuarioId, nombreUsuario, fechaUnion, attendanceConfirmed, attendanceConfirmedAt }] }`

---

## Chat

### `send-message` (POST) — dual-client
- **Input**: `{ excursionId: number, contenido: string }`
- **Output**: `{ success: true, mensaje: ChatMessage }`
- **Validaciones**:
  - Usuario es participante accepted (incluye organizador, que también está en participacion)
  - Excursión no está finalizada (status !== 'finished')
- **BD**: INSERT `mensaje` { excursionId, usuarioId, contenido }

### `get-chat-messages` (POST) — dual-client
- **Input**: `{ excursionId: number, cursor?: number, limit?: number }` (limit default 50)
- **Output**: `{ messages: ChatMessage[], hasMore: boolean }`
- **Paginación**: cursor-based por `id` (devuelve mensajes con `id < cursor`), orden ASC
- **Validaciones**: Usuario es participante accepted

### `mark-chat-read` (POST) — dual-client
- **Input**: `{ excursionId: number }`
- **Output**: `{ success: boolean }`
- **BD**: UPSERT en `chat_lectura` { usuarioId, excursionId, lastReadAt: NOW() }
- **Cuándo**: Al abrir el chat y al recibir un nuevo mensaje por Realtime

### `get-my-chats` (POST) — dual-client
- **Input**: `{}` (vacío)
- **Output**: `{ chats: ChatPreview[] }`
- **BD**: RPC `obtener_mis_chats(p_usuario_id)` con LATERAL joins para preview eficiente
- **ChatPreview**: `{ excursionId, titulo, excursionStatus, lastMsgContenido, lastMsgAt, lastMsgUsername, lastMsgIsOwn, unreadCount }`
- **Nota**: unreadCount = COUNT(mensaje WHERE createdAt > lastReadAt AND usuarioId != yo)

---

## Tablas Principales

```sql
usuario {
  id: UUID (PK, de auth.users)
  nombreUsuario: string (unique)
  correo: string
  created_at: timestamp
}

excursion {
  id: SERIAL (PK)
  titulo: string
  dificultad: "Facil" | "Medio" | "Dificil"
  tipoExcursion: string
  fechaInicio: timestamp
  capacidad: number
  puntoEncuentro: string
  meetingLat: float
  meetingLng: float
  distancia_total: float | null
  elevacion_maxima: float | null
  elevacion_minima: float | null
  desnivel_positivo: float | null
  GPXPath: string (ruta en Storage)
  imagenURL: string | null
  status: "published" | "finished" | "cancelled"
  creadoPor: UUID (FK → usuario.id)
  created_at: timestamp
}

participacion {
  usuarioId: UUID (FK → usuario.id)
  excursionId: number (FK → excursion.id ON DELETE CASCADE)
  status: "pending" | "accepted" | "rejected"
  fechaSolicitud: timestamp
  fechaUnion: timestamp (cuando fue aceptado)
  attendance_confirmed_at: timestamp | null
  PRIMARY KEY (usuarioId, excursionId)
}

mensaje {
  id: SERIAL (PK)
  excursionId: number (FK → excursion.id ON DELETE CASCADE)
  usuarioId: UUID (FK → usuario.id)
  contenido: string
  createdAt: timestamp
}

chat_lectura {
  usuarioId: UUID (FK → usuario.id)
  excursionId: number (FK → excursion.id)
  lastReadAt: timestamp
  PRIMARY KEY (usuarioId, excursionId)
}
```

**SQL para activar CASCADE en participacion (si no se ha hecho):**
```sql
ALTER TABLE "participacion"
DROP CONSTRAINT "participacion_excursionId_fkey",
ADD CONSTRAINT "participacion_excursionId_fkey"
  FOREIGN KEY ("excursionId") REFERENCES "excursion"("id") ON DELETE CASCADE;
```

---

## Convenciones

- **Errores HTTP**: 400 (bad request), 401 (no autenticado), 403 (sin permisos), 404 (no encontrado), 409 (conflicto de negocio), 500 (server error)
- **CORS**: Headers aplicados en todas las funciones, OPTIONS request siempre devuelve 200
- **Timestamp**: `NOW()` en Postgres, ISO8601 en JSON
- **UUIDs**: Autogenerados por Supabase Auth

---

## Gotchas

**Realtime y columnas camelCase**:
- Los filtros server-side de Supabase Realtime no funcionan bien con columnas camelCase (ej: `excursionId`)
- `send-message` usa `subscribeToChatMessages` que filtra client-side: suscripción a toda la tabla `mensaje` + `if (msg.excursionId === numericId)` en el callback

**GPX en delete-excursion**:
- El campo `GPXPath` en BD puede ser path relativo (`userId/file.gpx`) o URL pública completa
- La función extrae el path de la URL si detecta que es una URL completa (contiene el bucket name)

**Organizador en participacion**:
- Al crear excursión, `create-excursion-with-gpx` inserta al organizador en `participacion` con `status='accepted'`
- El organizador cuenta como participante y ocupa una plaza
- Por eso `send-message` y `get-chat-messages` validan `status='accepted'` (no hay caso especial para organizador)

**Notas de diagnóstico**:
- Si `isOrganizer` llega en false: revisar `get-excursion-detail` → `creadoPor` y `userId` del token
- Si "Usuario no autenticado": token no sincronizado en AuthContext, o `getAuthToken()` se llamó antes de que la sesión estuviera lista → el retry loop de 3 intentos lo maneja, pero si falla los 3 usa ANON_KEY
- Campos NO editables por diseño: `fechaInicio` y `GPXPath` (hay que eliminar y crear nueva excursión)
