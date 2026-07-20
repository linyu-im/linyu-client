import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeImage } from '@tauri-apps/plugin-clipboard-manager'
import type { Rect } from '@/types/screenshot'

const CAPTURE_HIDE_DELAY_MS = 100

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('failed to load image'))
    image.src = src
  })

const svgToImage = (svg: SVGSVGElement, width: number, height: number) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    const svgString = new XMLSerializer().serializeToString(clone)
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('failed to render annotations'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
  })

const canvasToPngBytes = (canvas: HTMLCanvasElement) =>
  new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('failed to encode png'))
        return
      }
      resolve(new Uint8Array(await blob.arrayBuffer()))
    }, 'image/png')
  })

export interface ExportScreenshotOptions {
  selection: Rect
  previewElement: HTMLElement
  cornerRadius: number
}

export const exportScreenshotToClipboard = async ({
  selection,
  previewElement,
  cornerRadius
}: ExportScreenshotOptions) => {
  const window = getCurrentWindow()
  const width = Math.max(1, Math.round(selection.width))
  const height = Math.max(1, Math.round(selection.height))

  await window.hide()
  await new Promise((resolve) => setTimeout(resolve, CAPTURE_HIDE_DELAY_MS))

  let screenImage: HTMLImageElement
  try {
    const base64 = await invoke<string>('capture_screen')
    screenImage = await loadImage(`data:image/png;base64,${base64}`)
  } catch (error) {
    await window.show().catch(() => undefined)
    throw error
  }

  const scale = await window.scaleFactor()
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('canvas unavailable')
  }

  ctx.scale(scale, scale)

  if (cornerRadius > 0) {
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, cornerRadius)
    ctx.clip()
  }

  const sx = Math.round(selection.x * scale)
  const sy = Math.round(selection.y * scale)
  const sw = Math.max(1, Math.round(selection.width * scale))
  const sh = Math.max(1, Math.round(selection.height * scale))

  ctx.drawImage(screenImage, sx, sy, sw, sh, 0, 0, width, height)

  const svg = previewElement.querySelector('svg')
  if (svg) {
    const overlay = await svgToImage(svg, width, height)
    ctx.drawImage(overlay, 0, 0, width, height)
  }

  const pngBytes = await canvasToPngBytes(canvas)
  await writeImage(pngBytes)
}
