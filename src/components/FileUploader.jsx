import { useRef, useState } from 'react'
import { zipFile } from '../utils/zipFile'
import { API_ENDPOINTS } from '../utils/api'

function FileUploader() {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)

  const onPick = () => inputRef.current?.click()

  const uploadWithProgress = (formData, token, fileIdx, filesCount, currentFileSize) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', API_ENDPOINTS.UPLOAD)
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      xhr.upload.onprogress = (e) => {
        const perFile = e.lengthComputable && e.total > 0
          ? e.loaded / e.total
          : (currentFileSize ? e.loaded / currentFileSize : 0)
        // Compute overall progress across files (avoid hitting 100% early)
        const overall = Math.floor(((fileIdx + perFile) / filesCount) * 100)
        setProgress(overall >= 100 ? 99 : overall)
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
        else reject(new Error(`Upload failed (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Network error'))

      xhr.send(formData)
    })
  }

  const onChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setFileName(files.length === 1 ? files[0].name : `${files.length} files`)
    setIsUploading(true)
    setProgress(0)
    setCurrentIndex(0)
    setTotalFiles(files.length)

    try {
      const token = localStorage.getItem('token')
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentIndex(i + 1)
        // Compress file to zip (preserve existing logic)
        const zipped = await zipFile(file)
        const formData = new FormData()
        formData.append('file', zipped)
        formData.append('filename', zipped.name)
        formData.append('contentType', zipped.type)
        formData.append('originalContentType', file.type)
        formData.append('size', String(zipped.size))
        formData.append('category', 'research') // or get from UI
        formData.append('compress', 'zip')

        await uploadWithProgress(formData, token, i, files.length, zipped.size)
      }

      // Ensure UI shows 100% before alerting
      setProgress(100)
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))
      alert(files.length === 1 ? `Uploaded: ${files[0].name}` : `Uploaded ${files.length} files`)
    } catch (err) {
      alert('Error: ' + err.message)
    }

    setIsUploading(false)
    e.target.value = ''
  }

  return (
    <div className="cb-uploader">
      <input ref={inputRef} type="file" multiple onChange={onChange} hidden />
      <button className="cb-btn" onClick={onPick} disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Upload New File'}
      </button>
      {isUploading && (
        <div className="cb-loader" aria-label="uploading">
          <div className="cb-progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="cb-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="cb-progress-text">{progress}% ({currentIndex}/{totalFiles})</div>
        </div>
      )}
      {fileName && !isUploading && (
        <span className="cb-uploaded-name">{fileName}</span>
      )}
    </div>
  )
}

export default FileUploader
