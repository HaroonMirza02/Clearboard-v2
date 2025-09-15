import { useRef, useState } from 'react'
import { zipFile } from '../utils/zipFile'

function FileUploader() {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileName, setFileName] = useState('')

  const onPick = () => inputRef.current?.click()

  const onChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setIsUploading(true)
    try {
      // Compress file to zip
      const zipped = await zipFile(file)
      // Prepare form data
      const formData = new FormData()
      formData.append('file', zipped)
      formData.append('filename', zipped.name)
      formData.append('contentType', zipped.type)
      formData.append('size', zipped.size)
      formData.append('category', 'research') // or get from UI
      formData.append('compress', 'zip')
      // Send to backend
      const token = localStorage.getItem('token');
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error('Upload failed')
      alert('Uploaded: ' + zipped.name)
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setIsUploading(false)
    e.target.value = ''
  }

  return (
    <div className="cb-uploader">
      <input ref={inputRef} type="file" onChange={onChange} hidden />
      {/* <button className="cb-btn" onClick={onPick} disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Upload New File'}
      </button> */}
      {isUploading && (
        <div className="cb-loader" aria-label="uploading" />
      )}
      {fileName && !isUploading && (
        <span className="cb-uploaded-name">{fileName}</span>
      )}
    </div>
  )
}

export default FileUploader


