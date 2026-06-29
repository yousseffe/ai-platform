FROM node:18-alpine

# Install docker CLI and Python 3 (needed by detect_schema.py)
RUN apk add --no-cache docker-cli python3 && ln -sf python3 /usr/bin/python

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "start:dev"]
