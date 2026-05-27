# TrailAndMeet

App móvil React Native (Android/iOS) para organizar y unirse a excursiones de montaña. TFG.

## Stack

- **Frontend**: React Native 0.83 + TypeScript, React Navigation v7 (native-stack + bottom-tabs), `react-native-maps` (Google Maps), `react-native-linear-gradient`, `@react-native-vector-icons/material-design-icons`, `fast-xml-parser` (parsing GPX), `react-native-config` (env vars), `@react-native-async-storage/async-storage`.
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions Deno). Toda la lógica vive en Edge Functions; el frontend llama vía `fetch` a `${SUPABASE_URL}/functions/v1/<func>`.
- **Plataforma de desarrollo**: Windows. Shell por defecto bash (sintaxis Unix). PowerShell también disponible.

## Estructura

```
App.tsx                    -> AuthProvider + ChatUnreadProvider + AppNavigator
src/
  navigation/
    AppNavigation.tsx      -> AuthStack vs AppStack según session. AppStack usa TabNavigator (Explorar + Mis Excursiones + Chats).
                             RootStackParamList define todos los screens. TabPress listeners en Tab.Screen resetean stacks internos.
                             ExcursionParticipants recibe { excursionId, excursionTitle, organizerId }.
                             Chat recibe { excursionId, excursionTitle, excursionStatus }.
                             Tab "Chats" muestra badge con totalUnread de ChatUnreadContext.
  screens/
    WelcomeScreen, LoginScreen, RegisterStep1Screen, RegisterStep2Screen
    ExcursionListScreen    -> Listar con filtros. useFocusEffect recarga al recibir foco.
    MyExcursionsScreen     -> Filtros: todas/organizadas/unidas. useFocusEffect.
    CreateExcursionScreen  -> Crea excursión + sube GPX. Redirige a ExcursionList tras éxito.
    ExcursionDetailScreen  -> Detalle + mapa. OrganizerActions vs ParticipantActions según isOrganizer.
                             Botón "Chat del grupo" visible para isOrganizer y myParticipationStatus==='accepted'.
    EditExcursionScreen    -> Editar campos de excursión (solo organizador, solo antes de la fecha).
    PendingRequestsScreen  -> Lista solicitudes pendientes; organizador acepta/rechaza.
    ExcursionParticipantsScreen -> Lista participantes aceptados; badge Dueño/Confirmado/Aceptado.
    ChatScreen             -> Chat de grupo de una excursión. FlatList con burbujas estilo WhatsApp.
                             Paginación cursor (50 msgs, "Cargar mensajes anteriores" en cabecera).
                             Realtime via supabase.channel filtrando client-side (columnas camelCase no
                             funcionan en Realtime filters server-side → filtro en el callback).
                             Params: { excursionId, excursionTitle, excursionStatus }.
                             isFinished → input deshabilitado, banner "Solo lectura".
                             usernameCache pobla nombres desde mensajes cargados; Realtime usa caché.
                             Mensajes pendientes: bubble con opacity 0.75 + spinner hasta confirmación HTTP.
                             Deduplicación: si Realtime llega antes que la respuesta HTTP, no duplica.
                             Separador de fecha entre días (Hoy / Ayer / fecha larga).
    MyChatsScreen          -> Lista de chats activos del usuario (todas sus excursiones aceptadas).
                             Preview: último mensaje, tiempo relativo, badge de no leídos estilo WhatsApp.
                             useFocusEffect recarga y actualiza totalUnread en ChatUnreadContext.
  components/
    buttons/               -> AuthButton, PrimaryButton
    cards/                 -> ExcursionCard, FeatureItem
    form/                  -> FormCard, FormInput, FormSelect, FilePickerInput, DatePickerInput, TimePickerInput, SlotsInput
    headers/               -> BrandHeader (con logout button opcional)
  context/
    AuthContext.tsx        -> Sesión persistida en AsyncStorage + sincronizada con supabase.auth
    ChatUnreadContext.tsx  -> totalUnread (suma de no leídos de todos los chats). MyChatsScreen lo actualiza; AppStack lo lee para el badge del tab.
  services/
    supabaseClient.ts      -> createClient con AsyncStorage como storage
    authService.ts         -> checkEmail/Username, login, logout, completeRegistration (todos vía Edge Functions)
    excursionService.ts    -> getFilteredExcursions (filtrar por dificultad/tipo)
    excursionDetailService.ts -> getExcursionDetail + downloadGpxFile (URL pública directa desde Storage, no Edge Function).
                             ExcursionDetail incluye: organizerId, pendingCount, acceptedCount, isOrganizer, myParticipationStatus, attendanceConfirmed, status.
    excursionInteractionService.ts -> requestJoinExcursion, cancelJoinRequest, leaveExcursion, confirmAttendance (todas vía Edge Functions)
    excursionManagementService.ts -> updateExcursion, deleteExcursion, finishExcursion
    excursionRequestService.ts -> getPendingRequests, respondJoinRequest, getExcursionParticipants
    excursionCreationService.ts -> createExcursionWithGPX (llama Edge Function)
    excursionStorageService.ts -> uploadGPXFile (retorna path relativo), deleteGpxFile
    gpxParserService.ts    -> parseGPXContent (local parsing)
    chatService.ts         -> sendMessage, getChatMessages (cursor pagination), markChatRead, getMyChats, subscribeToChatMessages (Realtime).
                             Interfaces: ChatMessage { id, excursionId, usuarioId, contenido, createdAt, usuario? }, ChatPreview { excursionId, titulo, excursionStatus, lastMsg*, unreadCount }.
                             Todos los métodos usan getAuthToken() con reintento (3 intentos, backoff 100ms).
    mappers/excursionMapper.ts
  models/Excursion.ts      -> Tipos ExcursionDifficulty, ExcursionType, interfaz Excursion
  types/
    AppFile.ts             -> Tipo para archivos seleccionados (name, base64, ...)
    database.types.ts      -> Tipos generados de Supabase (encoding UTF-16 LE con BOM)
  theme/
    colors.ts              -> Paleta centralizada (primaryGradientStart: #059669, primaryGradientEnd: #0D9488,
                             textPrimary/Secondary/Muted, backgroundSoft: #EAF6F4, easyBg/Text, mediumBg/Text, hardBg/Text,
                             headerSubtitle: #D1FAE5, errorRed, successGreen, infoBg, grayLight, borderColor, white)
    styles.ts              -> `shared` StyleSheet con container, content, header, headerTitle, headerSubtitle, screenTitle, sectionTitle, card, label, input, passwordRow, errorText, primaryButton, primaryButtonText, iconCircle, row
backend/
  supabase/functions/      -> auth-check-email, auth-check-username, auth-complete-registration, auth-login, auth-logout,
                             create-excursion-with-gpx, update-excursion, delete-excursion, finish-excursion,
                             get-filtered-excursions, get-my-excursions, get-excursion-detail, download-gpx,
                             request-join-excursion, cancel-join-request, leave-excursion, confirm-attendance,
                             get-pending-requests, respond-join-request, get-excursion-participants,
                             send-message, get-chat-messages, mark-chat-read, get-my-chats,
                             parse-and-create-excursion (LEGACY)
android/
  app/
    debug.keystore         -> Keystore local del proyecto (NO ~/.android/debug.keystore)
    src/main/AndroidManifest.xml
.env                       -> SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_MAPS_API_KEY (no commiteado)
database.types.ts          -> Tipos de todas las tablas de supabase (ENCODING UTF-16 LE)
```

