import { expect, test } from 'vitest'

import type { Registration } from '../../shared/types/domain'
import { createRegistration } from '../../server/domain/registrations'
import type { DatabaseFile, JsonFileOperations } from '../../server/repositories/json-database'
import { createJsonDatabase, type JsonDatabase } from '../../server/repositories/json-database'

const database: DatabaseFile = {
  courses: [
    {
      id: 'course-1',
      date: '2026-08-01',
      startTime: '09:00',
      endTime: '11:00',
      isOpen: true,
    },
  ],
  registrations: [],
}

test('test_read_when_database_file_contains_valid_json_then_returns_database_data', async () => {
  // Arrange
  const stub_fileOperations: JsonFileOperations = {
    readFile: async () => JSON.stringify(database),
    writeFile: async () => undefined,
    rename: async () => undefined,
  }
  const jsonDatabase = createJsonDatabase('/tmp/ski-db.json', stub_fileOperations)

  // Act
  const loadedDatabase = await jsonDatabase.read()

  // Assert
  expect(loadedDatabase).toEqual(database)
})

test('test_write_when_database_is_saved_then_writes_temp_file_before_renaming_it', async () => {
  // Arrange
  const operationLog: string[] = []
  const stub_fileOperations: JsonFileOperations = {
    readFile: async () => JSON.stringify(database),
    writeFile: async (filePath) => {
      operationLog.push(`write:${filePath}`)
    },
    rename: async (from, to) => {
      operationLog.push(`rename:${from}:${to}`)
    },
  }
  const jsonDatabase = createJsonDatabase('/tmp/ski-db.json', stub_fileOperations)

  // Act
  await jsonDatabase.write(database)

  // Assert
  expect(operationLog).toHaveLength(2)
  expect(operationLog[0]).toMatch(/^write:\/tmp\/ski-db\.json\.\d+(\.\d+)?\.tmp$/)
  expect(operationLog[1]).toBe(`${operationLog[0].replace('write:', 'rename:')}:/tmp/ski-db.json`)
})

test('test_write_when_two_database_instances_overlap_then_serializes_file_operations', async () => {
  // Arrange
  const operationLog: string[] = []
  let releaseFirstWrite: (() => void) | undefined
  const firstWriteFinished = new Promise<void>(resolve => {
    releaseFirstWrite = resolve
  })
  let writeCount = 0
  const stub_fileOperations: JsonFileOperations = {
    readFile: async () => JSON.stringify(database),
    writeFile: async () => {
      writeCount += 1
      operationLog.push(`write:${writeCount}`)
      if (writeCount === 1) {
        await firstWriteFinished
      }
    },
    rename: async () => {
      operationLog.push(`rename:${writeCount}`)
    },
  }
  const firstJsonDatabase = createJsonDatabase('/tmp/ski-db.json', stub_fileOperations)
  const secondJsonDatabase = createJsonDatabase('/tmp/ski-db.json', stub_fileOperations)

  // Act
  const firstSave = firstJsonDatabase.write(database)
  const secondSave = secondJsonDatabase.write(database)
  await Promise.resolve()
  const operationsBeforeRelease = [...operationLog]
  releaseFirstWrite?.()
  await Promise.all([firstSave, secondSave])

  // Assert
  expect(operationsBeforeRelease).toEqual(['write:1'])
  expect(operationLog).toEqual(['write:1', 'rename:1', 'write:2', 'rename:2'])
})

test('test_mutate_when_duplicate_registrations_run_concurrently_then_allows_one_and_rejects_one', async () => {
  // Arrange
  const stub_fileOperations = createInMemoryFileOperations(database)
  const firstJsonDatabase = createJsonDatabase('/tmp/ski-mutate-duplicate.json', stub_fileOperations)
  const secondJsonDatabase = createJsonDatabase('/tmp/ski-mutate-duplicate.json', stub_fileOperations)

  // Act
  const results = await Promise.allSettled([
    registerStudent(firstJsonDatabase, '0912345678'),
    registerStudent(secondJsonDatabase, '0912345678'),
  ])

  // Assert
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
  expect(await firstJsonDatabase.read()).toMatchObject({
    registrations: [
      { id: 'course-1:0912345678', phone: '0912345678' },
    ],
  })
  const rejectedResult = results.find(result => result.status === 'rejected') as PromiseRejectedResult
  expect(rejectedResult.reason).toBeInstanceOf(Error)
  expect(rejectedResult.reason.message).toBe('Student is already registered for this course')
})

test('test_mutate_when_unrelated_registrations_run_concurrently_then_preserves_both_updates', async () => {
  // Arrange
  const stub_fileOperations = createInMemoryFileOperations(database)
  const firstJsonDatabase = createJsonDatabase('/tmp/ski-mutate-unrelated.json', stub_fileOperations)
  const secondJsonDatabase = createJsonDatabase('/tmp/ski-mutate-unrelated.json', stub_fileOperations)

  // Act
  await Promise.all([
    registerStudent(firstJsonDatabase, '0912345678'),
    registerStudent(secondJsonDatabase, '0987654321'),
  ])
  const savedDatabase = await firstJsonDatabase.read()

  // Assert
  expect(savedDatabase.registrations).toEqual([
    expect.objectContaining({ id: 'course-1:0912345678' }),
    expect.objectContaining({ id: 'course-1:0987654321' }),
  ])
})

function createInMemoryFileOperations(initialDatabase: DatabaseFile): JsonFileOperations {
  let savedContent = JSON.stringify(initialDatabase)
  const temporaryFiles = new Map<string, string>()

  return {
    readFile: async () => savedContent,
    writeFile: async (filePath, content) => {
      temporaryFiles.set(filePath, content)
    },
    rename: async (from) => {
      savedContent = temporaryFiles.get(from) ?? ''
    },
  }
}

async function registerStudent(jsonDatabase: JsonDatabase, phone: string): Promise<Registration> {
  return jsonDatabase.mutate(currentDatabase => {
    const registration = createRegistration(
      currentDatabase.courses[0],
      phone,
      currentDatabase.registrations,
      '2026-07-28T10:00:00.000Z',
    )

    return {
      database: {
        ...currentDatabase,
        registrations: [...currentDatabase.registrations, registration],
      },
      result: registration,
    }
  })
}
