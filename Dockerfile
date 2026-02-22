FROM mcr.microsoft.com/playwright:v1.42.1-focal
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY . .
RUN npm run build
EXPOSE 3030
ENV PORT=3030
CMD ["node", "dist/index.js"]