## Rutas Frontend (Screens)

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| **WelcomeScreen** | `src/screens/WelcomeScreen.tsx` | Pantalla inicial con opciones de login/registro. |
| **LoginScreen** | `src/screens/LoginScreen.tsx` | Formulario de login (email + contraseña). |
| **RegisterStep1Screen** | `src/screens/RegisterStep1Screen.tsx` | Registro paso 1: email, username, contraseña. |
| **RegisterStep2Screen** | `src/screens/RegisterStep2Screen.tsx` | Registro paso 2: nombre, apellido, edad, teléfono, foto. |
| **ExcursionListScreen** | `src/screens/ExcursionListScreen.tsx` | Listar excursiones públicas con filtros (dificultad, tipo). Recarga al recibir foco. |
| **MyExcursionsScreen** | `src/screens/MyExcursionsScreen.tsx` | Excursiones del usuario con filtros: todas / organizadas / en las que participa. Recarga al recibir foco. |
| **CreateExcursionScreen** | `src/screens/CreateExcursionScreen.tsx` | Crear nueva excursión: nombre, descripción, fecha, hora, GPX, plazas, dificultad, tipo. |
| **ExcursionDetailScreen** | `src/screens/ExcursionDetailScreen.tsx` | Detalle completo: mapa, info, acciones según rol (organizador vs participante). |
| **EditExcursionScreen** | `src/screens/EditExcursionScreen.tsx` | Editar excursión (solo organizador, antes de la fecha de inicio). |
| **PendingRequestsScreen** | `src/screens/PendingRequestsScreen.tsx` | Ver solicitudes pendientes; organizador acepta/rechaza. |
| **ExcursionParticipantsScreen** | `src/screens/ExcursionParticipantsScreen.tsx` | Listar participantes confirmados con badges (Dueño/Confirmado/Aceptado). |
| **ChatScreen** | `src/screens/ChatScreen.tsx` | Chat de grupo por excursión. Burbujas WhatsApp, separadores de fecha, paginación cursor, Realtime, mensajes pendientes. Params: `{ excursionId, excursionTitle, excursionStatus }`. |
| **MyChatsScreen** | `src/screens/MyChatsScreen.tsx` | Lista de todos los chats activos del usuario con preview y badge de no leídos. |

