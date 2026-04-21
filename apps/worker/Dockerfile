# ─── Base: pnpm kurulu Node.js ────────────────────────────────────────────────
FROM node:20-slim AS base
RUN npm i -g pnpm@9.15.0

# ─── System deps: Playwright için gerekli kütüphaneler ───────────────────────
FROM base AS playwright-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    fonts-noto-cjk fonts-noto-color-emoji \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# ─── Builder: bağımlılıkları yükle ve Playwright'ı indir ─────────────────────
FROM playwright-deps AS builder
WORKDIR /app

# Manifest dosyalarını kopyala — cache layer için (src değişince tekrar install yapma)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/config/package.json   ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json    ./packages/types/
COPY apps/worker/package.json       ./apps/worker/

RUN pnpm install --frozen-lockfile

# Chromium'u builder stage'de indir — production stage'e kopyalanacak
RUN cd apps/worker && npx playwright install chromium --with-deps

# Kaynak kodları kopyala ve build et
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

WORKDIR /app/apps/worker
RUN pnpm build 2>/dev/null || true

# ─── Production: sadece gerekli artifact'lar ─────────────────────────────────
FROM playwright-deps AS production
WORKDIR /app

# node_modules, packages, worker kaynak ve Chromium binary'si
COPY --from=builder /app/node_modules      ./node_modules
COPY --from=builder /app/packages          ./packages
COPY --from=builder /app/apps/worker       ./apps/worker
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

WORKDIR /app/apps/worker

ENV NODE_ENV=production
# Playwright ortam değişkeni — zaten kopyalandı, tekrar indirme
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

CMD ["pnpm", "start"]
