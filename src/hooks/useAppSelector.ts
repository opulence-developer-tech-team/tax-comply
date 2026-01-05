import { useSelector, TypedUseSelectorHook } from "react-redux";
import { RootState } from "@/store/redux";

/**
 * Typed version of useSelector hook
 * Use this instead of the plain useSelector for better TypeScript support
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
















