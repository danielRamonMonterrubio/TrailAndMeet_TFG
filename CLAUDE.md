# TrailAndMeet

App móvil React Native (Android/iOS) para organizar y unirse a excursiones de montaña. TFG.

## Stack

- **Frontend**: React Native 0.83 + TypeScript, React Navigation v7 (native-stack), `react-native-maps` (Google Maps), `react-native-linear-gradient`, `@react-native-vector-icons/material-design-icons`, `fast-xml-parser` (parsing GPX), `react-native-config` (env vars), `@react-native-async-storage/async-storage`.
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions Deno). Toda la lógica vive en Edge Functions; el frontend llama vía `fetch` a `${SUPABASE_URL}/functions/v1/<func>`.
- **Plataforma de desarrollo**: Windows. Shell por defecto bash (sintaxis Unix). PowerShell también disponible.

## Estructura

```
App.tsx                    -> AuthProvider + AppNavigator
src/
  navigation/
    AppNavigation.tsx      -> AuthStack vs AppStack según session. AppStack usa TabNavigator (Explorar + Mis Excursiones).
                             RootStackParamList define todos los screens. TabPress listeners en Tab.Screen resetean stacks internos.
  screens/                 -> Welcome, Login, RegisterStep1, RegisterStep2, ExcursionList, MyExcursions, CreateExcursion, ExcursionDetail
  components/
    buttons/               -> AuthButton, PrimaryButton
    cards/                 -> ExcursionCard, FeatureItem
    form/                  -> FormCard, FormInput, FormSelect, FilePickerInput, DatePickerInput, TimePickerInput, SlotsInput
    headers/               -> BrandHeader (con logout button opcional)
  context/
    AuthContext.tsx        -> Sesión persistida en AsyncStorage + sincronizada con supabase.auth
  services/
    supabaseClient.ts      -> createClient con AsyncStorage como storage
    authService.ts         -> checkEmail/Username, login, logout, completeRegistration (todos vía Edge Functions)
    excursionService.ts    -> getFilteredExcursions (filtrar por dificultad/tipo)
    excursionDetailService.ts -> getExcursionDetail (con map data si está disponible)
    excursionInteractionService.ts -> joinExcursion, leaveExcursion, getMyExcursions (todas vía Edge Functions)
    excursionCreationService.ts -> createExcursionWithGPX
    excursionStorageService.ts -> uploadGPXFile, downloadGPX
    gpxParserService.ts    -> parseGPXContent (local parsing)
    mappers/excursionMapper.ts
  models/Excursion.ts      -> Tipos ExcursionDifficulty, ExcursionType, interfaz Excursion
  types/
    AppFile.ts             -> Tipo para archivos seleccionados (name, base64, ...)
    database.types.ts      -> Tipos generados de Supabase
  theme/
    colors.ts              -> Paleta centralizada (primaryGradientStart/End, textPrimary/Secondary/Muted, etc.)
    styles.ts              -> `shared` StyleSheet con container, content, header, headerTitle, headerSubtitle, screenTitle, sectionTitle, card, label, input, passwordRow, errorText, primaryButton, primaryButtonText, iconCircle, row
backend/
  supabase/functions/      -> auth-check-email, auth-check-username, auth-complete-registration, auth-login, auth-logout, create-excursion-with-gpx, download-gpx, get-excursion-detail, get-filtered-excursions, get-my-excursions, join-excursion, leave-excursion, parse-and-create-excursion
android/
  app/
    debug.keystore         -> Keystore local del proyecto (NO ~/.android/debug.keystore)
    src/main/AndroidManifest.xml
.env                       -> SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_MAPS_API_KEY (no commiteado)
```

## Convenciones de estilo

- **Toda pantalla nueva debe importar `shared` de `../theme/styles` y `colors` de `../theme/colors`**. No hardcodear colores ni replicar estilos que ya están en `shared`.
- Estilos locales (`StyleSheet.create`) solo para layout específico de la pantalla. Si el patrón se repite en >1 pantalla, mover a `shared`.
- Para extender un estilo compartido: array `[shared.card, { marginBottom: 20 }]`.
- **No usar `alignItems: "center"` en contenedores que tengan tarjetas/inputs**: hace que las cards se encojan al ancho mínimo en lugar de ocupar todo el ancho. Para centrar elementos individuales usa `alignSelf: "center"` (icono) o `textAlign: "center"` (textos).
- Idioma de UI: español. Comentarios y logs: español.

## Convenciones de arquitectura

