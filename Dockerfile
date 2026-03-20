# Stage 1: build
FROM node:20-alpine AS builder
ARG VITE_PB_URL=https://pb.thedigitalvitamins.com
ENV VITE_PB_URL=$VITE_PB_URL
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: serve
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "dist", "-l", "3000"]
