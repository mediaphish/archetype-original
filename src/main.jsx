import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./styles/index.css";
import App from "./App.jsx";
import FloatingArchyButton from "./components/FloatingArchyButton.jsx";
import {
  ArchyCompanionProvider,
  ArchySlideContainer,
} from "./contexts/ArchyCompanionContext.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <ArchyCompanionProvider>
        <ArchySlideContainer>
          <App />
        </ArchySlideContainer>
        <FloatingArchyButton />
      </ArchyCompanionProvider>
    </HelmetProvider>
  </React.StrictMode>
);