- **Lógica de negocio en Edge Functions, no en frontend**. Los servicios del frontend son envoltorios `fetch` finos. Si una función todavía hace lógica en el cliente, migrarla.
- **Auth**: el frontend NUNCA llama directamente a `supabase.auth.signInWithPassword` para login/registro. Usa `authService` → Edge Function. La sesión sí se sincroniza con `supabase.auth.setSession` para que el cliente Supabase pueda hacer queries autenticadas a Storage/tablas.
- **Persistencia de sesión**: AsyncStorage clave `auth_session`. `AuthContext.setSession(null)` cierra sesión.
- **GPX**: el archivo se sube a Supabase Storage como base64; `create-excursion-with-gpx` lo parsea en el backend y devuelve `routeInfo` (startPoint, totalDistance, maxElevation, etc.).
- **Navegación tras login/crear excursión**: `navigation.reset({ index: 0, routes: [{ name: "ExcursionList" }] })` para que no se pueda volver atrás.

## Comandos

```bash
npm start                  # Metro
npm run android            # build + run en dispositivo/emulador
npm run ios
npm test
npm run lint
```

## Gotchas Android

- **Mapa en blanco en dispositivo físico (funciona en emulador)**: el problema típico es la SHA1. El proyecto firma con `android/app/debug.keystore` (NO `~/.android/debug.keystore`). Hay que registrar la SHA1 de ese keystore concreto en Google Cloud Console (clave de Google Maps) junto al package `com.trailandmeet`.
  - SHA1 actual del keystore del proyecto: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
  - El SDK de Maps valida la firma localmente *antes* de hacer requests; si falla, no aparece error en logs ni sube el contador de la API — solo tiles en blanco.
- **AndroidManifest.xml** ya tiene `ACCESS_NETWORK_STATE` y `android:hardwareAccelerated="true"` en `MainActivity`. Imprescindible para Maps.
- **MapView dentro de ScrollView**: usar `scrollEnabled={false}` en el `MapView` (gesto del scroll vs gesto del mapa rompe el render en algunos dispositivos físicos).
- "Actualizando servicios de Google Play" en el mapa significa que la API key + SHA1 están bien — el dispositivo solo tiene Play Services desactualizado.
- En Windows no hay `grep`; usar `findstr /i` con adb logcat.

## Estado actual (2026-04-27)

### ✅ Funcionalidades implementadas:
- **Login y registro** (2 pasos) ✅
- **Listar excursiones con filtros** (dificultad/tipo) ✅
- **Crear excursión con GPX** ✅
- **Detalle de excursión con mapa** ✅
  - Lazy loading con `InteractionManager` + timeout 5s
  - Si MapView tarda >5s, muestra error; app sigue responsive
  - BrandHeader removido; detalle es limpio
  - Números formateados: 2 decimales + coma española (45,32 km)
- **Unirse a excursión** ✅ (botón funcional en ExcursionDetail)
- **Dejar excursión** ✅
- **Mi Excursiones** ✅ (filtros: todas/organizadas/unidas)
- **Tab navigation** ✅ (Explorar + Mis Excursiones con estado independiente)
  - TabPress listeners resetean stacks internos usando nested navigate
  - Switching tabs no muestra detail screens antiguos
- **Logout** ✅ (disponible en ExcursionList y MyExcursions via BrandHeader)

### 🔧 Detalles técnicos por pantalla:

**ExcursionDetailScreen**:
- Estados: `mapVisible`, `mapReady`, `mapError`
- Map renderiza tras `InteractionManager.runAfterInteractions()` con timeout
- Si timeout: error después 5s, usuario sigue viendo info de excursión
- Helper `formatNumber()`: convierte 45.32 → "45,32"
- Sin header; sin logout; limpio

**AppNavigation**:
- `TabNavigator` con 2 tabs: "ExcursionList" y "MyExcursions"
- Cada tab tiene su Stack interno
- TabPress listeners: `navigation.navigate('ExcursionList', { screen: 'ExcursionList' })` etc.
  - Resetea stack interno al presionar tab activo/inactivo
  - Evita que detalle anterior persista en otro tab

**ExcursionListScreen**:
- Filtros funcionales (dificultad/tipo)
- Logout button en header (via `BrandHeader`)
- `useFocusEffect`: recarga excursiones cuando screen recibe foco

**MyExcursionsScreen**:
- Tres filtros: todas / organizadas / unidas
- Logout button en header
- `useFocusEffect`: recarga excursiones cuando screen recibe foco

### ⚠️ Gotchas actuales:

**MapView en dispositivo físico**:
- Device tiene Google Play Services desactualizado → mapa no carga (solo tiles en blanco)
- No es error del código; timeout workaround previene freeze
- En emulador funciona bien
- SHA1 del keystore: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (ya registrado en Google Cloud)

**Debug text**:
- `ExcursionDetailScreen` tiene `console.log` con emoji y text en pantalla (`gpxStatus`, `mapReady`)
- Quitar cuando mapa esté validado en múltiples dispositivos

### 📋 Próximas sesiones:
- Testear en varios dispositivos (Android/iOS con Play Services actualizado)
- Remover debug text de ExcursionDetailScreen
- Validar que join/leave funciona en todos los casos edge
- Mejorar UX durante carga de mapa (progress indicator, maybe?)
