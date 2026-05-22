if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set.");
} else {
  console.log("✓ Environment variables loaded successfully");
  console.log(`✓ DATABASE_URL loaded: ${process.env.DATABASE_URL.substring(0, 50)}...`);
}
