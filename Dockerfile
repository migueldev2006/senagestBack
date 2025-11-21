# Lightweight node image
FROM node:22.17.0-alpine3.21
WORKDIR /app/
# Install app dependencies
COPY package*.json .
RUN npm install
# Bundle app source
EXPOSE 3000
COPY . .
# Build
RUN npx prisma generate
RUN npm run build
# Run the app in production mode
CMD ["npm","run","start:prod"]