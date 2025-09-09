# Etapa deps (solo prod deps)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Si usás package-lock.json:
RUN npm ci --omit=dev

# Etapa builder (compila TS -> dist)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Si tu build depende de variables, podés pasar ARG aquí
RUN npm run build

# Runner
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copiamos artefactos y dependencias prod
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Si usás uploads locales, aseguro carpeta
RUN mkdir -p /app/uploads
ENV UPLOAD_DIR=./uploads

# Expone el puerto (ajústalo por micro si es distinto)
# Auth: 4001, Incidents: 4002, Authorizations: 4003, Maintenance: 4004, Vehicle: 4005, Drivers: 4006
EXPOSE 4001 4002 4003 4004 4005 4006

CMD ["node", "dist/main.js"]
