FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Docker CLI isn't needed — we talk to the daemon via the mounted socket
# using dockerode, but openssl is required by Prisma's query engine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 4000

# `db push` syncs the schema without requiring pre-generated migration files —
# convenient for first boot. Once you're iterating on the schema long-term,
# switch this to `prisma migrate deploy` backed by committed migrations
# (see README -> "Moving to migrations").
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
