FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
