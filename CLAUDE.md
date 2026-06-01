# TrailAndMeet

App móvil React Native (Android/iOS) para organizar y unirse a excursiones de montaña. TFG.

## Stack

- **Frontend**: React Native 0.83 + TypeScript, React Navigation v7 (native-stack + bottom-tabs + `@react-navigation/material-top-tabs`), `react-native-maps` (Google Maps), `react-native-linear-gradient`, `@react-native-vector-icons/material-design-icons`, `fast-xml-parser` (parsing GPX), `react-native-config` (env vars), `@react-native-async-storage/async-storage`, `react-native-tab-view`, `react-native-pager-view` (needed for material top tabs — requires native build), `@react-native-firebase/app`, `@react-native-firebase/messaging` (push notifications FCM v1).
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions Deno). Toda la lógica vive en Edge Functions; el frontend llama vía `fetch` a `${SUPABASE_URL}/functions/v1/<func>`.
- **Plataforma de desarrollo**: Windows. Shell por defecto bash (sintaxis Unix). PowerShell también disponible.

## Estructura

```
App.tsx                    -> AuthProvider + ChatUnreadProvider + NotificationProvider + AppNavigator
src/
  navigation/
    AppNavigation.tsx      -> AuthStack vs AppStack según session. AppStack usa TabNavigator (Explorar + Mis Excursiones + Comunidad + Perfil).
                             RootStackParamList define todos los screens incluido Notifications.
                             Tab "Comunidad" muestra badge con totalUnread de ChatUnreadContext.
                             ComunidadTopTabs incluye BrandHeader encima del tab navigator (Foros | Chats).
                             BrandHeader en ComunidadTopTabs tiene campana con badge de notificaciones.
                             AppStack carga unreadCount de notificaciones al montar vía getNotifications().
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
                             Sub-tab dentro de ComunidadTopTabs.
    MyForumsScreen         -> Sub-tab raíz de foros. Lista foros a los que pertenece el usuario.
                             Botones "Explorar foros" (→ ExploreForums) y "Crear foro" (→ CreateForum).
                             useFocusEffect recarga. SIN BrandHeader propio (está en ComunidadTopTabs).
    ExploreForumsScreen    -> Búsqueda de foros: por código (#XXXXXX) o texto (ILIKE título).
                             Chips de categorías predefinidas. Infinite scroll (offset pagination).
                             Badge "Miembro" en foros ya unidos. Navega a ForumDetail al pulsar.
    CreateForumScreen      -> Crear foro: portada (picker imagen), título, descripción, categorías
                             (chips predefinidos + campo libre), tipo público/privado, contraseña si privado.
    ForumDetailScreen      -> Portada banner, info del foro, botón unirse/abandonar (con modal password
                             para privados), botón miembros, lista de publicaciones con cursor DESC.
                             Solo miembros pueden crear publicaciones. isOwner puede eliminar posts.
    ForumMembersScreen     -> Lista de miembros con avatar inicial, badge Moderador, fecha de unión.
                             Moderador ve botón expulsar (no en su propia fila).
    CreatePostScreen       -> Crear publicación: título, contenido, imagen opcional.
    PostDetailScreen       -> Post completo + comentarios ASC + input comentario inline.
                             KeyboardAvoidingView. Owner/moderador puede eliminar post o comentarios.
                             PostHeader como useMemo para evitar que la imagen recargue al abrir teclado.
                             Al enviar comentario se añade optimistamente con username del usuario actual.
    NotificationsScreen    -> Lista de notificaciones del usuario (últimas 50).
                             No leídas: fondo verde + barra izquierda + título en negrita + punto.
                             Al pulsar: modal con detalle grande, se marca como leída en ese momento.
                             Botón "marcar todo leído" (check-all) con Alert de confirmación.
                             useFocusEffect recarga. Actualiza NotificationContext.unreadCount.
  components/
    buttons/               -> AuthButton, PrimaryButton
    cards/                 -> ExcursionCard, FeatureItem
    form/                  -> FormCard, FormInput, FormSelect, FilePickerInput, DatePickerInput, TimePickerInput, SlotsInput
    headers/               -> BrandHeader (logout opcional + campana notificaciones con badge rojo)
  context/
    AuthContext.tsx        -> Sesión persistida en AsyncStorage + sincronizada con supabase.auth.
                             Al restaurar sesión llama registerPushToken() automáticamente.
    ChatUnreadContext.tsx  -> totalUnread (suma de no leídos de todos los chats). MyChatsScreen lo actualiza; AppStack lo lee para el badge del tab.
    NotificationContext.tsx -> unreadCount (notificaciones no leídas). AppStack lo carga al montar;
                             NotificationsScreen lo actualiza al marcar como leídas. BrandHeader lo lee para el badge de la campana.
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
    forumService.ts        -> createForum, getForums, getForumDetail, joinForum, leaveForum, getMyForums,
                             kickMember, createPost, getPosts, deletePost, createComment, getPostDetail,
                             deleteComment, getForumMembers.
                             Interfaces: ForumSummary, ForumDetail, Post, Comment, ForumMember.
                             Mismo patrón getAuthToken() con 3 reintentos.
    forumStorageService.ts -> pickAndUploadCover(userId) → 'covers/{userId}/{timestamp}.jpg'
                             pickAndUploadPostImage(userId) → 'posts/{userId}/{timestamp}.jpg'
                             Bucket privado 'forum-images'. Usa launchImageLibrary + base64 → Uint8Array → supabase.storage.upload.
    notificationService.ts -> registerPushToken(), getNotifications(), markNotificationsRead(id?).
                             registerPushToken: pide permiso FCM, obtiene token del dispositivo, llama register-push-token.
                             markNotificationsRead: si se pasa id marca solo esa; sin id marca todas.
                             Interface: Notificacion { id, titulo, cuerpo, tipo, data, leida, createdAt }.
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
  supabase/functions/      -> [ver sección Rutas Backend]
android/
  app/
    debug.keystore         -> Keystore local del proyecto (NO ~/.android/debug.keystore)
    google-services.json   -> Configuración Firebase (FCM). NO commitear.
    src/main/AndroidManifest.xml
.env                       -> SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_MAPS_API_KEY (no commiteado)
database.types.ts          -> Tipos de todas las tablas de supabase (ENCODING UTF-16 LE)
```

