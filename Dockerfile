FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src

ARG VITE_APP_BASE=/
ENV VITE_APP_BASE=${VITE_APP_BASE}

RUN npm run build

FROM nginx:1.27-alpine
ENV ADMIN_API_UPSTREAM=ic-admin-api:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
