# Backend TrailAndMeet - Edge Functions Supabase

**Nota**: Las Edge Functions NO se ejecutan localmente. Se despliegan desde el **dashboard de Supabase** copiando y pegando el código en cada función. No se usa CLI ni entorno local.

## Dónde escribir las Edge Functions

**IMPORTANTE**: Antes de crear una nueva Edge Function, **lee una existente** en `backend/supabase/functions/<nombre>/index.ts` para entender la estructura exacta (helper `json()`, patrón dual-client, CORS headers). Crea cada función nueva en su propia carpeta: `backend/supabase/functions/<nombre>/index.ts`.

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

**Cuándo usarlo:** No requiere validar identidad del usuario, o la operación es pública.

---

### **Patrón 2: Operaciones Autenticadas/Sensibles — DUAL-CLIENT** ✅
**Usa authClient (ANON_KEY + Authorization header) PARA VALIDAR + supabase (SERVICE_ROLE_KEY) PARA ACTUAR**

```typescript
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')

const authClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data: { user }, error } = await authClient.auth.getUser(token)
if (error || !user) return 401
```

---

### **Patrón 3: Notificaciones fire-and-forget** ✅
Las funciones que necesitan notificar llaman a `send-push-notification` sin await:

```typescript
function notify(userIds: string[], titulo: string, cuerpo: string, tipo: string, data?: Record<string, string>) {
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ userIds, titulo, cuerpo, tipo, data }),
  }).catch(err => console.error('Error notificando:', err))
}
```

Este helper está copiado en cada función que lo necesita (no se puede importar entre funciones en el dashboard).

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
├─ create-excursion-with-gpx/
├─ update-excursion/                (dual-client)
├─ delete-excursion/                (dual-client, borra GPX, notifica participantes)
├─ get-filtered-excursions/
├─ get-my-excursions/               (dual-client)
├─ get-excursion-detail/
├─ finish-excursion/                (dual-client, notifica participantes)
└─ download-gpx/

PARTICIPACIÓN
├─ request-join-excursion/          (dual-client, notifica organizador)
├─ cancel-join-request/             (dual-client)
├─ leave-excursion/                 (dual-client, notifica organizador)
└─ confirm-attendance/              (dual-client, ventana 1h antes a 2h después, notifica organizador)

SOLICITUDES & PARTICIPANTES
├─ get-pending-requests/            (dual-client)
├─ respond-join-request/            (dual-client, notifica solicitante)
└─ get-excursion-participants/

CHAT
├─ send-message/                    (dual-client, notifica resto de participantes)
├─ get-chat-messages/               (dual-client, cursor pagination ASC, 50/página)
├─ mark-chat-read/                  (dual-client, UPSERT en chat_lectura)
└─ get-my-chats/                    (dual-client, RPC obtener_mis_chats)

FOROS
├─ create-forum/                    (dual-client, bcryptjs hash contraseña)
├─ get-forums/                      (público, signed URLs)
├─ get-forum-detail/                (público, signed URL)
├─ join-forum/                      (dual-client, bcryptjs compare para privados)
├─ leave-forum/                     (dual-client, bloquea moderador)
├─ get-my-forums/                   (dual-client, signed URLs)
├─ kick-forum-member/               (dual-client, solo moderador, notifica expulsado)
├─ create-post/                     (dual-client)
├─ get-posts/                       (cursor DESC, signed URLs)
├─ delete-post/                     (dual-client, owner OR moderador)
├─ create-comment/                  (dual-client, notifica autor del post)
├─ get-post-detail/                 (público)
├─ delete-comment/                  (dual-client, owner OR moderador)
└─ get-forum-members/               (dual-client)

NOTIFICACIONES PUSH
├─ register-push-token/             (dual-client, UPSERT en push_token)
├─ send-push-notification/          (SERVICE_ROLE_KEY, llamado internamente)
│                                    Input: { userIds, titulo, cuerpo, tipo, data? }
│                                    Inserta en notificacion + envía FCM v1
├─ get-notifications/               (dual-client, últimas 50, devuelve unreadCount)
└─ mark-notifications-read/         (dual-client, id? → una sola; sin id → todas)

AMIGOS
├─ send-friend-request/             (dual-client, notifica receptor con friend_request_received)
│                                    Lógica: rejected propio → UPDATE a pending; otro pending → 409; accepted → 409
├─ respond-friend-request/          (dual-client, solo receptor puede responder)
│                                    accion: 'accepted' | 'rejected'. Si accepted → notifica solicitante con friend_request_accepted
├─ get-friends/                     (dual-client, estado='accepted', ambas direcciones)
│                                    Dos queries: amistad + usuario (no hay FK directa entre amistad y usuario)
├─ get-friend-requests/             (dual-client, receptor_id=me AND estado='pending')
├─ remove-friend/                   (dual-client, DELETE en ambas direcciones con .or())
└─ get-friendship-status/           (dual-client, devuelve none/pending_sent/pending_received/accepted + amistadId)

