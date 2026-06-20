'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface UpiQrProps {
  amount: number
  upiId: string
  name: string
  note?: string
  size?: number
}

export function UpiQr({ amount, upiId, name, note, size = 200 }: UpiQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ''}`
    QRCode.toCanvas(canvasRef.current, upiUrl, { width: size, margin: 2 }).catch(console.error)
  }, [amount, upiId, name, note, size])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} />
      <p className="text-xs text-muted-foreground text-center">Scan with any UPI app<br />{upiId}</p>
    </div>
  )
}
