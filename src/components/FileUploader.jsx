import { useRef, useState } from 'react'

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
    // Simulate upload delay
    await new Promise(r => setTimeout(r, 1800))
    setIsUploading(false)
    alert(`Uploaded: ${file.name}`)
    e.target.value = ''
  }

  return (
    <div className="cb-uploader">
      <input ref={inputRef} type="file" onChange={onChange} hidden />
      <button className="cb-btn" onClick={onPick} disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Upload New File'}
      </button>
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


