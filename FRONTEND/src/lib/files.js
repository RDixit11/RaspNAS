import { File, FileImage, FileMusic, FileSpreadsheet, FileText, FileVideo } from 'lucide-react'

const KINDS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'],
  text: ['txt', 'md', 'log', 'json', 'xml', 'yml', 'yaml', 'ini', 'conf', 'm3u', 'sh', 'py', 'js', 'html', 'css'],
  sheet: ['csv', 'tsv'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a'],
  video: ['mp4', 'webm', 'mov'],
}

const ICONS = { image: FileImage, text: FileText, sheet: FileSpreadsheet, audio: FileMusic, video: FileVideo, other: File }

export function fileKind(name = '') {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return Object.keys(KINDS).find((kind) => KINDS[kind].includes(ext)) ?? 'other'
}

export const fileIcon = (name) => ICONS[fileKind(name)]

export const joinPath = (folder, name) => `${folder === '/' ? '' : folder}/${name}`
