import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './theme.jsx'
import { LiveDataProvider } from './context/LiveData.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LiveDataProvider>
          <App />
        </LiveDataProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
