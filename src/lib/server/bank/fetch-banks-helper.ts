/**
 * Helper script to fetch banks from Monnify API and format them for constants.ts
 * 
 * Usage:
 * 1. Run: tsx src/lib/server/bank/fetch-banks-helper.ts
 * 2. Copy the output
 * 3. Paste into src/lib/server/bank/constants.ts replacing NIGERIAN_BANKS array
 */

import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: resolve(process.cwd(), ".env") });
}

import { bankService } from "./service";

async function fetchAndFormatBanks() {
  try {
    console.log("🔄 Fetching banks from Monnify API...\n");

    const result = await bankService.fetchBanksFromAPI();

    if (!result.success || !result.banks) {
      console.error("❌ Failed to fetch banks:", result.error);
      process.exit(1);
    }

    console.log(`✅ Successfully fetched ${result.banks.length} banks\n`);
    console.log("📋 Copy the following and paste into src/lib/server/bank/constants.ts:\n");
    console.log("=" .repeat(80));
    
    // Format as TypeScript array
    const formattedBanks = result.banks.map((bank) => {
      if (bank.nipBankCode) {
        return `  { code: "${bank.code}", name: "${bank.name}", nipBankCode: "${bank.nipBankCode}" }`;
      }
      return `  { code: "${bank.code}", name: "${bank.name}" }`;
    }).join(",\n");

    console.log("export const NIGERIAN_BANKS: BankInfo[] = [");
    console.log(formattedBanks);
    console.log("];");
    
    console.log("=" .repeat(80));
    console.log(`\n✅ Total banks: ${result.banks.length}`);
    console.log("📝 Copy the array above and replace NIGERIAN_BANKS in constants.ts");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fetchAndFormatBanks();

