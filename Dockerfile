# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# LogiCycle — image production (SPA statique servie par nginx)
# Usage principal : Netlify. Cette image sert de fallback self-hosted / K8s
# ou de preview locale reproductible.
# -----------------------------------------------------------------------------

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build-args injectés au build (jamais de secrets serveur ici)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_VAPID_KEY
ARG VITE_NOLIO_CLIENT_ID
ARG VITE_SENTRY_DSN
ARG VITE_GPS_WEBHOOK_URL

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY \
    VITE_NOLIO_CLIENT_ID=$VITE_NOLIO_CLIENT_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_GPS_WEBHOOK_URL=$VITE_GPS_WEBHOOK_URL

RUN npm run build

FROM nginx:1.27-alpine AS runtime
LABEL org.opencontainers.image.title="logicyle-web" \
      org.opencontainers.image.description="LogiCycle SPA (nginx)"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Healthcheck pour orchestrateurs
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
