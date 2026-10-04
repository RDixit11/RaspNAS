# --- dev: serwer Vite z hot reloadem ---
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# --- build: statyczne pliki produkcyjne ---
FROM dev AS build
RUN npm run build

# --- prod: nginx serwujący zbudowaną aplikację ---
FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
