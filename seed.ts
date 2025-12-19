import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./shared/schema";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const db = drizzle(pool, { schema });

async function seed() {
  try {
    const { users } = schema;

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash("babli123", 10);
    const demoPasswordHash = await bcrypt.hash("demo1234", 10);

    // Create admin user
    await db.insert(users).values({
      email: "admin@tarang.dev",
      password: adminPasswordHash,
      authProvider: "email",
      firstName: "Admin",
      lastName: "User",
      emailVerified: true,
    }).onConflictDoNothing();

    // Create demo user
    await db.insert(users).values({
      email: "demo@tarang.dev",
      password: demoPasswordHash,
      authProvider: "email",
      firstName: "Demo",
      lastName: "User",
      emailVerified: true,
    }).onConflictDoNothing();

    console.log("✅ Seed data created successfully!");
    console.log("Admin: admin@tarang.dev / babli123");
    console.log("Demo: demo@tarang.dev / demo1234");
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    await pool.end();
    process.exit(1);
  }
}

seed();
