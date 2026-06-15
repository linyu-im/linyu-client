import type { VideoViewerItem } from '@/stores/videoViewer'
import { useVideoViewerStore } from '@/stores/videoViewer'
import { createVideoViewerWindow } from '@/utils/window'

export const openVideoViewer = (videos: VideoViewerItem[], index = 0) => {
  const videoViewerStore = useVideoViewerStore()
  videoViewerStore.openViewer(videos, index)
  createVideoViewerWindow()
}
