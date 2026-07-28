import { readFile, rename, writeFile } from 'node:fs/promises'

import type { Course, Registration } from '../../shared/types/domain'

export interface DatabaseFile {
  courses: Course[]
  registrations: Registration[]
}

export interface JsonFileOperations {
  readFile(filePath: string, encoding: BufferEncoding): Promise<string>
  writeFile(filePath: string, content: string, encoding: BufferEncoding): Promise<void>
  rename(from: string, to: string): Promise<void>
}

export interface JsonDatabase {
  read(): Promise<DatabaseFile>
  write(database: DatabaseFile): Promise<void>
}

const nodeFileOperations: JsonFileOperations = { readFile, writeFile, rename }
const writeQueues = new Map<string, Promise<void>>()
let tempFileSequence = 0

export function createJsonDatabase(
  dataFile: string,
  fileOperations: JsonFileOperations = nodeFileOperations,
): JsonDatabase {
  return {
    read: async (): Promise<DatabaseFile> => {
      const content = await fileOperations.readFile(dataFile, 'utf8')
      return parseDatabase(content)
    },
    write: async (database: DatabaseFile): Promise<void> => {
      const content = JSON.stringify(database, null, 2)
      const tempFile = `${dataFile}.${process.pid}.${tempFileSequence++}.tmp`
      const writeOperation = async (): Promise<void> => {
        await fileOperations.writeFile(tempFile, content, 'utf8')
        await fileOperations.rename(tempFile, dataFile)
      }

      const writeQueue = writeQueues.get(dataFile) ?? Promise.resolve()
      const save = writeQueue.then(writeOperation, writeOperation)
      const nextWriteQueue = save.catch(() => undefined)
      writeQueues.set(dataFile, nextWriteQueue)
      void nextWriteQueue.finally(() => {
        if (writeQueues.get(dataFile) === nextWriteQueue) {
          writeQueues.delete(dataFile)
        }
      })
      await save
    },
  }
}

function parseDatabase(content: string): DatabaseFile {
  const database: unknown = JSON.parse(content)

  if (!database || typeof database !== 'object') {
    throw new Error('Invalid JSON database')
  }

  const value = database as Partial<DatabaseFile>
  if (!Array.isArray(value.courses) || !Array.isArray(value.registrations)) {
    throw new Error('Invalid JSON database')
  }

  return { courses: value.courses, registrations: value.registrations }
}
