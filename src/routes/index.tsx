import { LoginPage } from "@pages/Login"
import { NotFound } from "@pages/NotFound"
import { PlinkoGamePage } from "@pages/Plinko"
import { AuthGuard } from "@store/auth/auth.guard"
import { BrowserRouter, Route, Routes as Switch } from "react-router-dom"

import { Layout } from "../layout"

export function Routes() {
  return (
    <BrowserRouter>
      <Switch>
        <Route element={<Layout />}>
          <Route element={<AuthGuard />}>
            <Route path="/plinko" element={<PlinkoGamePage />} />
          </Route>
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Switch>
    </BrowserRouter>
  )
}
