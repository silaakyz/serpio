FROM node:20-slim AS base
RUN npm i -g pnpm@9.15.0

# Playwright sistem bağımlılıkları (Debian/slim tabanlı)
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    fonts-noto-cjk fonts-noto-color-emoji \
    ca-certificates curl wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Monorepo manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/config/package.json  ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json   ./packages/types/
COPY apps/worker/package.json      ./apps/worker/

RUN pnpm install --frozen-lockfile

# Playwright Chromium indir
RUN cd apps/worker && npx playwright install chromium

# Kaynak kodları kopyala
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

WORKDIR /app/apps/worker

ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

CMD ["pnpm", "start"]
