# Erlandi Proxy Telegram Bot

Bot Telegram production-ready untuk Erlandi Proxy dengan dua area terpisah:

- **Portal pelanggan universal** melalui `/start`
- **Panel administrasi RBAC** melalui `/admin`

Repository ini dirancang agar dapat dipasang ulang pada VPS baru tanpa bergantung pada konfigurasi server lama.

## Fitur

### Portal Pelanggan

Semua pengguna Telegram dapat membuka `/start` tanpa approval admin untuk:

- Memeriksa API key apa pun melalui tombol **Cek Kuota API Key**
- Melihat status key, kuota awal, token terpakai, sisa token, persentase, dan progress bar
- Melihat masa aktif serta model/Combo yang diizinkan
- Membuka panduan penggunaan endpoint OpenAI-compatible
- Menghubungi admin layanan

API key pelanggan:

- hanya dikirim ke endpoint quota untuk verifikasi;
- tidak disimpan di SQLite;
- tidak dicatat pada audit log;
- tidak dimasukkan ke callback Telegram;
- tidak ditampilkan kembali dalam hasil;
- pesan input dihapus best-effort setelah diproses.

### Panel Administrasi

Pengguna dengan numeric Telegram ID yang telah diotorisasi dapat membuka `/admin` untuk:

- Membuat API key otomatis atau custom
- Memilih model provider dan Combo melalui inline picker
- Search, filter, pagination, pause, resume, renew, dan delete key
- Mengatur quota token, expiry, model allowlist, dan Telegram owner
- Melihat All User Quota, summary global, filter, sorting, dan quick renew
- Export laporan quota CSV tanpa plaintext API key
- Monitoring gateway, provider/model, usage, dan live request refresh
- Mengelola user dengan role `owner`, `admin`, `operator`, dan `viewer`
- Mengatur alert quota rendah, expiry dekat, dan gateway offline
- Melihat audit log dan status sistem

## Arsitektur

```text
Telegram
   │
   ▼
Erlandi Proxy Telegram Bot
   ├── Public handlers ── POST /api/quota
   │                      tanpa admin token
   │
   ├── Admin handlers ─── /api/keys, /api/providers,
   │                      /api/combos, /api/usage/*
   │                      dengan x-9r-cli-token
   │
   └── SQLite bot database
       ├── authorized users / roles
       ├── audit log
       ├── wizard sessions
       ├── alerts
       ├── Telegram key ownership
       └── renewal request metadata

Erlandi Proxy Gateway
   └── http://127.0.0.1:20128
```

Bot dan gateway sebaiknya berjalan pada VPS yang sama. Port `20128` tidak perlu dibuka khusus untuk bot karena komunikasi admin menggunakan localhost.

## Persyaratan

- Ubuntu 22.04/24.04 atau distribusi Linux dengan systemd
- Node.js 20 atau lebih baru
- npm
- Git
- Erlandi Proxy/9router aktif pada port `20128`
- Bot token dari Telegram BotFather
- Numeric Telegram user ID untuk owner
- Akses root/sudo untuk instalasi systemd

Cek versi:

```bash
node --version
npm --version
git --version
systemctl --version
```

Cek gateway:

```bash
curl http://127.0.0.1:20128/api/health
```

Respons yang diharapkan:

```json
{"ok":true}
```

## Membuat Bot Telegram

1. Buka `@BotFather` di Telegram.
2. Jalankan `/newbot`.
3. Simpan token yang diberikan.
4. Dapatkan numeric Telegram user ID owner melalui bot seperti `@userinfobot`.
5. Jangan menggunakan username sebagai authorization ID.

Contoh nilai:

```text
TELEGRAM_BOT_TOKEN=123456789:telegram-token
OWNER_TELEGRAM_ID=123456789
```

Jangan memasukkan nilai asli ke repository atau shell history yang dibagikan.

## Instalasi Source

```bash
sudo mkdir -p /opt/erlandi-proxy-telegram-bot
sudo git clone https://github.com/erlandi-main-api/erlandi-proxy-telegram-bot.git \
  /opt/erlandi-proxy-telegram-bot
cd /opt/erlandi-proxy-telegram-bot
sudo npm ci
sudo npm run build
sudo npm test
sudo npm prune --omit=dev
```

