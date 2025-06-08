# CookieCMS-JS

A modern, modular Minecraft CMS and launcher backend written in Node.js with PostgreSQL support.  
Supports user authentication, skin/cape management, Discord OAuth integration, permission groups, and more.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Cookie-cms/cookiecms-js.git
cd cookiecms-js
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your database, Discord, and other settings.

### 4. Run database migrations

```bash
npx knex migrate:latest
```

### 5. Start the server

```bash
npm start
```
or for development with auto-reload:
```bash
npm run dev
```

---

## Folder Structure

```
src/
  modules/         # Main business logic (auth, skins, service, etc.)
  migrations/      # Knex migration files
  logger.js        # Winston logger setup
  config.yml       # (legacy) YAML config, now use .env
  ...
uploads/
  skins/           # Uploaded skin files
  capes/           # Uploaded cape files
```

---

## Permissions System

- Permission groups are defined in the database (see migrations).
- Each user can have a group and individual permissions.
- Permissions are checked in code via helper functions.

---

## Documentation

[Documantation](https://wikicms.coffeedev.dev/)


---

## License

AGPL-3.0 License

---

## Credits

- [GravitLauncher](https://github.com/GravitLauncher)
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Winston](https://github.com/winstonjs/winston)
- [Knex.js](http://knexjs.org/)

---
