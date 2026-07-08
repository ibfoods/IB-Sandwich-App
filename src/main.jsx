import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import './index.css'

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'
ReactDOM.createRoot(document.getElementById('root')).render(isAdmin ? <Admin /> : <App />)
