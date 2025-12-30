import dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error(`❌ DATABASE_URL is not set. Expected to load from: }`);
    console.error("Available env vars:", Object.keys(process.env).filter(k => !k.startsWith('_')));
} else {
    console.log("✓ Environment variables loaded successfully");
    console.log(`✓ DATABASE_URL loaded: ${process.env.DATABASE_URL.substring(0, 50)}...`);
}
