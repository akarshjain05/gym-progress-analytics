# Build Stage
FROM node:18-alpine as build
WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install

# Build the React app
COPY . .
# When building for production inside docker, we need to ensure the env vars are passed in
# but for a static build, VITE_API_URL must be injected at build time. 
# We'll default to relative paths or the user can set it in docker-compose.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve Stage
FROM nginx:alpine
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
