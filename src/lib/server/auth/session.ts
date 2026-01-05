import { utils } from "../utils";
import { Types } from "mongoose";
import { UserRole } from "../utils/enum";

export interface ServerSession {
  userId: Types.ObjectId;
  userRole: UserRole;
  companyId?: Types.ObjectId;
}

/**
 * Get the current server session from the authentication token
 * @returns ServerSession if authenticated, null otherwise
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const authResult = await utils.verifyUserAuth();

  if (!authResult.valid || !authResult.userId) {
    return null;
  }

  return {
    userId: authResult.userId,
    userRole: authResult.userRole!,
    companyId: authResult.companyId,
  };
}















