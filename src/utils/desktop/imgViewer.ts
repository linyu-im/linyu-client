import type { ImgViewerItem } from '@/stores/viewer/imgViewer'
import { useImgViewerStore } from '@/stores/viewer/imgViewer'
import { createImgViewerWindow } from '@/utils/desktop/window'

export const openImgViewer = (images: ImgViewerItem[], index = 0) => {
  const imgViewerStore = useImgViewerStore()
  imgViewerStore.openViewer(images, index)
  createImgViewerWindow()
}