## Rutas Frontend (Screens)

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| **WelcomeScreen** | `src/screens/WelcomeScreen.tsx` | Pantalla inicial con opciones de login/registro. |
| **LoginScreen** | `src/screens/LoginScreen.tsx` | Formulario de login. Llama `registerPushToken()` tras login exitoso. |
| **RegisterStep1Screen** | `src/screens/RegisterStep1Screen.tsx` | Registro paso 1: email, username, contraseña. |
| **RegisterStep2Screen** | `src/screens/RegisterStep2Screen.tsx` | Registro paso 2: nombre, apellido, edad, teléfono, foto. |
| **ExcursionListScreen** | `src/screens/ExcursionListScreen.tsx` | Listar excursiones públicas con filtros (dificultad, tipo). |
| **MyExcursionsScreen** | `src/screens/MyExcursionsScreen.tsx` | Excursiones del usuario con filtros: todas / organizadas / en las que participa. |
| **CreateExcursionScreen** | `src/screens/CreateExcursionScreen.tsx` | Crear nueva excursión: nombre, descripción, fecha, hora, GPX, plazas, dificultad, tipo. |
| **ExcursionDetailScreen** | `src/screens/ExcursionDetailScreen.tsx` | Detalle completo: mapa, info, acciones según rol (organizador vs participante). |
| **EditExcursionScreen** | `src/screens/EditExcursionScreen.tsx` | Editar excursión (solo organizador, antes de la fecha de inicio). |
| **PendingRequestsScreen** | `src/screens/PendingRequestsScreen.tsx` | Ver solicitudes pendientes; organizador acepta/rechaza. |
| **ExcursionParticipantsScreen** | `src/screens/ExcursionParticipantsScreen.tsx` | Listar participantes confirmados con badges (Dueño/Confirmado/Aceptado). |
| **ChatScreen** | `src/screens/ChatScreen.tsx` | Chat de grupo por excursión. Burbujas WhatsApp, separadores de fecha, paginación cursor, Realtime. Params: `{ excursionId, excursionTitle, excursionStatus }`. |
| **MyChatsScreen** | `src/screens/MyChatsScreen.tsx` | Lista de todos los chats activos del usuario con preview y badge de no leídos. Sub-tab de Comunidad. |
| **MyForumsScreen** | `src/screens/MyForumsScreen.tsx` | Foros del usuario. Sub-tab de Comunidad. Botones Explorar y Crear foro. |
| **ExploreForumsScreen** | `src/screens/ExploreForumsScreen.tsx` | Buscar foros por código o texto. Chips de categorías. Infinite scroll. |
| **CreateForumScreen** | `src/screens/CreateForumScreen.tsx` | Crear foro con portada, categorías chips, tipo público/privado y contraseña. |
| **ForumDetailScreen** | `src/screens/ForumDetailScreen.tsx` | Detalle del foro: portada, posts paginados DESC, acciones unirse/abandonar. |
| **ForumMembersScreen** | `src/screens/ForumMembersScreen.tsx` | Lista de miembros del foro. Moderador puede expulsar. Params: `{ foroId, foroTitulo }`. |
| **CreatePostScreen** | `src/screens/CreatePostScreen.tsx` | Crear publicación en un foro. Params: `{ foroId, foroTitulo }`. |
| **PostDetailScreen** | `src/screens/PostDetailScreen.tsx` | Post + comentarios ASC + input comentario. Params: `{ postId, postTitulo, foroId }`. |
| **NotificationsScreen** | `src/screens/NotificationsScreen.tsx` | Lista de notificaciones. Pulsar abre modal detalle y marca como leída. Botón marcar todo leído. |