## Rutas Backend (Edge Functions)

### Autenticación
| Función | Ruta | Descripción |
|---------|------|-------------|
| **auth-check-email** | `backend/supabase/functions/auth-check-email/` | Valida si el email está disponible. |
| **auth-check-username** | `backend/supabase/functions/auth-check-username/` | Valida si el username está disponible. |
| **auth-login** | `backend/supabase/functions/auth-login/` | Login con email + contraseña; devuelve session y user. |
| **auth-complete-registration** | `backend/supabase/functions/auth-complete-registration/` | Completa registro: nombre, apellido, edad, teléfono, foto. (Solo SERVICE_ROLE_KEY — pendiente dual-client). |
| **auth-logout** | `backend/supabase/functions/auth-logout/` | Cierra sesión e invalida el token. |

### Gestión de Excursiones
| Función | Ruta | Descripción |
|---------|------|-------------|
| **create-excursion-with-gpx** | `backend/supabase/functions/create-excursion-with-gpx/` | Crea excursión, parsea GPX en backend, inserta al organizador como participante accepted. |
| **update-excursion** | `backend/supabase/functions/update-excursion/` | Edita campos de excursión (solo organizador). Dual-client. |
| **delete-excursion** | `backend/supabase/functions/delete-excursion/` | Elimina excursión y cascada. Borra GPX de Storage. Dual-client. |
| **finish-excursion** | `backend/supabase/functions/finish-excursion/` | Marca excursión como finalizada. Dual-client. |
| **get-filtered-excursions** | `backend/supabase/functions/get-filtered-excursions/` | Listar excursiones con filtros por dificultad/tipo. |
| **get-my-excursions** | `backend/supabase/functions/get-my-excursions/` | Listar excursiones del usuario (organizadas + participación). Dual-client. |
| **get-excursion-detail** | `backend/supabase/functions/get-excursion-detail/` | Detalle completo: info de ruta, estado de participación, counts. |
| **download-gpx** | `backend/supabase/functions/download-gpx/` | Descargar GPX de Storage. (El frontend usa URL pública directa en su lugar.) |

### Solicitudes y Participación
| Función | Ruta | Descripción |
|---------|------|-------------|
| **request-join-excursion** | `backend/supabase/functions/request-join-excursion/` | Solicitar unirse; crea participación con status='pending'. Dual-client. |
| **cancel-join-request** | `backend/supabase/functions/cancel-join-request/` | Cancelar solicitud pendiente. Dual-client. |
| **leave-excursion** | `backend/supabase/functions/leave-excursion/` | Abandonar excursión. Dual-client. |
| **confirm-attendance** | `backend/supabase/functions/confirm-attendance/` | Confirmar asistencia (ventana: 1h antes a 2h después de fechaInicio). Dual-client. |
| **get-pending-requests** | `backend/supabase/functions/get-pending-requests/` | Solicitudes pendientes (solo organizador). Dual-client. |
| **respond-join-request** | `backend/supabase/functions/respond-join-request/` | Organizador acepta/rechaza solicitud. Dual-client. |
| **get-excursion-participants** | `backend/supabase/functions/get-excursion-participants/` | Listar participantes aceptados de una excursión. |

