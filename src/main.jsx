import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Counter from './Counter.jsx'
import './index.css'

const path = window.location.pathname.replace(/\/+$/, '')
let root
if (path === '/admin') root = <Admin />
else if (path === '/counter') root = <Counter />
else root = <App />

ReactDOM.createRoot(document.getElementById('root')).render(root)
