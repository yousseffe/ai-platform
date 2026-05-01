FROM node:18-alpine

# Install docker CLI so we can interact with Docker socket
RUN apk add --no-cache docker-cli

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