## Rutas Backend (Edge Functions)

### Autenticación
| Función | Descripción |
|---------|-------------|
| **auth-check-email** | Valida si el email está disponible. |
| **auth-check-username** | Valida si el username está disponible. |
| **auth-login** | Login con email + contraseña; devuelve session y user. |
| **auth-complete-registration** | Completa registro. (Solo SERVICE_ROLE_KEY — pendiente dual-client). |
| **auth-logout** | Cierra sesión e invalida el token. |

### Gestión de Excursiones
| Función | Descripción |
|---------|-------------|
| **create-excursion-with-gpx** | Crea excursión, parsea GPX en backend, inserta al organizador como participante accepted. |
| **update-excursion** | Edita campos de excursión (solo organizador). Dual-client. |
| **delete-excursion** | Elimina excursión y cascada. Borra GPX de Storage. Notifica a participantes. Dual-client. |
| **finish-excursion** | Marca excursión como finalizada. Notifica a participantes. Dual-client. |
| **get-filtered-excursions** | Listar excursiones con filtros por dificultad/tipo. |
| **get-my-excursions** | Listar excursiones del usuario (organizadas + participación). Dual-client. |
| **get-excursion-detail** | Detalle completo: info de ruta, estado de participación, counts. |
| **download-gpx** | Descargar GPX de Storage. (El frontend usa URL pública directa en su lugar.) |