Jika VPS sangat kecil dan build kehabisan memori, build dapat dilakukan pada mesin lain dengan versi Node kompatibel, lalu direktori `dist/` dikirim ke VPS. Dependency production tetap dipasang menggunakan:

```bash
npm ci --omit=dev
```

## Mendapatkan Gateway CLI Token

Endpoint admin gateway dilindungi oleh header:

```text
x-9r-cli-token
```

Pada instalasi Linux default, gateway menyimpan material token di:

```text
/root/.9router/machine-id
/root/.9router/auth/cli-secret
```

Generate token pada VPS gateway:

```bash
sudo node <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const home = '/root/.9router';
const machineId = fs.readFileSync(`${home}/machine-id`, 'utf8').trim();
const secret = fs.readFileSync(`${home}/auth/cli-secret`, 'utf8').trim();
const token = crypto
  .createHash('sha256')
  .update(machineId + '9r-cli-auth' + secret)
  .digest('hex')
  .slice(0, 16);
process.stdout.write(token + '\n');
NODE
```

Jika gateway dijalankan dengan `HOME` atau `DATA_DIR` lain, sesuaikan direktori data tersebut.

Verifikasi token sebelum menjalankan bot:

```bash
curl http://127.0.0.1:20128/api/keys \
  -H "x-9r-cli-token: GATEWAY_CLI_TOKEN"
```

Respons harus memiliki properti `keys`, bukan `Unauthorized`.

## Konfigurasi Environment

Generate callback secret:

```bash
openssl rand -hex 32
```

Buat environment file:

```bash
sudo install -m 0600 /dev/null /etc/erlandi-proxy-telegram-bot.env
sudo nano /etc/erlandi-proxy-telegram-bot.env
```

Isi:

```dotenv
TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
OWNER_TELEGRAM_ID="YOUR_NUMERIC_TELEGRAM_ID"

GATEWAY_URL="http://127.0.0.1:20128"
PUBLIC_API_BASE_URL="https://api.example.com/v1"
SUPPORT_CONTACT="@your_support"
GATEWAY_CLI_TOKEN="YOUR_GATEWAY_CLI_TOKEN"
CALLBACK_SECRET="YOUR_RANDOM_CALLBACK_SECRET"

DATABASE_PATH="/opt/erlandi-proxy-telegram-bot/data/bot.sqlite"
LOG_LEVEL="info"
KEY_MESSAGE_TTL_SECONDS="120"
LIVE_WATCH_SECONDS="300"
```

Pastikan permission:

```bash
sudo chown root:root /etc/erlandi-proxy-telegram-bot.env
sudo chmod 0600 /etc/erlandi-proxy-telegram-bot.env
```

### Referensi Environment

| Variable | Wajib | Fungsi |
|---|---:|---|
| `TELEGRAM_BOT_TOKEN` | Ya | Token dari BotFather |
| `OWNER_TELEGRAM_ID` | Ya | Numeric Telegram ID owner |
| `GATEWAY_URL` | Ya | URL internal gateway, umumnya localhost |
| `PUBLIC_API_BASE_URL` | Ya | Base URL publik yang diberikan ke pelanggan |
| `SUPPORT_CONTACT` | Ya | Username/link/pesan kontak admin |
| `GATEWAY_CLI_TOKEN` | Ya | Token service-to-service gateway |
| `CALLBACK_SECRET` | Ya | Secret HMAC callback Telegram, minimal 24 karakter |
| `DATABASE_PATH` | Ya | Lokasi SQLite bot yang writable |
| `LOG_LEVEL` | Tidak | Level pino: `debug`, `info`, `warn`, `error` |
| `KEY_MESSAGE_TTL_SECONDS` | Tidak | TTL pesan key sensitif, minimum 30 detik |
| `LIVE_WATCH_SECONDS` | Tidak | Durasi maksimum live watch, 30–1800 detik |

Quote nilai yang mengandung spasi.

## Membuat User Service

```bash
sudo useradd \
  --system \
  --home /opt/erlandi-proxy-telegram-bot \
  --shell /usr/sbin/nologin \
  erlandi-bot

sudo mkdir -p /opt/erlandi-proxy-telegram-bot/data
sudo chown -R erlandi-bot:erlandi-bot /opt/erlandi-proxy-telegram-bot
sudo chmod 0700 /opt/erlandi-proxy-telegram-bot/data
```

