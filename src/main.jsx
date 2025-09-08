import React from 'react'
import { createRoot } from 'react-dom/client'

// If your file is named src/App.jsx use this:
import App from './App.jsx'

// If your file is currently named src/app.jsx (lowercase), use this line instead of the one above:
// import App from './app.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
