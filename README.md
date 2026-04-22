# Serpio — SEO & Content Automation

Stale içerikleri otomatik tespit et, AI ile yeniden yaz, yayınla.

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Web (frontend + API) | Next.js 14, TypeScript, Tailwind CSS |
| Worker (arka plan işler) | Node.js, BullMQ, Playwright |
| Veritabanı | PostgreSQL (Neon.tech), Drizzle ORM |
| Queue / Cache | Redis (Upstash), BullMQ |
| Auth | Auth.js v5 (Google OAuth) |
| AI | Gemini / OpenAI (geçiş yapılabilir) |
| Ödeme | Stripe |

## Monorepo Yapısı

```
serpio/
├── apps/
│   ├── web/          # Next.js — dashboard, API routes, admin panel
│   └── worker/       # BullMQ worker — scrape, AI rewrite, publish
├── packages/
│   ├── database/     # Drizzle schema + migrations
│   ├── types/        # Paylaşılan TypeScript tipleri
│   └── config/       # ESLint, TypeScript config
└── turbo.json
```

## Geliştirme Ortamı

```bash
# Bağımlılıkları yükle
pnpm install

# Ortam değişkenlerini kopyala
cp apps/web/.env.production.example apps/web/.env.local
cp apps/worker/.env.production.example apps/worker/.env

# Veritabanı migration
pnpm db:generate && pnpm db:migrate

# Tüm servisleri başlat
pnpm dev
```

## Testler

```bash
# Worker unit testleri (19 test)
pnpm --filter @serpio/worker test

# Tüm testler
pnpm test
```

## 🚀 Production Deployment

### Ön Koşullar

- [Neon.tech](https://neon.tech) hesabı (PostgreSQL)
- [Upstash](https://upstash.com) hesabı (Redis)
- [Vercel](https://vercel.com) hesabı (Web)
- [Railway](https://railway.app) hesabı (Worker)
- [Stripe](https://stripe.com) hesabı (Ödeme)

### Adımlar

**1. Neon.tech'te database oluştur**

New Project → Database URL'yi kopyala (`postgresql://...?sslmode=require`)

**2. Upstash'te Redis oluştur**

New Database → Redis URL kopyala (`rediss://...`)

**3. Migration çalıştır**

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

**4. Vercel'e deploy et**

```bash
npx vercel
```

Vercel dashboard → Settings → Environment Variables'a `apps/web/.env.production.example` içindeki değişkenleri ekle.

**5. Railway'e worker deploy et**

```bash
npm install -g @railway/cli
railway login
railway up --service=serpio-worker
```

Railway dashboard → Variables'a `apps/worker/.env.production.example` içindeki değişkenleri ekle.

**6. Stripe webhook'u kaydet**

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://serpio.app/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

**7. İlk admin kullanıcısını oluştur**

```
GET https://serpio.app/api/admin/setup?secret=ADMIN_SETUP_SECRET
```

> `ADMIN_EMAIL` ve `ADMIN_SETUP_SECRET` env değişkenlerini önceden ayarla.

### GitHub Actions Secrets

CI/CD için gerekli repository secrets:

| Secret | Açıklama |
|--------|----------|
| `VERCEL_TOKEN` | Vercel kişisel erişim token'ı |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `RAILWAY_TOKEN` | Railway API token |
| `TURBO_TOKEN` | Turbo remote cache token (opsiyonel) |
| `TURBO_TEAM` | Turbo team adı (opsiyonel) |