Database akan dibuat otomatis saat startup. Setelah terbentuk:

```bash
sudo chmod 0600 /opt/erlandi-proxy-telegram-bot/data/bot.sqlite
sudo chown erlandi-bot:erlandi-bot \
  /opt/erlandi-proxy-telegram-bot/data/bot.sqlite
```

## Instalasi systemd

```bash
sudo install -m 0644 \
  deploy/erlandi-proxy-telegram-bot.service \
  /etc/systemd/system/erlandi-proxy-telegram-bot.service

sudo systemctl daemon-reload
sudo systemctl enable --now erlandi-proxy-telegram-bot
```

Cek status:

```bash
sudo systemctl status erlandi-proxy-telegram-bot --no-pager -l
sudo journalctl -u erlandi-proxy-telegram-bot -f
```

Log startup sukses:

```text
bot starting
bot online
```

Service berjalan sebagai user non-root `erlandi-bot`, menggunakan filesystem protection, private temporary directory, dan hanya dapat menulis ke direktori data.

## Validasi Deployment

### 1. Gateway

```bash
curl http://127.0.0.1:20128/api/health
```

### 2. Telegram Token

```bash
set -a
source /etc/erlandi-proxy-telegram-bot.env
set +a
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

### 3. Public Quota Endpoint

```bash
curl -X POST http://127.0.0.1:20128/api/quota \
  -H 'Content-Type: application/json' \
  -d '{"key":"INVALID_TEST_KEY"}'
```

Respons invalid yang normal:

```json
{"error":"API key not found"}
```

### 4. Admin Endpoint

```bash
curl http://127.0.0.1:20128/api/keys \
  -H "x-9r-cli-token: ${GATEWAY_CLI_TOKEN}"
```

### 5. Telegram UX

- User biasa menjalankan `/start` dan melihat menu publik.
- User biasa menekan **Cek Kuota API Key**, mengirim key, lalu menerima informasi lengkap.
- User biasa tidak dapat membuka `/admin`.
- Owner menjalankan `/admin` dan melihat control panel.

### 6. Permission

```bash
stat -c '%a %U:%G %n' \
  /etc/erlandi-proxy-telegram-bot.env \
  /opt/erlandi-proxy-telegram-bot/data/bot.sqlite
```

Keduanya seharusnya mode `600`.

## Commands Telegram

| Command | Fungsi |
|---|---|
| `/start` | Membuka portal pelanggan universal |
| `/admin` | Membuka panel admin untuk Telegram ID berizin |
| `/cancel` | Membatalkan proses/wizard aktif |

Commands, short description, dan full description diatur otomatis saat bot startup.

## Database

Default production database:

```text
/opt/erlandi-proxy-telegram-bot/data/bot.sqlite
```

Tabel utama:

- `users` — numeric Telegram ID, role, dan status
- `audit` — aktivitas administratif
- `sessions` — state wizard admin
- `alerts` — konfigurasi alert
- `key_owners` — hubungan key ID dan Telegram owner
- `renewal_requests` — request renewal tanpa raw API key

Owner dari `OWNER_TELEGRAM_ID` dibuat otomatis saat database pertama kali dibuka.

## Backup

### Backup Database

```bash
sudo systemctl stop erlandi-proxy-telegram-bot
sudo install -m 0600 \
  /opt/erlandi-proxy-telegram-bot/data/bot.sqlite \
  "/root/erlandi-bot-$(date +%Y%m%d-%H%M%S).sqlite"
sudo systemctl start erlandi-proxy-telegram-bot
```

### Restore Database

```bash
sudo systemctl stop erlandi-proxy-telegram-bot
sudo cp /root/BACKUP.sqlite \
  /opt/erlandi-proxy-telegram-bot/data/bot.sqlite
sudo chown erlandi-bot:erlandi-bot \
  /opt/erlandi-proxy-telegram-bot/data/bot.sqlite
sudo chmod 0600 \
  /opt/erlandi-proxy-telegram-bot/data/bot.sqlite
