import { useState } from 'react'
import AvatarPicker from './AvatarPicker'
import { uploadAvatar } from './avatar'

export default function ChangePhoto({ userId, name, currentPath, onDone, onCancel }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setError('')
    if (!file) {
      setError('Choose a photo first')
      return
    }
    setSaving(true)
    try {
      await uploadAvatar(userId, file)
      onDone()
    } catch (err) {
      setError(err.message || 'The upload failed. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h1>⚽ Lepro Ballers</h1>
      <p className="muted">Change your profile picture.</p>
      <AvatarPicker
        file={file}
        onChange={setFile}
        label="Choose a photo"
        currentPath={currentPath}
        name={name}
      />
      {error && <p className="error">{error}</p>}
      <button disabled={saving} onClick={save}>
        {saving ? 'Uploading...' : 'Save photo'}
      </button>{' '}
      <button type="button" className="small" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