VALORACIONES
├─ rate-participant/                 (dual-client, 1-5 estrellas en 4 categorías)
│                                    Valida: excursión 'finished', evaluador confirmó asistencia (o es organizador),
│                                    evaluado confirmó asistencia (o es organizador), no duplicado.
│                                    Constraint UNIQUE (excursion_id, evaluador_id, evaluado_id) devuelve 409.
└─ get-excursion-ratings/            (dual-client, lista participantes valorables)
                                     Devuelve participantes con attendance_confirmed (+ organizador siempre),
                                     excluyendo al usuario actual, con flag yaValorado.

PARSING (Legado)
└─ parse-and-create-excursion/      (DEPRECATED - no usar)
```

---

## Notificaciones — tipos disponibles

| tipo | Cuándo se envía | Quién recibe |
|------|-----------------|--------------|
| `join_request` | alguien solicita unirse | organizador |
| `request_accepted` | organizador acepta solicitud | solicitante |
| `request_rejected` | organizador rechaza solicitud | solicitante |
| `left_excursion` | participante abandona | organizador |
| `attendance_confirmed` | participante confirma asistencia | organizador |
| `excursion_deleted` | organizador elimina excursión | todos los participantes accepted |
| `excursion_finished` | organizador finaliza excursión | todos los participantes accepted |
| `new_message` | mensaje en chat | todos los participantes excepto emisor |
| `new_comment` | comentario en post | autor del post |
| `kicked_from_forum` | moderador expulsa miembro | miembro expulsado |
| `friend_request_received` | alguien envía solicitud de amistad | receptor |
| `friend_request_accepted` | receptor acepta solicitud de amistad | solicitante original |

---

## FCM API v1 — Implementación

`send-push-notification` usa la API v1 de Firebase Cloud Messaging (la API heredada está deshabilitada).

Flujo:
1. Crea un JWT firmado con RS256 usando el service account
2. Intercambia el JWT por un OAuth2 access token en `https://oauth2.googleapis.com/token`
3. Llama a `https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send`

Variables de entorno requeridas (Supabase Secrets):
- `FCM_CLIENT_EMAIL`: email de la cuenta de servicio
- `FCM_PRIVATE_KEY`: clave privada con `\n` literales (la función los convierte con `.replace(/\\n/g, '\n')`)
- `FCM_PROJECT_ID`: ID del proyecto Firebase

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
  titulo, dificultad, tipoExcursion, fechaInicio, capacidad
  puntoEncuentro, meetingLat, meetingLng
  distancia_total, elevacion_maxima, elevacion_minima, desnivel_positivo
  GPXPath: string (ruta en Storage)
  imagenURL: string | null
  status: "published" | "finished" | "cancelled"
  creadoPor: UUID (FK → usuario.id)
}

