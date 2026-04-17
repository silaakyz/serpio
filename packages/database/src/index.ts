import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

const connectionString = process.env.DATABASE_URL!;

// max: 10 bağlantı — web; worker tarafı kendi client'ını max:5 ile oluşturur
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema: { ...schema, ...relations } });

export * from "./schema";
export * from "./relations";