### Chat
| Función | Ruta | Descripción |
|---------|------|-------------|
| **send-message** | `backend/supabase/functions/send-message/` | Enviar mensaje. Valida participante accepted + excursión no finished. Dual-client. |
| **get-chat-messages** | `backend/supabase/functions/get-chat-messages/` | Mensajes paginados (cursor por id, 50 por página, orden ASC). Input: `{ excursionId, cursor?, limit? }`. Dual-client. |
| **mark-chat-read** | `backend/supabase/functions/mark-chat-read/` | UPSERT en `chat_lectura` con `lastReadAt = NOW()`. Al abrir chat y al recibir mensaje nuevo. Dual-client. |
| **get-my-chats** | `backend/supabase/functions/get-my-chats/` | Chats del usuario vía RPC `obtener_mis_chats`. Preview (último msg, unreadCount) ordenado por actividad. Dual-client. |

### Legado
| Función | Ruta | Descripción |
|---------|------|-------------|
| **parse-and-create-excursion** | `backend/supabase/functions/parse-and-create-excursion/` | DEPRECATED. No usar. |


## Convenciones de estilo

- **Toda pantalla nueva debe importar `shared` de `../theme/styles` y `colors` de `../theme/colors`**. No hardcodear colores ni replicar estilos que ya están en `shared`.
- Estilos locales (`StyleSheet.create`) solo para layout específico de la pantalla. Si el patrón se repite en >1 pantalla, mover a `shared`.
- Para extender un estilo compartido: array `[shared.card, { marginBottom: 20 }]`.
- **No usar `alignItems: "center"` en contenedores que tengan tarjetas/inputs**: hace que las cards se encojan al ancho mínimo. Para centrar elementos individuales: `alignSelf: "center"` (icono) o `textAlign: "center"` (textos).
- Idioma de UI: español. Comentarios y logs: español.
- Cuando escribas SQL, escríbelo en postgres puro (con comillas para identificadores con mayúsculas) para ejecutar desde Supabase.

## Convenciones de arquitectura

- **Lógica de negocio en Edge Functions, no en frontend**. Los servicios del frontend son envoltorios `fetch` finos.
- **Auth**: el frontend NUNCA llama directamente a `supabase.auth.signInWithPassword`. Usa `authService` → Edge Function. La sesión sí se sincroniza con `supabase.auth.setSession` para queries autenticadas a Storage/tablas.
- **Persistencia de sesión**: AsyncStorage clave `auth_session`. `AuthContext.setSession(null)` cierra sesión.
- **GPX**: el archivo se sube a Supabase Storage; `create-excursion-with-gpx` lo parsea en backend. Para descargarlo el frontend usa URL pública directa (`supabase.storage.from('gpx-files').getPublicUrl(path)`) en lugar de la Edge Function `download-gpx`.
- **Navegación tras login/crear excursión**: `navigation.reset({ index: 0, routes: [{ name: "ExcursionList" }] })`.
- **Token retry**: todos los servicios usan un loop de 3 intentos con backoff 100ms antes de caer a ANON_KEY. Patrón en `getAuthToken()`.
- **Dual-client en Edge Functions**: `authClient` (ANON_KEY + Authorization header) para validar usuario; `supabase` (SERVICE_ROLE_KEY) para operar. Ver `backend/CLAUDE.md` para el template completo.

## Comandos

```bash
npm start                  # Metro
npm run android            # build + run en dispositivo/emulador
npm run ios
npm test
npm run lint
```

## Gotchas Android

- **Mapa en blanco en dispositivo físico**: problema de SHA1. El proyecto firma con `android/app/debug.keystore` (NO `~/.android/debug.keystore`). Hay que registrar la SHA1 de ese keystore en Google Cloud Console.
  - SHA1 del keystore del proyecto: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
  - El SDK de Maps valida la firma localmente antes de hacer requests; si falla, no aparece error en logs — solo tiles en blanco.
- **AndroidManifest.xml** ya tiene `ACCESS_NETWORK_STATE` y `android:hardwareAccelerated="true"` en `MainActivity`.
- **MapView dentro de ScrollView**: usar `scrollEnabled={false}` en el `MapView`.
- "Actualizando servicios de Google Play" en el mapa = API key + SHA1 correctos, solo Play Services desactualizado.
- En Windows no hay `grep`; usar `findstr /i` con adb logcat.

## Estado actual (2026-05-18)

### ✅ Funcionalidades completamente implementadas:
- **Login y registro** (2 pasos)
- **Listar excursiones con filtros** (dificultad/tipo)
- **Crear excursión con GPX** — redirige a ExcursionList tras éxito
- **Detalle de excursión con mapa**
  - Lazy loading con `InteractionManager` + timeout 5s usando `mapReadyRef` (ref, no state)
  - Números formateados: 2 decimales + coma española (45,32 km)
