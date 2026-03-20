FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY index.html app.js styles.css ./

EXPOSE 3000

CMD ["npm", "start"]
