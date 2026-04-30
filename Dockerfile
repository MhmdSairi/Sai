FROM node:slim

WORKDIR /app
COPY . .
RUN npm install

ARG PORT
EXPOSE ${PORT:-3000}

# CMD ["npm", "run", "start"]
CMD ["sh", "-c", "npm run start & tail -f /dev/null"]
