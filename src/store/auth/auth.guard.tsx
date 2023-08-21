import { Outlet, useNavigate } from "react-router-dom";
import { useAppSelector } from "../hooks/store.hooks";
import { selectCurrentUserId } from "./auth.selectors";
import { useEffect } from "react";

export function AuthGuard() {
  const navigate = useNavigate();
  const userId = useAppSelector(selectCurrentUserId);

  useEffect(() => {
    if (!userId) {
      navigate("/");
    }
  }, [userId]);

  if (userId) {
    return <Outlet />;
  }
}
