import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fuentes self-hosted (subset latino): cero peticiones externas en runtime.
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';

import './index.css';
import App from './App';
import { requestPersistentStorage } from './store/systemStore';

// Pedir almacenamiento persistente cuanto antes (el resultado se ve en Ajustes).
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
