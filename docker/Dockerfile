FROM mcr.microsoft.com/playwright:v1.42.1-focal
WORKDIR /app

# workspace install
COPY package.json tsconfig.base.json .npmrc* ./
COPY packages/shared/package.json packages/runtime/package.json packages/sdk/package.json packages/mcp/package.json packages/cli/package.json ./packages/
RUN npm install --omit=dev

COPY . .
RUN npm run build --workspaces --if-present

EXPOSE 3030
ENV PORT=3030
CMD ["node", "packages/runtime/dist/index.js"]
