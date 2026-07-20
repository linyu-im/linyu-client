import type { VideoViewerItem } from '@/stores/viewer/videoViewer'
import { useVideoViewerStore } from '@/stores/viewer/videoViewer'
import { createVideoViewerWindow } from '@/utils/desktop/window'

export const openVideoViewer = (videos: VideoViewerItem[], index = 0) => {
  const videoViewerStore = useVideoViewerStore()
  videoViewerStore.openViewer(videos, index)
  createVideoViewerWindow()
}
