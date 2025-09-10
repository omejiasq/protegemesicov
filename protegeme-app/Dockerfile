# Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: Nginx
FROM nginx:1.25-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist ./
# 👇 añade esta línea para el fallback de SPA
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]