import { promises as fs } from 'fs'
import path from 'path'

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'tires')

export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function saveTireImage(
  file: File,
  tireId: string,
  fileName: string
): Promise<{ filePath: string; fileName: string }> {
  await ensureUploadDir()

  const extension = path.extname(fileName)
  const timestamp = Date.now()
  const uniqueFileName = `${tireId}_${timestamp}${extension}`
  const filePath = path.join(UPLOAD_DIR, uniqueFileName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return {
    filePath,
    fileName: uniqueFileName
  }
}

export function getImageUrl(fileName: string): string {
  return `/api/uploads/${fileName}`
}
