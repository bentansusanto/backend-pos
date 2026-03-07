import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
dotenv.config();

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

AppDataSource.initialize()
  .then(async () => {
    console.log("Dropping schema...");
    await AppDataSource.dropDatabase();
    console.log("Schema dropped successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
    process.exit(1);
  });
