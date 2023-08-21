import type { RootState } from "@store/store";

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentUserId = (state: RootState) => state.auth.user?.id || null;
export const selectCurrentUserName = (state: RootState) => state.auth.user?.name || "N/A";
export const selectBalance = (state: RootState) => state.auth.wallet?.balance || 0;
