FROM node:18-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm ci

# Uygulamanın geri kalanını kopyala
COPY . .

# Uygulamayı oluştur
RUN npm run build

# Uygulamayı başlat
CMD ["npm", "run", "start"]