import { useEffect, useState } from 'react'
import { uploadPhoto, signedUrls } from '../lib/media'
import Lightbox from './Lightbox'

// Galleria con miniature firmate, lazy loading, upload e lightbox.
// meta: { visit_id } | { capitolato_item_id } | { design_kind }
// elencoCompleto: se passato, il visore sfoglia quello invece delle sole foto
// di questa griglia — così dal cantiere si scorrono tutti i sopralluoghi.
export default function PhotoGrid({ photos, meta, onChange, addLabel = 'Aggiungi foto', canAdd = true, large = false, elencoCompleto }) {
  const [thumbs, setThumbs] = useState({})
  const [aperta, setAperta] = useState(null)   // id della foto aperta, non l'indice
  const [caricando, setCaricando] = useState(0)

  // in modalità "large" mostra la versione ad alta risoluzione (storage_path), non la miniatura
  const key = large ? 'storage_path' : 'thumb_path'
  useEffect(() => {
    if (photos.length) signedUrls(photos.map(p => p[key])).then(setThumbs)
  }, [photos, key])

  async function carica(e) {
    const files = [...e.target.files]
    e.target.value = ''
    setCaricando(files.length)
    for (const f of files) {
      try { await uploadPhoto(f, meta) }
      catch (err) { alert('Foto non caricata: ' + err.message) }
      setCaricando(v => v - 1)
    }
    onChange?.()
  }

  return (
    <>
      <div className="galleria">
        {photos.map(p => (
          <button key={p.id} className="ph" onClick={() => setAperta(p.id)} aria-label={p.caption || 'Apri foto'}>
            {thumbs[p[key]] && <img src={thumbs[p[key]]} alt={p.caption || ''} loading="lazy" />}
            {p.caption && <span className="cap">{p.caption}</span>}
          </button>
        ))}
        {meta && canAdd && (
          <label className="ph-add">
            <svg width="22" height="22" viewBox="0 0 22 22" className="glyph"><path d="M11 4v14M4 11h14" /></svg>
            {caricando ? `carico ${caricando}…` : addLabel}
            <input type="file" accept="image/*" multiple hidden onChange={carica} />
          </label>
        )}
      </div>
      {aperta != null && (() => {
        const lista = elencoCompleto?.length ? elencoCompleto : photos
        const i = lista.findIndex(x => x.id === aperta)
        return i < 0 ? null : (
          <Lightbox photos={lista} index={i} onClose={() => setAperta(null)}
            onDeleted={() => onChange?.()} />
        )
      })()}
    </>
  )
}
