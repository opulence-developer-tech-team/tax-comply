import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/redux";

/**
 * Typed version of useDispatch hook
 * Use this instead of the plain useDispatch for better TypeScript support
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
















