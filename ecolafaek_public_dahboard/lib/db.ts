// lib/db.ts
import mysql from "serverless-mysql";

const db = mysql({
  config: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 3306,

    // Add SSL configuration
    ssl: {
      rejectUnauthorized: true,
    },
    typeCast: function (field, next) {
      if (
        field.type === "DATE" ||
        field.type === "DATETIME" ||
        field.type === "TIMESTAMP"
      ) {
        return field.string();
      }
      return next();
    },
  },
});

export default async function executeQuery<T>({
  query,
  values,
}: {
  query: string;
  values?: any[];
}): Promise<T> {
  try {
    const results = await db.query<T>(query, values);
    await db.end();
    return results;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
