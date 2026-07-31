import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

// Compressione intelligente: web ~1800px / thumb 480px.
// Gli originali ad alta risoluzione restano a Mike su Mac/iCloud.
const WEB_OPTS = { maxWidthOrHeight: 2560, maxSizeMB: 2.6, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.9 }
const THUMB_OPTS = { maxWidthOrHeight: 480, maxSizeMB: 0.08, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.7 }

export async function uploadPhoto(file, meta = {}) {
  const id = crypto.randomUUID()
  const base = meta.visit_id ? `visite/${meta.visit_id}` : meta.capitolato_item_id ? 'capitolato' : 'design'
  const path = `${base}/${id}.jpg`
  const thumbPath = `${base}/${id}.thumb.jpg`

  const [web, thumb] = await Promise.all([
    imageCompression(file, WEB_OPTS),
    imageCompression(file, THUMB_OPTS)
  ])

  const up1 = await supabase.storage.from('media').upload(path, web, { contentType: 'image/jpeg' })
  if (up1.error) throw up1.error
  const up2 = await supabase.storage.from('media').upload(thumbPath, thumb, { contentType: 'image/jpeg' })
  if (up2.error) throw up2.error

  const { data, error } = await supabase.from('photos')
    .insert({ ...meta, storage_path: path, thumb_path: thumbPath })
    .select().single()
  if (error) throw error
  return data
}

const urlCache = new Map()

export async function signedUrls(paths, expires = 3600) {
  const missing = paths.filter(p => p && !urlCache.has(p))
  if (missing.length) {
    const { data, error } = await supabase.storage.from('media').createSignedUrls(missing, expires)
    if (!error && data) data.forEach(d => { if (d.signedUrl) urlCache.set(d.path, d.signedUrl) })
  }
  return Object.fromEntries(paths.filter(Boolean).map(p => [p, urlCache.get(p)]))
}

export async function signedUrl(path, bucket = 'media', expires = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires)
  if (error) throw error
  return data.signedUrl
}

export async function deletePhoto(photo) {
  await supabase.storage.from('media').remove([photo.storage_path, photo.thumb_path])
  await supabase.from('photos').delete().eq('id', photo.id)
}
