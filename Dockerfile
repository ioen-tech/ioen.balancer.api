FROM node:14.17.5

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/app/backend

WORKDIR /usr/src/app/backend

COPY . .

WORKDIR /usr/src/app/backend/prisma
RUN npm install -g dotenv-cli

RUN npm install
RUN npm run build
RUN pwd

RUN ls -a
# COPY backend/package*.json backend/

WORKDIR /usr/src/app/backend

RUN npm install
RUN ls -a

# # ENTRYPOINT ["npm", "install"]
CMD ["npm", "run", "dev"]