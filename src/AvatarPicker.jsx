import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'

export default function AvatarPicker({ file, onChange, label = 'Add your photo', currentPath, name }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="picker">
      <button
        type="button"
        className="picker-btn"
        aria-label={label}
        onClick={() => inputRef.current && inputRef.current.click()}
      >
        {preview ? (
          <img src={preview} alt="Your photo preview" className="picker-img" />
        ) : currentPath ? (
          <Avatar path={currentPath} name={name} size={84} />
        ) : (
          <span className="picker-empty">📷</span>
        )}
      </button>
      <div>
        <button
          type="button"
          className="small"
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          {file ? 'Choose a different photo' : label}
        </button>
        <p className="muted small-text">A clear photo of your face works best. It is cropped to a square.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onChange(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
      />
    </div>
  )
}
