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
- APIs: MAL v2 (listas) y Jikan v4 (catálogo, con fallback a MAL)

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

El instalable final es un **APK**. Se genera con:

```bash
npm run build:preview:android
```

EAS lo firma con el keystore del proyecto, así que cada build nuevo se instala encima del anterior sin desinstalar. El enlace de descarga aparece al terminar.

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
| `npm run build:preview:android` | APK de uso final |
| `npm run build:simulator:ios` | Build para el Simulador de iOS (sin cuenta Apple) |
| `npm run build:preview:ios` | `.ipa` ad hoc (requiere cuenta Apple) |
| `npm run build:production:ios` | `.ipa` para TestFlight / App Store |
| `npm run submit:ios` | Sube el build a App Store Connect |

## Documentación

- [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/)
- [MyAnimeList API](https://myanimelist.net/apiconfig)
