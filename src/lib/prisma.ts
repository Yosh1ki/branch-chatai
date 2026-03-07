import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const resolveConnectionString = () =>
  process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL ?? null

export const hasDatabaseConnectionConfig = () => resolveConnectionString() !== null

let prismaClientInstance: PrismaClient | null = null

const createPrismaClient = () => {
  const connectionString = resolveConnectionString()

  if (!connectionString) {
    throw new Error("DATABASE_URL_RUNTIME or DATABASE_URL must be set")
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

const getPrismaClient = () => {
  if (prismaClientInstance) {
    return prismaClientInstance
  }

  if (globalThis.prismaGlobal) {
    prismaClientInstance = globalThis.prismaGlobal
    return prismaClientInstance
  }

  prismaClientInstance = createPrismaClient()

  if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prismaClientInstance
  }

  return prismaClientInstance
}

declare global {
  var prismaGlobal: PrismaClient | undefined
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient()
    const value = Reflect.get(client, property, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
}) as PrismaClient

export default prisma
