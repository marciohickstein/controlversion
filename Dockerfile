FROM node:20
WORKDIR /usr/src/app
COPY .env ./
COPY client/ ./client/
COPY src/ ./src/
COPY package*.json server.js ./
RUN npm install 
EXPOSE 8001
CMD [ "npm", "start" ]