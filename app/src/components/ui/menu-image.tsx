'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ImageIcon } from 'lucide-react'

interface MenuImageProps {
  imagePath?: string | null
  alt: string
  className?: string
}

export function MenuImage({ imagePath, alt, className = 'w-full h-32 object-cover rounded-lg' }: MenuImageProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePath) { setSrc(null); return }
    invoke<{ success: boolean; data?: string }>('get_menu_image', { imagePath })
      .then(res => setSrc(res.success && res.data ? res.data : null))
      .catch(() => setSrc(null))
  }, [imagePath])

  if (!src) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <ImageIcon className="w-8 h-8 text-muted-foreground" />
      </div>
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />
}
