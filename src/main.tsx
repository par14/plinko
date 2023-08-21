import { store } from "@store/store"
import React from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"

import { Routes } from "./routes"

import "./styles/global.css"
import "animate.css"
import "@fontsource/roboto/300.css"
import "@fontsource/roboto/400.css"
import "@fontsource/roboto/500.css"
import "@fontsource/roboto/700.css"

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Routes />
    </Provider>
  </React.StrictMode>,
)