### Solicitudes y Participación
| Función | Descripción |
|---------|-------------|
| **request-join-excursion** | Solicitar unirse. Notifica al organizador. Dual-client. |
| **cancel-join-request** | Cancelar solicitud pendiente. Dual-client. |
| **leave-excursion** | Abandonar excursión. Notifica al organizador. Dual-client. |
| **confirm-attendance** | Confirmar asistencia (ventana: 1h antes a 2h después). Notifica al organizador. Dual-client. |
| **get-pending-requests** | Solicitudes pendientes (solo organizador). Dual-client. |
| **respond-join-request** | Organizador acepta/rechaza solicitud. Notifica al solicitante. Dual-client. |
| **get-excursion-participants** | Listar participantes aceptados de una excursión. |

### Chat
| Función | Descripción |
|---------|-------------|
| **send-message** | Enviar mensaje. Notifica al resto de participantes. Dual-client. |
| **get-chat-messages** | Mensajes paginados (cursor por id, 50/página, ASC). Dual-client. |
| **mark-chat-read** | UPSERT en `chat_lectura` con `lastReadAt = NOW()`. Dual-client. |
| **get-my-chats** | Chats del usuario vía RPC `obtener_mis_chats`. Dual-client. |

### Foros
| Función | Descripción |
|---------|-------------|
| **create-forum** | Crea foro + inserta creador como miembro. bcryptjs para hash contraseña. Dual-client. |
| **get-forums** | Buscar foros por código `#XXXXXX` o texto ILIKE. Signed URLs. |
| **get-forum-detail** | Detalle del foro + isMember + isModerador + memberCount + signed URL. |
| **join-forum** | Unirse al foro. bcryptjs para privados. Dual-client. |
| **leave-forum** | Abandonar foro. Bloquea al moderador. Dual-client. |
| **get-my-forums** | Foros del usuario. Signed URLs. Dual-client. |
| **kick-forum-member** | Expulsar miembro. Notifica al expulsado. Dual-client. |
| **create-post** | Crear publicación. Valida membresía. Dual-client. |
| **get-posts** | Posts paginados cursor DESC (20/página). Signed URLs. |
| **delete-post** | Eliminar post. Owner OR moderador. Borra imagen de Storage. Dual-client. |
| **create-comment** | Crear comentario. Notifica al autor del post. Dual-client. |
| **get-post-detail** | Post + comentarios ASC + isOwner/isModerador + signed URL. |
| **delete-comment** | Eliminar comentario. Owner OR moderador. Dual-client. |
| **get-forum-members** | Miembros del foro con esModerador flag. Dual-client. |

### Notificaciones Push
| Función | Descripción |
|---------|-------------|
| **register-push-token** | Guarda token FCM del dispositivo en tabla `push_token`. Dual-client. |
| **send-push-notification** | Helper interno: inserta en `notificacion` + envía FCM v1 a todos los tokens del usuario. Llamado por otras Edge Functions, no por el frontend directamente. Input: `{ userIds, titulo, cuerpo, tipo, data? }`. |
| **get-notifications** | Devuelve últimas 50 notificaciones del usuario + unreadCount. Dual-client. |
| **mark-notifications-read** | Marca como leídas. Si se pasa `{ id }` marca solo esa; sin id marca todas. Dual-client. |

### Legado
| Función | Descripción |
|---------|-------------|
| **parse-and-create-excursion** | DEPRECATED. No usar. |

## Convenciones de estilo

- **Toda pantalla nueva debe importar `shared` de `../theme/styles` y `colors` de `../theme/colors`**. No hardcodear colores ni replicar estilos que ya están en `shared`.
- Estilos locales (`StyleSheet.create`) solo para layout específico de la pantalla. Si el patrón se repite en >1 pantalla, mover a `shared`.
- Para extender un estilo compartido: array `[shared.card, { marginBottom: 20 }]`.
- **No usar `alignItems: "center"` en contenedores que tengan tarjetas/inputs**: hace que las cards se encojan al ancho mínimo. Para centrar elementos individuales: `alignSelf: "center"` (icono) o `textAlign: "center"` (textos).
- Idioma de UI: español. Comentarios y logs: español.
- Cuando escribas SQL, escríbelo en postgres puro (con comillas para identificadores con mayúsculas) para ejecutar desde Supabase.

