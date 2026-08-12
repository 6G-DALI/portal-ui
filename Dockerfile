# Build (§27)
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# config.js is deliberately left writable/mountable: override it at deploy time
# to repoint service URLs without rebuilding the image, e.g.
#   -v ./config.js:/usr/share/nginx/html/config.js:ro
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
