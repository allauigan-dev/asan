import { useEffect, useState } from "react"

type AuthImageProps = {
  src: string
  alt: string
  className?: string
}

export function AuthImage({ src, alt, className }: AuthImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false

    fetch(src, { method: "GET", credentials: "include" })
      .then((response) => {
        if (!response.ok) return null
        return response.blob()
      })
      .then((blob) => {
        if (cancelled || !blob) return
        url = URL.createObjectURL(blob)
        setObjectUrl(url)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      setObjectUrl(null)
    }
  }, [src])

  if (!objectUrl) return null

  return <img src={objectUrl} alt={alt} className={className} />
}
