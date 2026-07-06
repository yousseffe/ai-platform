# Stage 1: Base image with system dependencies
FROM node:22-alpine AS base
WORKDIR /usr/src/app

# Install docker CLI, Python 3, and precompiled libraries with apk cache mount
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --update docker-cli python3 py3-joblib py3-scikit-learn && \
    ln -sf python3 /usr/bin/python

# Stage 2: Development environment (all dependencies, including devDependencies)
FROM base AS dev
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Stage 3: Builder stage to compile TypeScript
FROM dev AS builder
RUN npm run build

# Stage 4: Production runtime environment (slim)
FROM base AS production
ENV NODE_ENV=production
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
