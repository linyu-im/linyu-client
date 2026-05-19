<template>
  <n-avatar :src="src" :round="round" :size="size" fallback-src="/avatar.png" />
</template>

<script setup lang="ts">
  import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'
  import { convertFileSrc } from '@tauri-apps/api/core'
  import { appDataDir, join, BaseDirectory } from '@tauri-apps/api/path'
  import { fetch } from '@tauri-apps/plugin-http'
  import SparkMD5 from 'spark-md5'
  import { userApi } from '@/api'

  interface Props {
    id: string
    type?: string
    size?: number | 'small' | 'medium' | 'large'
    round?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'user',
    size: 'medium',
    round: false
  })

  const src = ref('')

  const getAvatarHash = (id: string) => {
    return SparkMD5.hash(id)
  }

  const getAvatarRelativeDir = (type: string) => {
    return `avatar/${type}`
  }

  const getAvatarRelativePath = (type: string, id: string) => {
    const hash = getAvatarHash(id)
    return `${getAvatarRelativeDir(type)}/${hash.slice(0, 2)}/${hash}`
  }

  const toAssetUrl = async (relativePath: string) => {
    const dir = await appDataDir()
    const absolutePath = await join(dir, relativePath)
    return convertFileSrc(absolutePath)
  }

  const loadLocalAvatar = async (type: string, id: string) => {
    try {
      const avatarPath = getAvatarRelativePath(type, id)
      const isExist = await exists(avatarPath, { baseDir: BaseDirectory.AppData })
      if (isExist) {
        return toAssetUrl(avatarPath)
      }
    } catch {
      // file or directory does not exist
    }
    return ''
  }

  const saveAvatarToLocal = async (type: string, id: string, imageData: Uint8Array) => {
    const avatarPath = getAvatarRelativePath(type, id)
    const hash = getAvatarHash(id)
    const fullDir = `${getAvatarRelativeDir(type)}/${hash.slice(0, 2)}`
    const dirExist = await exists(fullDir, { baseDir: BaseDirectory.AppData })
    if (!dirExist) {
      await mkdir(fullDir, { baseDir: BaseDirectory.AppData, recursive: true })
    }
    await writeFile(avatarPath, imageData, { baseDir: BaseDirectory.AppData })
    return toAssetUrl(avatarPath)
  }

  const downloadImage = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  const loadAvatar = () => {
    if (!props.id) return

    loadLocalAvatar(props.type, props.id).then((localUrl) => {
      if (localUrl) {
        src.value = localUrl
        return
      }

      if (props.type === 'user') {
        userApi.getUserAvatar(props.id).then((res) => {
          if (res.code === 0 && res.data) {
            downloadImage(res.data).then((imageData) => {
              saveAvatarToLocal(props.type, props.id, imageData).then((savedUrl) => {
                src.value = savedUrl
              })
            })
          }
        })
      }
    })
  }

  watch(
    () => props.id,
    () => {
      loadAvatar()
    }
  )

  onMounted(() => {
    loadAvatar()
  })
</script>
