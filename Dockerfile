# Build (§27)
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Templated rather than copied straight to conf.d: the official nginx image runs
# envsubst over /etc/nginx/templates at start-up, which lets the CSP name the
# deployment's Keycloak origin without rebuilding the image.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Restrict envsubst to our own variable so nginx's own $uri, $host etc. survive.
ENV NGINX_ENVSUBST_FILTER=KEYCLOAK_ORIGIN
# Overridden at run time; this default matches src/config.ts.
ENV KEYCLOAK_ORIGIN=https://auth.dspace.sparkworks.net

# Renders config.js from VITE_* environment variables at start-up, so service
# URLs are settable at run time instead of only at build time. chmod via RUN
# rather than COPY --chmod so the build does not require BuildKit.
COPY docker-entrypoint.d/40-portal-config.sh /docker-entrypoint.d/40-portal-config.sh
RUN chmod +x /docker-entrypoint.d/40-portal-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

# config.js is deliberately left writable/mountable: override it at deploy time
# to repoint service URLs without rebuilding the image, e.g.
#   -v ./config.js:/usr/share/nginx/html/config.js:ro
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
