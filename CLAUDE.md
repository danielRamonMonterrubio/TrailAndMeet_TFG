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
    AppNavigation.tsx      -> Stack único; AuthStack vs AppStack según session. RootStackParamList aquí.
  screens/                 -> Welcome, Login, RegisterStep1, RegisterStep2, ExcursionList, CreateExcursion, ExcursionDetail
  components/
    buttons/               -> AuthButton, PrimaryButton
    cards/                 -> ExcursionCard, FeatureItem
    form/                  -> FormCard, FormInput, FormSelect, FilePickerInput, DatePickerInput, TimePickerInput, SlotsInput
    headers/               -> BrandHeader
  context/
    AuthContext.tsx        -> Sesión persistida en AsyncStorage + sincronizada con supabase.auth
  services/
    supabaseClient.ts      -> createClient con AsyncStorage como storage
    authService.ts         -> checkEmail/Username, login, logout, completeRegistration (todos vía Edge Functions)
    excursionService.ts, excursionDetailService.ts, excursionCreationService.ts, excursionStorageService.ts, gpxParserService.ts
    mappers/excursionMapper.ts
  models/Excursion.ts      -> Tipos ExcursionDifficulty, ExcursionType, interfaz Excursion
  types/
    AppFile.ts             -> Tipo para archivos seleccionados (name, base64, ...)
    database.types.ts      -> Tipos generados de Supabase
  theme/
    colors.ts              -> Paleta centralizada (primaryGradientStart/End, textPrimary/Secondary/Muted, etc.)
    styles.ts              -> `shared` StyleSheet con container, content, header, headerTitle, headerSubtitle, screenTitle, sectionTitle, card, label, input, passwordRow, errorText, primaryButton, primaryButtonText, iconCircle, row
backend/
  supabase/functions/      -> auth-check-email, auth-check-username, auth-complete-registration, auth-login, auth-logout, create-excursion-with-gpx, download-gpx, get-filtered-excursions, parse-and-create-excursion
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

- Login, registro (2 pasos), listar excursiones con filtros, crear excursión con GPX, detalle de excursión con mapa: funcionando.
- Pendiente: funcionalidad de "Unirse a excursión" (botón hace Alert placeholder en `ExcursionDetailScreen`).
- Logs y debug text temporales en `ExcursionDetailScreen` (`gpxStatus`, `mapReady`, console.log con emoji) — quitar cuando el mapa esté validado en varios dispositivos.

## Memoria persistente

Hay un sistema de memoria del agente en `~/.claude/projects/.../memory/` con preferencias del usuario y feedback acumulado. Consultarlo cuando aparezca contexto relevante de conversaciones anteriores.
