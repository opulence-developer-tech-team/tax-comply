
import mongoose from "mongoose";
import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: resolve(process.cwd(), ".env") });
}

async function fixVatSummaryIndexes() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database");

    const collection = mongoose.connection.collection("vatsummaries");
    const indexes = await collection.indexes();
    
    console.log("Current indexes:", indexes.map(i => i.name));

    const indexesToDrop = [
      "companyId_1_month_1_year_1",
      "businessId_1_month_1_year_1",
      "companyId_1_year_-1",
      "businessId_1_year_-1"
    ];

    for (const indexName of indexesToDrop) {
      if (indexes.find(i => i.name === indexName)) {
        console.log(`Dropping index: ${indexName}`);
        try {
          await collection.dropIndex(indexName);
          console.log(`✅ Dropped index: ${indexName}`);
        } catch (e: any) {
          console.error(`❌ Failed to drop index ${indexName}:`, e.message);
        }
      } else {
        console.log(`ℹ️ Index ${indexName} not found, skipping.`);
      }
    }

    console.log("✅ Index cleanup complete. Please restart your application to rebuild indexes with correct options.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing indexes:", error);
    process.exit(1);
  }
}

fixVatSummaryIndexes();
