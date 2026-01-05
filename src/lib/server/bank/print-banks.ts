/**
 * Script to fetch banks from Monnify and print them in format for constants.ts
 * Run with: npm run print-banks (or node --loader tsx src/lib/server/bank/print-banks.ts)
 */

// Load environment variables from .env.local
import dotenv from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const result = dotenv.config({ path: envPath });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: resolve(process.cwd(), ".env") });
}

import { bankService } from "./service";

async function printBanks() {
  try {
    console.log("🔄 Fetching banks from Monnify API...\n");

    const result = await bankService.fetchBanksFromAPI();

    if (!result.success || !result.banks) {
      console.error("❌ Failed to fetch banks:", result.error);
      process.exit(1);
    }

    console.log(`✅ Successfully fetched ${result.banks.length} banks\n`);
    console.log("=".repeat(80));
    console.log("COPY THE FOLLOWING AND SEND IT TO POPULATE constants.ts:\n");
    console.log("=".repeat(80));
    console.log("\n");
    
    // Format as TypeScript array entries
    const formattedBanks = result.banks.map((bank) => {
      if (bank.nipBankCode) {
        return `  { code: "${bank.code}", name: "${bank.name}", nipBankCode: "${bank.nipBankCode}" }`;
      }
      return `  { code: "${bank.code}", name: "${bank.name}" }`;
    }).join(",\n");

    console.log(formattedBanks);
    
    console.log("\n");
    console.log("=".repeat(80));
    console.log(`\n✅ Total: ${result.banks.length} banks`);
    console.log("📝 Copy the array entries above (without the export line)");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

printBanks();













