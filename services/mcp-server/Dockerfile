# Build stage
FROM node:22-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=build /usr/src/app/dist ./dist
USER node
EXPOSE 3030
CMD ["node", "dist/index.js"]
