import { useState } from 'react'

interface Props {
  src: string | null
  alt: string
  height?: number | string
  width?: number | string
}

/** Image with skeleton background, fade-in on load and placeholder fallback. */
export function ImageTile({ src, alt, height = 96, width = '100%' }: Props) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const url = failed ? '/placeholder.png' : src
  return (
    <img
      src={url ?? undefined}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setFailed(true)
        setLoaded(true)
      }}
      style={{
        height,
        width,
        objectFit: 'cover',
        borderRadius: 6,
        display: 'block',
        marginInline: 'auto',
        backgroundColor: loaded ? 'transparent' : '#eef1ef',
        opacity: loaded ? 1 : 0.6,
        transition: 'opacity .18s ease',
      }}
    />
  )
}
