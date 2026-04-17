import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@serpio/database";

const connectionString = process.env.DATABASE_URL!;

// Worker için max:5 bağlantı (web'den ayrı pool)
const client = postgres(connectionString, { max: 5 });

export const db = drizzle(client, { schema });
