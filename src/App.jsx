import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  
  // This runs once when the components load
  useEffect(() => {
    // Define the function
    async function fetchApplications() {
      try {
        const res = await fetch("http://localhost:5000/api/data");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setApplications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("An error has occured", err);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    }

    // Call the function
    fetchApplications();
  }, []);


  return (
    <div>
      <h1>Internship Applications</h1>

      {loading ? (
        <p>Loading…</p>
      ) : applications.length > 0 ? (
        <table>
          <thead>
            <tr>
              {Object.keys(applications[0]).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applications.map((app, idx) => (
              <tr key={app.id ?? idx}>
                {Object.keys(applications[0]).map((key) => (
                  <td key={key}>{String(app[key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No applications found.</p>
      )}
    </div>
  )
}

export default App
