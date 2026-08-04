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

### Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm start` | Metro (Expo) |
| `npm run start:dev` | Dev client con tunnel |
| `npm run build:dev:android` | Build EAS development (APK) |
| `npm run lint` | ESLint |

## Documentación

- [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/)
- [MyAnimeList API](https://myanimelist.net/apiconfig)
