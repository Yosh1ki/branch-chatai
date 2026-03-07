export class AccountDeletionNotFoundError extends Error {
  constructor(userId: string) {
    super(`Account not found: ${userId}`)
    this.name = "AccountDeletionNotFoundError"
  }
}

export type DeleteAccountSuccessResponse = {
  success: true
  redirectTo: "/login"
}

export type DeleteAccountErrorResponse = {
  error: string
}

type SessionLike = {
  user?: {
    id?: string | null
  } | null
} | null

type AuthLike = () => Promise<SessionLike>

type DeleteAccountHandlerDependencies = {
  auth: AuthLike
  deleteAccountData: (userId: string) => Promise<void>
  isAuthDisabled: () => boolean
}

type FindUserArgs = {
  where: { id: string }
  select: { id: true }
}

type FindChatsArgs = {
  where: { userId: string }
  select: { id: true }
}

type DeleteByUserIdArgs = {
  where: { userId: string }
}

type DeleteByChatIdsArgs = {
  where: { chatId: { in: string[] } }
}

type UpdateMessagesArgs = DeleteByChatIdsArgs & {
  data: {
    parentMessageId: null
    branchId: null
  }
}

export type AccountDeletionTransactionClient = {
  user: {
    findUnique: (args: FindUserArgs) => Promise<{ id: string } | null>
    delete: (args: { where: { id: string } }) => Promise<unknown>
  }
  chat: {
    findMany: (args: FindChatsArgs) => Promise<Array<{ id: string }>>
    deleteMany: (args: DeleteByUserIdArgs) => Promise<unknown>
  }
  usageEvent: {
    deleteMany: (args: DeleteByUserIdArgs) => Promise<unknown>
  }
  usageStat: {
    deleteMany: (args: DeleteByUserIdArgs) => Promise<unknown>
  }
  session: {
    deleteMany: (args: DeleteByUserIdArgs) => Promise<unknown>
  }
  account: {
    deleteMany: (args: DeleteByUserIdArgs) => Promise<unknown>
  }
  message: {
    updateMany: (args: UpdateMessagesArgs) => Promise<unknown>
    deleteMany: (args: DeleteByChatIdsArgs) => Promise<unknown>
  }
  branch: {
    deleteMany: (args: DeleteByChatIdsArgs) => Promise<unknown>
  }
}

export type AccountDeletionClient = {
  $transaction: <T>(
    callback: (tx: AccountDeletionTransactionClient) => Promise<T>
  ) => Promise<T>
}

export async function deleteAccountData(userId: string, client: AccountDeletionClient) {
  await client.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      throw new AccountDeletionNotFoundError(userId)
    }

    const chats = await tx.chat.findMany({
      where: { userId },
      select: { id: true },
    })
    const chatIds = chats.map((chat) => chat.id)

    await tx.usageEvent.deleteMany({ where: { userId } })
    await tx.usageStat.deleteMany({ where: { userId } })
    await tx.session.deleteMany({ where: { userId } })
    await tx.account.deleteMany({ where: { userId } })

    if (chatIds.length > 0) {
      await tx.message.updateMany({
        where: { chatId: { in: chatIds } },
        data: { parentMessageId: null, branchId: null },
      })
      await tx.branch.deleteMany({
        where: { chatId: { in: chatIds } },
      })
      await tx.message.deleteMany({
        where: { chatId: { in: chatIds } },
      })
    }

    await tx.chat.deleteMany({ where: { userId } })
    await tx.user.delete({ where: { id: userId } })
  })
}

const json = (body: DeleteAccountSuccessResponse | DeleteAccountErrorResponse, init?: ResponseInit) =>
  Response.json(body, init)

export function createDeleteAccountHandler({
  auth,
  deleteAccountData,
  isAuthDisabled,
}: DeleteAccountHandlerDependencies) {
  return async function handleDeleteAccount() {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isAuthDisabled()) {
      return json(
        {
          error: "Account deletion is unavailable while AUTH_DISABLED is enabled",
        },
        { status: 409 }
      )
    }

    try {
      await deleteAccountData(userId)
      return json({ success: true, redirectTo: "/login" })
    } catch (error) {
      if (error instanceof AccountDeletionNotFoundError) {
        return json({ error: "Account not found" }, { status: 404 })
      }

      console.error("Failed to delete account:", error)
      return json({ error: "Failed to delete account" }, { status: 500 })
    }
  }
}