participacion {
  usuarioId: UUID (FK → usuario.id)
  excursionId: number (FK → excursion.id ON DELETE CASCADE)
  status: "pending" | "accepted" | "rejected"
  fechaSolicitud, fechaUnion, attendance_confirmed_at
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

foro {
  id: SERIAL (PK)
  codigo: VARCHAR(6) UNIQUE (auto: generar_codigo_foro())
  titulo, descripcion
  tipo: "publico" | "privado"
  password_hash: TEXT | null
  portada_url: TEXT | null  (path en Storage, no URL completa)
  categorias: TEXT[]  (GIN index)
  creadoPor: UUID (FK → usuario.id)
}

foro_miembro {
  foroId: number (FK → foro.id ON DELETE CASCADE)
  usuarioId: UUID (FK → usuario.id ON DELETE CASCADE)
  fechaUnion: TIMESTAMPTZ
  PRIMARY KEY (foroId, usuarioId)
}

publicacion {
  id: SERIAL (PK)
  foroId: number (FK → foro.id ON DELETE CASCADE)
  usuarioId: UUID (FK → usuario.id ON DELETE CASCADE)
  titulo, contenido
  imagen_url: TEXT | null  (path en Storage)
  createdAt: TIMESTAMPTZ
}

comentario {
  id: SERIAL (PK)
  publicacionId: number (FK → publicacion.id ON DELETE CASCADE)
  usuarioId: UUID (FK → usuario.id ON DELETE CASCADE)
  contenido: TEXT
  createdAt: TIMESTAMPTZ
}

push_token {
  id: uuid (PK)
  userId: uuid (FK → auth.users ON DELETE CASCADE)
  token: text
  updatedAt: timestamptz
  UNIQUE (userId, token)
}

notificacion {
  id: uuid (PK)
  userId: uuid (FK → auth.users ON DELETE CASCADE)
  titulo: text
  cuerpo: text
  tipo: text
  data: jsonb
  leida: boolean DEFAULT false
  createdAt: timestamptz
  INDEX (userId, createdAt DESC)
}

valoracion {
  id: UUID (PK, gen_random_uuid())
  excursion_id: INTEGER (FK → excursion.id ON DELETE CASCADE)
  evaluador_id: UUID (FK → auth.users ON DELETE CASCADE)
  evaluado_id: UUID (FK → auth.users ON DELETE CASCADE)
  puntualidad: SMALLINT (1-5)
  seguridad: SMALLINT (1-5)
  trato: SMALLINT (1-5)
  preparacion: SMALLINT (1-5)
  created_at: TIMESTAMPTZ DEFAULT NOW()
  UNIQUE (excursion_id, evaluador_id, evaluado_id)
  CHECK (evaluador_id != evaluado_id)
  INDEX idx_valoracion_evaluado (evaluado_id)
  INDEX idx_valoracion_excursion_evaluador (excursion_id, evaluador_id)
  RLS habilitado (bypassado por SERVICE_ROLE_KEY)
  NOTA: valoraciones son anónimas — el evaluado no sabe quién le valoró ni cuánto.
        get-user-profile devuelve solo medias agregadas + total.
}

amistad {
  id: uuid (PK, gen_random_uuid())
  solicitante_id: uuid (FK → auth.users ON DELETE CASCADE)
  receptor_id: uuid (FK → auth.users ON DELETE CASCADE)
  estado: text CHECK ('pending' | 'accepted' | 'rejected') DEFAULT 'pending'
  created_at: timestamptz DEFAULT NOW()
  updated_at: timestamptz DEFAULT NOW()
  UNIQUE (solicitante_id, receptor_id)
  CHECK (solicitante_id != receptor_id)
  INDEX idx_amistad_solicitante (solicitante_id)
  INDEX idx_amistad_receptor (receptor_id)
  INDEX idx_amistad_estado (estado)
  RLS habilitado (bypasado por SERVICE_ROLE_KEY en Edge Functions)
  NOTA: referencia auth.users, NO tabla usuario → joins de perfil requieren segunda query
}
```

---

## Convenciones

- **Errores HTTP**: 400 (bad request), 401 (no autenticado), 403 (sin permisos), 404 (no encontrado), 409 (conflicto de negocio), 500 (server error)
- **CORS**: Headers aplicados en todas las funciones, OPTIONS request siempre devuelve 200
- **Timestamp**: `NOW()` en Postgres, ISO8601 en JSON

---

## Gotchas

**Linter Deno en VS Code**:
- `Cannot find name 'Deno'` es un falso positivo. El linter TS no tiene tipos Deno. No afecta a Supabase.

**GPX en delete-excursion**:
- `GPXPath` puede ser path relativo o URL pública. La función extrae el path si es URL completa.

**Organizador en participacion**:
- `create-excursion-with-gpx` inserta al organizador en `participacion` con `status='accepted'`.
- Por eso `send-message` valida `status='accepted'` sin caso especial para el organizador.

**Foros — moderador = creador**:
- `foro.creadoPor` determina quién es moderador. No hay tabla separada de roles.
- `leave-forum` bloquea si `user.id === foro.creadoPor`.

**Foros — imágenes privadas**:
- `portada_url` e `imagen_url` almacenan el path relativo, NO la URL completa.
- La Edge Function genera signed URLs con `createSignedUrl(path, 3600)`.

**Notificaciones — helper copiado**:
- La función `notify()` está copiada en cada Edge Function que la necesita.
- No es posible importar módulos compartidos desde el dashboard de Supabase.
- Si se modifica la lógica de notificación, hay que actualizarla en cada función.

**Valoraciones — organizador como participante**:
- El organizador (excursion.creadoPor) puede valorar y ser valorado aunque no tenga `attendance_confirmed_at` (no existe UI de confirmación para el organizador).
- El resto de participantes necesitan `attendance_confirmed_at IS NOT NULL` tanto para valorar como para ser valorados.
- `get-user-profile` agrega las valoraciones recibidas y las devuelve como `{ total, mediaGlobal, puntualidad, seguridad, trato, preparacion }` o `null` si no hay ninguna.

**mark-notifications-read — comportamiento**:
- Sin `id`: marca todas las no leídas del usuario como leídas.
- Con `id`: marca solo esa notificación como leída.
- El frontend solo llama con `id` (al pulsar una notificación) o sin él (marcar todas).
