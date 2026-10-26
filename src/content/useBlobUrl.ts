import { useEffect, useState } from 'react'
export function useBlobUrl(blob?: Blob) {
  const [url,setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) { setUrl(undefined);return }
    const value = URL.createObjectURL(blob);setUrl(value)
    return () => URL.revokeObjectURL(value)
  },[blob])
  return url
}
