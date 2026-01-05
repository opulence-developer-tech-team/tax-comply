/**
 * Privacy Policy Configuration
 * 
 * Update this version when the privacy policy changes.
 * Users who consented to an older version will need to re-consent.
 */
export const CURRENT_PRIVACY_POLICY_VERSION = "1.0";

/**
 * Check if user needs to re-consent to privacy policy
 * 
 * @param userConsentVersion - The version the user consented to
 * @returns true if user needs to re-consent (version mismatch or no consent)
 */
export function needsPrivacyReconsent(userConsentVersion: string | null | undefined): boolean {
  if (!userConsentVersion) {
    return true; // No consent given yet
  }
  
  return userConsentVersion !== CURRENT_PRIVACY_POLICY_VERSION;
}

















