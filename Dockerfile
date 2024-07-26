FROM node:20
WORKDIR /usr/src/app
COPY .env ./
COPY client/ ./client/
COPY src/ ./src/
COPY package*.json server.js ./
COPY ./install_packages.sh ./
RUN npm install 
RUN ./install_packages.sh
EXPOSE 8001
CMD [ "npm", "start" ]