sudo systemctl start erlandi-proxy-telegram-bot
```

Backup environment secara terpisah ke penyimpanan rahasia. Jangan memasukkannya ke Git.

## Update Deployment

```bash
cd /opt/erlandi-proxy-telegram-bot
sudo -u erlandi-bot git pull --ff-only origin main
sudo npm ci
sudo npm run build
sudo npm test
sudo npm prune --omit=dev
sudo chown -R erlandi-bot:erlandi-bot \
  /opt/erlandi-proxy-telegram-bot
sudo systemctl restart erlandi-proxy-telegram-bot
sudo systemctl status erlandi-proxy-telegram-bot --no-pager
```

Untuk mengurangi downtime, build dan test dapat dilakukan sebelum restart.

## Rollback

Sebelum update:

```bash
cd /opt/erlandi-proxy-telegram-bot
git rev-parse HEAD
sudo cp -a dist "/root/erlandi-bot-dist-$(date +%Y%m%d-%H%M%S)"
```

Rollback source:

```bash
cd /opt/erlandi-proxy-telegram-bot
sudo -u erlandi-bot git checkout COMMIT_YANG_STABIL
sudo npm ci
sudo npm run build
sudo npm prune --omit=dev
sudo systemctl restart erlandi-proxy-telegram-bot
```

Jangan gunakan `git reset --hard` jika ada perubahan lokal yang belum diamankan.

## Troubleshooting

### Service restart loop

```bash
sudo journalctl -u erlandi-proxy-telegram-bot -n 200 --no-pager
```

Penyebab umum:

- environment variable wajib kosong;
- format environment salah karena nilai dengan spasi tidak di-quote;
- `dist/src/index.js` belum dibuild;
- `node_modules` belum terpasang;
- database directory tidak writable.

### Bot tidak merespons

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
sudo systemctl is-active erlandi-proxy-telegram-bot
sudo journalctl -u erlandi-proxy-telegram-bot -f
```

Pastikan tidak ada instance bot lain yang memakai token sama dengan long polling.

### `/admin` ditolak untuk owner

- Pastikan `OWNER_TELEGRAM_ID` adalah numeric user ID yang benar.
- Pastikan bot menggunakan database yang sama dengan `DATABASE_PATH`.
- Restart service setelah mengubah environment.

### Public quota selalu gagal

```bash
curl -X POST "${GATEWAY_URL}/api/quota" \
  -H 'Content-Type: application/json' \
  -d '{"key":"VALID_API_KEY"}'
```

Periksa apakah gateway custom memiliki endpoint `/api/quota` dan key tercatat dalam SaaS API key store.

### Admin API Unauthorized

Generate ulang CLI token dari data directory gateway, lalu perbarui `GATEWAY_CLI_TOKEN` dan restart bot.

### Out of memory saat build

Build di mesin lain lalu transfer `dist/`, atau tambah swap sementara. Runtime production hanya membutuhkan dependency production dan direktori `dist`.

## Security Checklist

- [ ] Repository tidak mengandung `.env` atau token
- [ ] Environment file mode `0600`
- [ ] Database mode `0600`
- [ ] Bot berjalan sebagai non-root
- [ ] Gateway admin hanya diakses melalui localhost/service token
- [ ] Public handler tidak mengirim `x-9r-cli-token`
- [ ] Numeric Telegram ID digunakan untuk RBAC
- [ ] `CALLBACK_SECRET` random dan unik per deployment
- [ ] Port gateway tidak diekspos tanpa reverse proxy/firewall yang sesuai
- [ ] Backup database dan environment disimpan aman
- [ ] Log diperiksa setelah update

## Development

```bash
npm ci
npm run check
npm test
npm run dev
```

Test menggunakan Node built-in test runner dan mencakup:

- RBAC
- signed callback dan long payload vault
- rate limiting
- gateway admin header
- isolasi public quota/health tanpa CLI token
- provider/model dan Combo mapping
- SQLite persistence
- renewal request tanpa raw key
- quota summary/filter/sort/CSV
- quota percentage dan progress bar

## Repository

```text
https://github.com/erlandi-main-api/erlandi-proxy-telegram-bot
```

## License

Gunakan sesuai kebijakan dan lisensi proyek Erlandi Proxy yang terkait.
