import axios from 'axios';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { register } from 'register-service-worker';

import App from './App';
import './i18n';
import reportWebVitals from './reportWebVitals';

// Bootstrap: precompiled CSS + JS bundle. We consume the prebuilt CSS so Bootstrap's own
// hyperweaver.scss re-applies the brand theme + app
// styles on top via CSS-variable overrides. Bootstrap CSS must load BEFORE it so our overrides win.
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './hyperweaver.scss';
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/brands.css';
import '@fortawesome/fontawesome-free/css/regular.css';
import '@fortawesome/fontawesome-free/css/solid.css';

axios.defaults.withCredentials = true;

console.log(`${__APP_NAME__ || 'Hyperweaver'} ${__APP_VERSION__ || '1.0.0'}`);

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  register('/ui/sw.js', {
    registrationOptions: { scope: '/ui/' },
    ready(registration) {
      console.log('Service worker is active.', registration.scope);
    },
    registered(registration) {
      console.log('Service worker has been registered.', registration.scope);
    },
    cached(registration) {
      console.log('Content has been cached for offline use.', registration.scope);
    },
    updatefound(registration) {
      console.log('New content is downloading.', registration.installing);
    },
    updated(registration) {
      console.log('New content is available; please refresh.', registration.waiting);
    },
    offline() {
      console.log('No internet connection found. App is running in offline mode.');
    },
    error(error) {
      console.error('Error during service worker registration:', error);
    },
  });
}

// CRITICAL, CRITICAL, CRITICAL, DO NOT EVER FUCKING REMOVE THIS!
// React.StrictMode is ESSENTIAL for proper React development
// It helps catch bugs early and enforces best practices
// DO NOT REMOVE IT EVEN IF IT CAUSES TERMINAL ISSUES
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// CRITICAL, CRITICAL, CRITICAL, DO NOT EVER FUCKING REMOVE THIS!

reportWebVitals();
