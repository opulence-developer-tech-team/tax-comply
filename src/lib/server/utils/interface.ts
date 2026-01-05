import { Types } from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import { MessageResponse, UserRole } from "./enum";
import { NextResponse } from "next/server";

export interface CustomRequest {
  userId?: Types.ObjectId;
  userRole?: UserRole;
  companyId?: Types.ObjectId;
  query?: Record<string, any>;
  params?: Record<string, any>;
  user?: any;
}

export interface CustomHttpResponse {
  status: number;
  message: MessageResponse;
  description: string;
  data: any;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
  userRole: string;
  companyId?: string;
}

export type Handler = (req: Request, context?: any) => Promise<NextResponse<any>>;

export interface IOTP {
  email: string;
  otp: string;
}

export interface IValidateEmail {
  email: string;
}

export interface IVerificationEmail extends IOTP {
  firstName: string;
  expiryTime: string;
}

export type IVerifyEmail = IOTP;

export interface IForgotPasswordEmail {
  otp: string;
  firstName: string;
  email: string;
  expiryTime: string;
}




















