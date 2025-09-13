import { useEffect, useState } from 'react'

function FileList() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        setFiles(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading files...</div>
  if (!files.length) return <div>No files uploaded yet.</div>

  return (
    <div className="cb-file-list">
      <h3>Uploaded Files</h3>
      <ul>
        {files.map(f => (
          <li key={f.id}>
            <strong>{f.name}</strong> ({f.category})
            {f.latestVersion && (
              <span> - v{f.latestVersion.versionNumber} ({(f.latestVersion.size/1024).toFixed(1)} KB, {f.latestVersion.contentType})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default FileList
