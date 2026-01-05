/**
 * Nigerian States and Federal Capital Territory
 * 
 * This is the official list of states in Nigeria as recognized by the Federal Government.
 * Used for validation and dropdown inputs throughout the application.
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
 * Type for Nigerian state values
 */
export type NigerianState = typeof NIGERIAN_STATES[number];

/**
 * Check if a string is a valid Nigerian state
 */
export function isValidNigerianState(state: string): state is NigerianState {
  return NIGERIAN_STATES.includes(state as NigerianState);
}

















