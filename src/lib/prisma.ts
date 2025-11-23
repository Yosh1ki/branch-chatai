import { PrismaClient } from '@prisma/client'

const accelerateUrl = process.env.DATABASE_URL

if (!accelerateUrl) {
  throw new Error('DATABASE_URL is required for Prisma Accelerate')
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    accelerateUrl,
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
