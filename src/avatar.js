import { supabase } from './supabaseClient'

export function avatarUrl(path) {
  if (!path) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try {
      const b = await createImageBitmap(file)
      return { source: b, w: b.width, h: b.height }
    } catch (_) {
      /* fall back below */
    }
  }
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await img.decode()
  return { source: img, w: img.naturalWidth, h: img.naturalHeight }
}

// Crops to a centred square and shrinks to a small JPEG (about 50 KB)
export async function compressImage(file, size = 800) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please choose an image file')
  }
  const { source, w, h } = await loadImage(file)
  const side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas
    .getContext('2d')
    .drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) throw new Error('Could not process that image')
  return blob
}

// Uploads a ready-made image, saves its location on the player, removes the old photo
export async function uploadAvatarBlob(userId, blob) {
  const path = `${userId}/${Date.now()}.jpg`
  const { data: old } = await supabase
    .from('players')
    .select('avatar_path')
    .eq('id', userId)
    .maybeSingle()
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (upErr) throw upErr
  const { error: rpcErr } = await supabase.rpc('set_my_avatar', { p: path })
  if (rpcErr) throw rpcErr
  if (old?.avatar_path) {
    await supabase.storage.from('avatars').remove([old.avatar_path])
  }
  return path
}

export async function uploadAvatar(userId, file) {
  return uploadAvatarBlob(userId, await compressImage(file))
}
