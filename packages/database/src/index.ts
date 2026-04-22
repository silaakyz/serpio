import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

export { sql, eq, and, or, desc, asc, count, sum, gte, lte, gt, lt, ne, inArray, isNull, isNotNull, ilike } from "drizzle-orm";
export type { SQL } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;

// max: 10 bağlantı — web; worker tarafı kendi client'ını max:5 ile oluşturur
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema: { ...schema, ...relations } });

export * from "./schema";
export * from "./relations";
