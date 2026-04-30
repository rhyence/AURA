import { Quantum } from "ldrs/react"
import "ldrs/react/Quantum.css"

export default function Loader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50">
      
      <Quantum
        size="70"
        speed="1.75"
        color="#3b82f6"
      />

      <p className="mt-4 text-gray-600 text-sm">
        Loading Air Quality Data...
      </p>

    </div>
  )
}