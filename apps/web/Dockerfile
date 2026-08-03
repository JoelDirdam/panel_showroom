FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=https://api-panelshowroom-3c0c.up.railway.app/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm i -g serve@14
COPY --from=build /app/dist ./dist
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-8080}"]
