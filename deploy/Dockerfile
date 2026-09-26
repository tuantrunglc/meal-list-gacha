# syntax=docker/dockerfile:1
# Một image chứa cả website và PocketBase (AD-11): front và back luôn cùng một tag.

# ---- 1. Build website ----
FROM node:26-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --ignore-scripts
COPY web/ ./
RUN npx vite build

# ---- 2. Tải PocketBase (kiểm checksum) ----
# TARGETARCH có khi build bằng buildx; builder cũ thì suy từ uname -m
FROM alpine:3.22 AS pocketbase
ARG PB_VERSION=0.40.4
ARG TARGETARCH
RUN apk add --no-cache curl unzip \
 && ARCH="${TARGETARCH:-}" \
 && if [ -z "$ARCH" ]; then case "$(uname -m)" in aarch64|arm64) ARCH=arm64 ;; x86_64|amd64) ARCH=amd64 ;; *) echo "Kiến trúc chưa hỗ trợ: $(uname -m)" >&2; exit 1 ;; esac; fi \
 && ZIP="pocketbase_${PB_VERSION}_linux_${ARCH}.zip" \
 && BASE="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}" \
 && curl -fsSL -o "/tmp/$ZIP" "$BASE/$ZIP" \
 && curl -fsSL -o /tmp/checksums.txt "$BASE/checksums.txt" \
 && cd /tmp && grep " $ZIP\$" checksums.txt > sum.txt && [ -s sum.txt ] && sha256sum -c sum.txt \
 && unzip -q "/tmp/$ZIP" pocketbase -d /usr/local/bin \
 && chmod +x /usr/local/bin/pocketbase

# ---- 3. Image chạy ----
FROM alpine:3.22
ARG APP_VERSION=dev
LABEL org.opencontainers.image.title="noi-than" org.opencontainers.image.version="${APP_VERSION}"
RUN apk add --no-cache ca-certificates tzdata wget \
 && adduser -D -H -u 10001 noithan \
 && mkdir -p /pb/pb_data && chown noithan /pb/pb_data
COPY --from=pocketbase /usr/local/bin/pocketbase /usr/local/bin/pocketbase
COPY --from=web /src/web/dist /pb/pb_public
COPY server/pb_migrations /pb/pb_migrations
COPY server/pb_hooks /pb/pb_hooks
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh
ENV APP_VERSION=${APP_VERSION}
USER noithan
WORKDIR /pb
EXPOSE 8090
VOLUME /pb/pb_data
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:8090/api/health >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
