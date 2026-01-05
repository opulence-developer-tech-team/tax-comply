import { Types } from "mongoose";

export interface IAdmin {
  _id?: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLogin?: Date | null;
  permissions?: string[]; // For future role-based admin access
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAdminSignIn {
  email: string;
  password: string;
}

export interface IAdminCreate {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  permissions?: string[];
}











