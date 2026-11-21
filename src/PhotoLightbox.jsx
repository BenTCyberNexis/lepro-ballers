import { useEffect } from 'react'

export default function PhotoLightbox({ url, name, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={name + ' photo'}
      onClick={onClose}
    >
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close photo">
        ✕
      </button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={url} alt={name} />
        <figcaption>{name}</figcaption>
      </figure>
    </div>
  )
}
