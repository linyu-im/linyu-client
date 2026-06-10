import type { ImgViewerItem } from '@/stores/imgViewer'
import { useImgViewerStore } from '@/stores/imgViewer'
import { createImgViewerWindow } from '@/utils/window'

export const openImgViewer = (images: ImgViewerItem[], index = 0) => {
  const imgViewerStore = useImgViewerStore()
  imgViewerStore.openViewer(images, index)
  createImgViewerWindow()
}
