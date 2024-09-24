import { useState } from 'react'
import './App.css'
import SkateParkMap from './component/SkateParkMap'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <SkateParkMap />
        
    </>
  )
}

export default App