- **Unirse / Abandonar / Solicitar unión / Cancelar solicitud**
- **Gestión de solicitudes** (organizador acepta/rechaza desde PendingRequestsScreen)
- **Lista de participantes** (ExcursionParticipantsScreen)
  - Badge "Dueño" para el organizador (comparando `p.usuarioId === organizerId`)
  - Badge "Confirmado" si asistencia confirmada, "Aceptado" si no
  - `organizerId` se pasa como route param desde ExcursionDetailScreen
- **Confirmar asistencia** (ventana: 1h antes a 2h después de fechaInicio)
- **Editar excursión** (solo organizador, antes de la fecha)
- **Finalizar excursión** (solo organizador, a partir de la fecha de inicio)
- **Eliminar excursión**
  - Dual-client pattern (authClient para validar, SERVICE_ROLE_KEY para DELETE)
  - GPX path puede ser relativo o URL pública; la función extrae el path si es URL
  - FK con ON DELETE CASCADE en `participacion.excursionId`
- **Mis Excursiones** (filtros: todas/organizadas/unidas)
- **Tab navigation** (Explorar + Mis Excursiones + Chats con estado independiente)
- **Logout** (disponible en ExcursionList, MyExcursions y MyChats via BrandHeader)
- **Chat de grupo**
  - Tabla `mensaje` (ON DELETE CASCADE) + `chat_lectura` (lastReadAt por usuario por chat)
  - Realtime via `supabase.channel`, filtrado client-side (no server-side por limitación camelCase)
  - Paginación cursor: 50 mensajes, "Cargar mensajes anteriores" en cabecera de FlatList
  - Mensajes en estado "enviando": bubble opacity 0.75 + spinner, sustituido al confirmar servidor
  - Deduplicación Realtime vs HTTP: si el mensaje ya llegó por Realtime, no se añade duplicado
  - Separadores de fecha entre días (Hoy / Ayer / fecha larga en español)
  - No leídos: `COUNT(mensaje WHERE createdAt > lastReadAt AND usuarioId != yo)`
  - RPC `obtener_mis_chats` en PostgreSQL con LATERAL joins para preview eficiente
  - Badge en tab "Chats" via `ChatUnreadContext.totalUnread`
  - Excursión finalizada → input deshabilitado, banner solo lectura

### 🔐 Estado del patrón dual-client (seguridad Edge Functions):

**✅ Con dual-client (authClient + SERVICE_ROLE_KEY):**
- `update-excursion`, `delete-excursion`, `finish-excursion`
- `request-join-excursion`, `cancel-join-request`, `leave-excursion`, `confirm-attendance`
- `get-pending-requests`, `respond-join-request`, `get-my-excursions`
- `send-message`, `get-chat-messages`, `mark-chat-read`, `get-my-chats`

**✅ Con SERVICE_ROLE_KEY (sin auth header, válido para operaciones públicas):**
- `auth-check-email`, `auth-check-username`, `auth-login`, `auth-logout`
- `get-filtered-excursions`, `get-excursion-participants`, `download-gpx`
- `parse-and-create-excursion` (LEGACY)

**⚠️ Pendiente de dual-client:**
- `auth-complete-registration` — MEDIUM priority

### ⚠️ Gotchas actuales:

**Eliminar excursión y CASCADE**:
- La FK `participacion.excursionId → excursion.id` debe tener `ON DELETE CASCADE` en la BD
- SQL a ejecutar en Supabase SQL Editor si no se ha hecho:
  ```sql
  ALTER TABLE "participacion"
  DROP CONSTRAINT "participacion_excursionId_fkey",
  ADD CONSTRAINT "participacion_excursionId_fkey"
    FOREIGN KEY ("excursionId") REFERENCES "excursion"("id") ON DELETE CASCADE;
  ```

**Realtime y columnas camelCase**:
- Los filtros server-side de Supabase Realtime no funcionan bien con columnas camelCase (ej: `excursionId`)
- Solución: suscribirse a toda la tabla `mensaje` y filtrar client-side en el callback de `subscribeToChatMessages`

**MapView en dispositivo físico**:
- Intermitente: a veces carga, a veces no. Relacionado con Google Play Services y SHA1.
- SHA1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (registrado en Google Cloud)
- El timeout de 5s (mapReadyRef) evita freeze; si no carga muestra mensaje de error no bloqueante

**database.types.ts**:
- Encoding UTF-16 LE (con BOM) — si lo lees con herramientas que asumen UTF-8 aparecerá con caracteres extraños entre letras. Usar como referencia de tipos, no editar manualmente.
