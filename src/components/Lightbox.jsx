import { useEffect, useRef, useState } from 'react'
import { signedUrl, deletePhoto } from '../lib/media'
import { dataIt } from '../lib/format'

// photos: array di righe `photos`; index: quale aprire; onClose; onDeleted (opzionale)
export default function Lightbox({ photos, index, onClose, onDeleted }) {
  const [i, setI] = useState(index)
  const [url, setUrl] = useState(null)
  const touch = useRef(null)
  const photo = photos[i]

  useEffect(() => { setI(index) }, [index, photos])

  useEffect(() => {
    let vivo = true
    setUrl(null)
    if (photo) signedUrl(photo.storage_path).then(u => { if (vivo) setUrl(u) }).catch(() => {})
    return () => { vivo = false }
  }, [photo])

  useEffect(() => {
    function tasti(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prec()
      if (e.key === 'ArrowRight') succ()
    }
    addEventListener('keydown', tasti)
    return () => removeEventListener('keydown', tasti)
  })

  if (!photo) return null
  const prec = () => setI(v => (v - 1 + photos.length) % photos.length)
  const succ = () => setI(v => (v + 1) % photos.length)

  async function elimina() {
    if (!confirm('Eliminare questa foto? Non si può annullare.')) return
    await deletePhoto(photo)
    onDeleted?.(photo)
    if (photos.length <= 1) onClose()
    else setI(v => Math.min(v, photos.length - 2))
  }

  return (
    <div
      className="lightbox" role="dialog" aria-modal="true" aria-label="Foto a schermo pieno"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onTouchStart={e => { touch.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touch.current == null) return
        const dx = e.changedTouches[0].clientX - touch.current
        if (Math.abs(dx) > 50) (dx > 0 ? prec() : succ())
        touch.current = null
      }}
    >
      <button className="chiudi" onClick={onClose}>Chiudi ✕</button>
      {photos.length > 1 && <>
        <button className="freccia sx" onClick={prec} aria-label="Foto precedente">‹</button>
        <button className="freccia dx" onClick={succ} aria-label="Foto successiva">›</button>
      </>}
      <figure>
        {url
          ? <img className="big" src={url} alt={photo.caption || 'Foto del cantiere'} />
          : <div className="caricamento" style={{ color: '#D8C7AC' }}>carico la foto…</div>}
        <figcaption>
          {photo.caption || ''} {photo.created_at ? '· ' + dataIt(photo.created_at.slice(0, 10)) : ''}
          {photos.length > 1 ? ` · ${i + 1} di ${photos.length}` : ''}
        </figcaption>
      </figure>
      {onDeleted && <button className="elimina" onClick={elimina}>Elimina foto</button>}
    </div>
  )
}
