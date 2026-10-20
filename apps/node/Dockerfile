# syntax=docker/dockerfile:1
#
# Build from the repository root, which is the build context:
#
#   docker build -f apps/node/Dockerfile -t symbolon .
#
# docs/guides/operator.md covers running it; docs/ci.md covers how CI builds and publishes it.

ARG NODE_VERSION=24.14.1

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /repo
RUN npm install --global pnpm@11.7.0
COPY . .
# Only the Node.js server and what it depends on: no browsers, no workerd, no dashboard toolchain.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@symbolon/node..."
RUN pnpm --filter @symbolon/node run build

FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production \
    SYMBOLON_HOST=0.0.0.0 \
    SYMBOLON_PORT=3000 \
    SYMBOLON_DATABASE=/data/symbolon.db
WORKDIR /app
# The bundle is self-contained: node:sqlite is built into Node.js and everything else is bundled in.
COPY --from=build /repo/apps/node/dist/ ./
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.SYMBOLON_PORT + '/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "--enable-source-maps", "main.js"]
