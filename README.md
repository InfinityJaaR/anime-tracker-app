# Anime Tracker

App móvil para seguir animes sincronizada con tu cuenta de [MyAnimeList](https://myanimelist.net/).

## Qué es

Anime Tracker es un cliente Expo (React Native) que lee y escribe tus listas de anime en MyAnimeList. Puedes buscar títulos, ver detalle y, con sesión iniciada, actualizar progreso, estado y puntuación.

## Por qué

MyAnimeList es la fuente de verdad: lo que marcas en la app queda en tu lista real de MAL. Sin login puedes explorar y buscar en modo invitado; con OAuth gestionas Watching, Plan to Watch, On Hold, Completed y Dropped desde el móvil.

## Stack

- Expo SDK 54, Expo Router, React Native
- TanStack Query
- OAuth 2.0 MyAnimeList (Authorization Code + PKCE)
- APIs: MAL v2 (listas) y Tenrai API (catálogo, esquema Jikan v4; con fallback a MAL en detalle y búsqueda)
- MyMemory (traducción de la sinopsis al español bajo demanda, sin clave)

## Menú lateral (v1.2.0)

La hamburguesa de las pestañas abre un menú con: **Favoritos** (series completadas con nota 8–10 y personajes), **Anime aleatorio** (de tu Plan to Watch), **Recomendaciones** (sugerencias de MAL, con géneros excluibles), **Búsqueda avanzada**, **Temporadas de anime** y, fija abajo, **Configuración** (cuentas, apariencia, sobre nosotros). Es la versión `1.2.0`: al cambiar `expo.version` cambia el runtime de EAS Update, así que requiere un APK nuevo (`npm run build:preview:android`); los APK 1.1.0 no reciben estos cambios por OTA.

## Publicar una versión nueva del APK (aviso de descarga)

Un OTA no llega a APKs con otra `expo.version`, así que las versiones nuevas se anuncian con **GitHub Releases**: la app (y su tarea de fondo, ~cada hora) consulta la última release del repo y, si su tag es mayor que la versión instalada, muestra el banner "Versión X disponible · Descargar" y lanza una notificación que abre el APK.

1. Sube `expo.version` en `app.json` (p. ej. `1.3.0`) y haz `npm run build:preview:android`.
2. Descarga el APK del build (enlace de EAS) a `anime-tracker-1.3.0.apk`.
3. Publica la release **con tag `v` + versión** y el APK como asset:

```bash
gh release create v1.3.0 anime-tracker-1.3.0.apk --title "v1.3.0" --notes "Qué hay de nuevo"
```

El aviso solo funciona en APKs que ya traen este código (desde `1.2.0`): quien tenga una versión anterior debe instalar la `1.2.0` a mano una vez.

## Requisitos

- Node.js (recomendado LTS)
- Cuenta en [MyAnimeList API](https://myanimelist.net/apiconfig)
- Cuenta [Expo](https://expo.dev/) para generar el development build (login OAuth)

## Instalación

1. Clona el repositorio:

   ```bash
   git clone git@github.com:InfinityJaaR/anime-tracker-app.git
   cd anime-tracker-app
   ```

2. Registra una app en [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig) y configura el **App Redirect URL** exactamente así:

   ```
   animetrackerapp://redirect
   ```

3. Copia las variables de entorno y pega tu Client ID:

   ```bash
   cp .env.example .env
   ```

   En `.env`:

   ```
   EXPO_PUBLIC_MAL_CLIENT_ID=tu_client_id
   ```

4. Instala dependencias:

   ```bash
   npm install
   ```

## Cómo continuar el desarrollo

El login con MyAnimeList **no funciona en Expo Go**: hace falta un development build con el scheme `animetrackerapp`.

1. Inicia sesión en EAS:

   ```bash
   npx eas-cli login
   ```

2. Genera el APK de desarrollo (Android):

   ```bash
   npm run build:dev:android
   ```

3. Instala el APK en el dispositivo o emulador.

4. Arranca Metro con el dev client:

   ```bash
   npm run start:dev
   ```

Para explorar la UI sin OAuth (búsqueda / detalle en invitado):

```bash
npm start
```

## Distribución

### Android

El instalable es un **APK** firmado por EAS. La idea es que cada usuario lo instale **una sola vez**: los cambios de interfaz y lógica se envían después por **EAS Update (OTA)** sin repartir APKs nuevas.

#### 1. Primera instalación (una vez por dispositivo)

```bash
npm run build:preview:android
```

El enlace de descarga aparece al terminar. El APK del perfil `preview` escucha el canal `preview` de EAS Update.

#### 2. Enviar cambios por OTA (flujo habitual)

```bash
npm run update:preview -- --message "Descripción del cambio"
```

Sirve para pantallas, componentes, estilos, lógica, llamadas a API y assets. Los scripts publican solo Android (`--platform android`): sin ese flag `eas update` también exporta el bundle web, que falla por `react-native-pager-view`, y la app no se distribuye como web. Para iOS habría que publicar aparte con `--platform ios`. Al abrir la app (o volver a ella desde segundo plano) el teléfono descarga el update y muestra el aviso **"Nueva versión disponible · Reiniciar"**; al tocarlo se aplica al instante.

**Aviso con la app cerrada (desde `1.1.0`):** una tarea en segundo plano (`expo-background-task`, ver `lib/background-update-task.ts`) revisa cada ~1 h si hay un update, lo descarga y lanza una notificación local "Nueva versión disponible"; al tocarla la app abre y lo aplica. No usa push remoto, así que no necesita Firebase ni servidor. Android decide cuándo ejecuta la tarea (ahorro de batería, modo Doze), por lo que el aviso puede tardar horas. Si el usuario rechaza el permiso de notificaciones, solo queda el banner al abrir la app. En desarrollo no corre.

Cómo saber qué corre un teléfono: el pie de la pestaña **Stats** muestra `v1.2.0 · build original` (JS embebido en el APK) o `v1.2.0 · OTA a1b2c3d` (update recibido). Para revisar lo publicado: `eas update:list --branch preview`.

#### 3. Cuándo hace falta un APK nuevo

La compatibilidad entre APK y update la marca `runtimeVersion` con política `appVersion`: **el runtime es el campo `expo.version` de `app.json`**. Regla:

| Cambio | Qué hacer |
|--------|-----------|
| Solo JS/TS, estilos, assets | `npm run update:preview -- --message "..."` |
| Nueva dependencia **nativa**, actualización del SDK de Expo, cambios en `app.json` (plugins, permisos, icono, scheme) | Subir `expo.version` en `app.json` (p. ej. `1.2.0` → `1.3.0`), `npm run build:preview:android` y repartir el APK |

Si publicas un update con un runtime distinto al del APK instalado, el teléfono simplemente lo ignora. Los APKs generados **antes** de integrar `expo-updates` nunca reciben OTA: hay que reinstalar una vez.

Los updates se compilan en tu PC con `expo export`, así que leen el `.env` local; `--environment preview` además carga las variables definidas en EAS para ese entorno. El entorno `production` de EAS no tiene `EXPO_PUBLIC_MAL_CLIENT_ID`: si algún día usas `npm run update:production`, créala antes con `eas env:create`.

### iOS

El equivalente del APK es un **`.ipa`**, pero **no se reparte igual**. Apple no permite instalar un `.ipa` en cualquier iPhone: el dispositivo tiene que estar autorizado en el perfil de aprovisionamiento con el que se firmó. En la práctica esto significa que **hace falta una cuenta de Apple Developer de pago (99 USD/año)** para que alguien más pueda instalar la app.

Las vías disponibles:

| Vía | Cuenta de pago | Para quién sirve |
|-----|----------------|------------------|
| Simulador | No | Probar la app tú mismo en un Mac |
| Ad hoc (`preview`) | Sí | Hasta 100 iPhones/año, pidiendo el UDID de cada uno |
| TestFlight (`production`) | Sí | Amigos y testers, invitados por correo |

Para compartir con amigos, **TestFlight es la opción correcta**: no necesitan dar el UDID ni saber nada técnico, solo instalar la app TestFlight y aceptar la invitación.

#### Probar en el Simulador (gratis, sin cuenta de Apple)

Sirve para validar que el proyecto compila en iOS y para verlo funcionando si tienes acceso a un Mac:

```bash
npm run build:simulator:ios
eas build:run -p ios --latest   # instala el build en el Simulador
```

Los builds se compilan en las máquinas macOS de EAS, así que **no necesitas un Mac para compilar**, solo para ejecutar el Simulador.

#### Publicar en TestFlight (requiere la cuenta de pago)

1. Date de alta en el [Apple Developer Program](https://developer.apple.com/programs/).
2. En [App Store Connect](https://appstoreconnect.apple.com/), crea la app con el bundle identifier `com.infinityjaar.animetracker`.
3. Compila y sube:

   ```bash
   npm run build:production:ios
   npm run submit:ios
   ```

   EAS pedirá tu Apple ID la primera vez y se encarga solo de certificados y perfiles.

4. En App Store Connect, pestaña **TestFlight**, invita a tus amigos por correo.

El `ITSAppUsesNonExemptEncryption: false` de `app.json` evita que App Store Connect pregunte por cumplimiento de exportación en cada subida (la app solo usa HTTPS estándar).

### Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm start` | Metro (Expo) |
| `npm run start:dev` | Dev client con tunnel |
| `npm run lint` | ESLint |
| `npm run build:dev:android` | Dev client Android (APK) |
| `npm run build:preview:android` | APK de uso final (instalar una vez; canal OTA `preview`) |
| `npm run update:preview -- --message "..."` | Publica un update OTA al canal `preview` |
| `npm run update:production -- --message "..."` | Publica un update OTA al canal `production` |
| `npm run build:simulator:ios` | Build para el Simulador de iOS (sin cuenta Apple) |
| `npm run build:preview:ios` | `.ipa` ad hoc (requiere cuenta Apple) |
| `npm run build:production:ios` | `.ipa` para TestFlight / App Store |
| `npm run submit:ios` | Sube el build a App Store Connect |

## Documentación

- [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/)
- [MyAnimeList API](https://myanimelist.net/apiconfig)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
