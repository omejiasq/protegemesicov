# Build (usa Node 22, compatible con Vite 7)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Si necesitás variables de build (VITE_*), pasalas con --build-arg y mapealas antes del build.
RUN npm run build

# Runtime: Nginx
FROM nginx:1.25-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist ./
# (Opcional SPA) si usás router de cliente, agregá un nginx.conf con history fallback
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
