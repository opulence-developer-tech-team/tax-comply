/**
 * Nigerian States and Federal Capital Territory
 * 
 * Backend constant for server-side validation.
 * Must match the frontend constant in src/lib/constants/nigeria.ts
 * 
 * Source: Official list from Federal Government of Nigeria
 * Last updated: 2024
 */
export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Federal Capital Territory",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

/**
 * Check if a string is a valid Nigerian state
 */
export function isValidNigerianState(state: string): boolean {
  return NIGERIAN_STATES.includes(state as any);
}

