## Convenciones de arquitectura

- **Lógica de negocio en Edge Functions, no en frontend**. Los servicios del frontend son envoltorios `fetch` finos.
- **Edge Functions se despliegan desde el dashboard de Supabase** copiando y pegando el código. No se usan localmente ni con CLI.
- **Auth**: el frontend NUNCA llama directamente a `supabase.auth.signInWithPassword`. Usa `authService` → Edge Function. La sesión sí se sincroniza con `supabase.auth.setSession` para queries autenticadas a Storage/tablas.
- **Persistencia de sesión**: AsyncStorage clave `auth_session`. `AuthContext.setSession(null)` cierra sesión.
- **GPX**: el archivo se sube a Supabase Storage; `create-excursion-with-gpx` lo parsea en backend. Para descargarlo el frontend usa URL pública directa (`supabase.storage.from('gpx-files').getPublicUrl(path)`) en lugar de la Edge Function `download-gpx`.
- **Navegación tras login/crear excursión**: `navigation.reset({ index: 0, routes: [{ name: "ExcursionList" }] })`.
- **Token retry**: todos los servicios usan un loop de 3 intentos con backoff 100ms antes de caer a ANON_KEY. Patrón en `getAuthToken()`.
- **Dual-client en Edge Functions**: `authClient` (ANON_KEY + Authorization header) para validar usuario; `supabase` (SERVICE_ROLE_KEY) para operar. Ver `backend/CLAUDE.md` para el template completo.
- **Notificaciones fire-and-forget**: las llamadas a `send-push-notification` desde otras Edge Functions usan `.catch()` y no se awaitan — un fallo en la notificación nunca bloquea la operación principal.
- **FCM API v1**: se usa la API v1 de Firebase Cloud Messaging (la legacy está deshabilitada). Requiere OAuth2 con service account. Las credenciales (`FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `FCM_PROJECT_ID`) van en Supabase Secrets, nunca en `.env`.

## Comandos

```bash
npm start                  # Metro
npm run android            # build + run en dispositivo/emulador
adb reverse tcp:8081 tcp:8081  # Restaurar conexión Metro tras reconectar USB
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
- En Windows no hay `grep`; usar `findstr /i` con adb logcat. Para logs de React Native: `adb logcat -s ReactNativeJS:V`.
- **Metro se pierde al reconectar USB**: ejecutar `adb reverse tcp:8081 tcp:8081`.

## Estado actual (2026-06-01)

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
- **Confirmar asistencia** (ventana: 1h antes a 2h después de fechaInicio)
- **Editar excursión** (solo organizador, antes de la fecha)
- **Finalizar excursión** (solo organizador, a partir de la fecha de inicio)
- **Eliminar excursión**
- **Mis Excursiones** (filtros: todas/organizadas/unidas)
- **Tab navigation** (Explorar + Mis Excursiones + Comunidad + Perfil)
- **Logout** (disponible en ExcursionList, MyExcursions via BrandHeader)
- **Chat de grupo**
  - Tabla `mensaje` (ON DELETE CASCADE) + `chat_lectura` (lastReadAt por usuario por chat)
  - Realtime via `supabase.channel`, filtrado client-side
  - Paginación cursor: 50 mensajes
  - Mensajes pendientes con spinner
  - Deduplicación Realtime vs HTTP
  - Separadores de fecha entre días
  - Badge en tab "Comunidad" via `ChatUnreadContext`
  - Excursión finalizada → input deshabilitado
- **Foros** (Reddit-style: Forum → Posts → Comments)
  - Foros públicos/privados con bcrypt
  - Moderador = creador. Puede expulsar, eliminar posts/comentarios
  - 14 Edge Functions de foros
  - 7 pantallas de foros
  - Imágenes con signed URLs
- **Sistema de notificaciones push** (FCM v1)
  - Tabla `push_token` + tabla `notificacion`
  - Token FCM registrado al login y al restaurar sesión
  - 10 tipos de notificación: join_request, request_accepted, request_rejected, left_excursion, attendance_confirmed, excursion_deleted, excursion_finished, new_message, new_comment, kicked_from_forum
  - Campana en BrandHeader con badge rojo de no leídas
  - NotificationsScreen: lista con distinción visual leída/no leída, modal detalle al pulsar, marcar todo leído
  - Notificaciones se marcan como leídas al pulsar (no al entrar a la pantalla)

### 🔐 Estado del patrón dual-client:

**✅ Con dual-client:**
- `update-excursion`, `delete-excursion`, `finish-excursion`
- `request-join-excursion`, `cancel-join-request`, `leave-excursion`, `confirm-attendance`
- `get-pending-requests`, `respond-join-request`, `get-my-excursions`
- `send-message`, `get-chat-messages`, `mark-chat-read`, `get-my-chats`
- `create-forum`, `join-forum`, `leave-forum`, `get-my-forums`, `kick-forum-member`
- `create-post`, `delete-post`, `create-comment`, `delete-comment`, `get-forum-members`
- `register-push-token`, `get-notifications`, `mark-notifications-read`

**✅ Con SERVICE_ROLE_KEY (operaciones públicas):**
- `auth-check-email`, `auth-check-username`, `auth-login`, `auth-logout`
- `get-filtered-excursions`, `get-excursion-participants`, `download-gpx`
- `get-forums`, `get-forum-detail`, `get-posts`, `get-post-detail`
- `send-push-notification` (llamado internamente con SERVICE_ROLE_KEY)

**⚠️ Pendiente de dual-client:**
- `auth-complete-registration` — MEDIUM priority

### ⚠️ Gotchas actuales:

**FCM API v1 — credenciales**:
- La API heredada de FCM está deshabilitada en este proyecto Firebase.
- Se usa FCM v1 con service account y OAuth2 (JWT firmado con RS256).
- `FCM_PRIVATE_KEY` se guarda en Supabase Secrets con `\n` literales; la Edge Function los convierte con `.replace(/\\n/g, '\n')`.
- Las credenciales FCM NUNCA van en `.env` (se bundlearía en el APK).

**Notificaciones fire-and-forget**:
- Las Edge Functions llaman a `send-push-notification` vía fetch sin await.
- Si falla la notificación, la operación principal (unirse, enviar mensaje, etc.) sigue funcionando.

**Linter Deno en VS Code**:
- Los errores `Cannot find name 'Deno'` en las Edge Functions son falsos positivos del linter de VS Code.
- Deno no es Node.js; el linter TS no tiene los tipos de Deno. No afecta al funcionamiento en Supabase.

**BrandHeader y Comunidad**:
- El BrandHeader de la tab Comunidad está en `ComunidadTopTabs` (AppNavigation), NO en MyForumsScreen.
- Esto evita que las tabs aparezcan por encima del header.

**PostDetailScreen — imagen al abrir teclado**:
- `PostHeader` es un `useMemo` (no un componente inline) para evitar que la imagen recargue al aparecer el teclado.

**Eliminar excursión y CASCADE**:
- La FK `participacion.excursionId → excursion.id` debe tener `ON DELETE CASCADE`.

**Realtime y columnas camelCase**:
- Los filtros server-side de Supabase Realtime no funcionan con camelCase. Filtrar client-side.

**Signed URLs en imágenes de foros**:
- Caducan a 1h. Se renuevan en el próximo `useFocusEffect`.

**react-native-pager-view**:
- Tiene código nativo; cambios en tabs requieren rebuild (`npm run android`).

**database.types.ts**:
- Encoding UTF-16 LE (con BOM). Usar como referencia, no editar manualmente.
