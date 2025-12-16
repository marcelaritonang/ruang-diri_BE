# Ruang Diri Backend

A NestJS-based backend for Ruang Diri. Below is a quick overview of the project’s structure and setup.

## Project Structure

```
ruang-diri_be/
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── main.ts
│   ├── common/
│   ├── config/
│   └── modules/
├── package.json
├── tsconfig.json
└── README.md
```

### Modules

- **auth**
- **clients**
- **employees**
- **landing**
- **mailer**
- **organizations**
- **partners**
- **psychologists**
- **students**
- **testimonials**
- **users**

## Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**

   ```bash
   # Example
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=ruang_diri_db
   JWT_SECRET=your_jwt_secret
   ```

3. **Run in Development**
   ```bash
   npm run start:dev
   ```

## Scripts

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `npm run start`     | Start the server in production     |
| `npm run start:dev` | Start the server in watch mode     |
| `npm run build`     | Compile TypeScript into JavaScript |
| `npm run test`      | Run unit tests (if configured)     |

## Contributing

- Fork or clone the repository.
- Create a feature branch.
- Commit and push your changes.
- Submit a pull request.

## License

This project is owned by **PT. Wong Makmur Sejati** and is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
