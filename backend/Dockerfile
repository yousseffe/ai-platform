FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files and install node modules first (using BuildKit cache mount and npm ci for speed)
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Install docker CLI, Python 3, and precompiled libraries with apk cache mount
RUN --mount=type=cache,target=/var/cache/apk \
    apk add docker-cli python3 py3-joblib py3-scikit-learn && \
    ln -sf python3 /usr/bin/python

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
