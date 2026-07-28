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
  mutate<Result>(mutation: DatabaseMutation<Result>): Promise<Result>
}

export type DatabaseMutation<Result> = (
  database: DatabaseFile,
) => DatabaseMutationResult<Result> | Promise<DatabaseMutationResult<Result>>

export interface DatabaseMutationResult<Result> {
  database: DatabaseFile
  result: Result
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
      await serializeDatabaseOperation(dataFile, async () => {
        await writeDatabase(fileOperations, tempFile, dataFile, content)
      })
    },
    mutate: async <Result>(mutation: DatabaseMutation<Result>): Promise<Result> => {
      return serializeDatabaseOperation(dataFile, async () => {
        const content = await fileOperations.readFile(dataFile, 'utf8')
        const currentDatabase = parseDatabase(content)
        const updatedDatabase = await mutation(currentDatabase)
        const updatedContent = JSON.stringify(updatedDatabase.database, null, 2)
        const tempFile = `${dataFile}.${process.pid}.${tempFileSequence++}.tmp`

        await writeDatabase(fileOperations, tempFile, dataFile, updatedContent)
        return updatedDatabase.result
      })
    },
  }
}

async function serializeDatabaseOperation<Result>(
  dataFile: string,
  operation: () => Promise<Result>,
): Promise<Result> {
  const writeQueue = writeQueues.get(dataFile) ?? Promise.resolve()
  const result = writeQueue.then(operation, operation)
  const nextWriteQueue = result.then(() => undefined, () => undefined)
  writeQueues.set(dataFile, nextWriteQueue)
  void nextWriteQueue.finally(() => {
    if (writeQueues.get(dataFile) === nextWriteQueue) {
      writeQueues.delete(dataFile)
    }
  })

  return result
}

async function writeDatabase(
  fileOperations: JsonFileOperations,
  tempFile: string,
  dataFile: string,
  content: string,
): Promise<void> {
  await fileOperations.writeFile(tempFile, content, 'utf8')
  await fileOperations.rename(tempFile, dataFile)
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
