import test from "node:test"
import assert from "node:assert/strict"

import {
  AccountDeletionNotFoundError,
  createDeleteAccountHandler,
  deleteAccountData,
} from "../src/lib/account-deletion.ts"

test("deleteAccountData removes related records for a user inside a transaction", async () => {
  const calls = []

  const tx = {
    user: {
      findUnique: async (args) => {
        calls.push(["user.findUnique", args])
        return { id: "user-1" }
      },
      delete: async (args) => {
        calls.push(["user.delete", args])
        return { id: "user-1" }
      },
    },
    chat: {
      findMany: async (args) => {
        calls.push(["chat.findMany", args])
        return [{ id: "chat-1" }, { id: "chat-2" }]
      },
      deleteMany: async (args) => {
        calls.push(["chat.deleteMany", args])
        return { count: 2 }
      },
    },
    usageEvent: {
      deleteMany: async (args) => {
        calls.push(["usageEvent.deleteMany", args])
        return { count: 3 }
      },
    },
    usageStat: {
      deleteMany: async (args) => {
        calls.push(["usageStat.deleteMany", args])
        return { count: 1 }
      },
    },
    session: {
      deleteMany: async (args) => {
        calls.push(["session.deleteMany", args])
        return { count: 1 }
      },
    },
    account: {
      deleteMany: async (args) => {
        calls.push(["account.deleteMany", args])
        return { count: 1 }
      },
    },
    message: {
      updateMany: async (args) => {
        calls.push(["message.updateMany", args])
        return { count: 4 }
      },
      deleteMany: async (args) => {
        calls.push(["message.deleteMany", args])
        return { count: 4 }
      },
    },
    branch: {
      deleteMany: async (args) => {
        calls.push(["branch.deleteMany", args])
        return { count: 2 }
      },
    },
  }

  const client = {
    $transaction: async (callback) => callback(tx),
  }

  await deleteAccountData("user-1", client)

  assert.deepEqual(calls, [
    ["user.findUnique", { where: { id: "user-1" }, select: { id: true } }],
    ["chat.findMany", { where: { userId: "user-1" }, select: { id: true } }],
    ["usageEvent.deleteMany", { where: { userId: "user-1" } }],
    ["usageStat.deleteMany", { where: { userId: "user-1" } }],
    ["session.deleteMany", { where: { userId: "user-1" } }],
    ["account.deleteMany", { where: { userId: "user-1" } }],
    [
      "message.updateMany",
      {
        where: { chatId: { in: ["chat-1", "chat-2"] } },
        data: { parentMessageId: null, branchId: null },
      },
    ],
    ["branch.deleteMany", { where: { chatId: { in: ["chat-1", "chat-2"] } } }],
    ["message.deleteMany", { where: { chatId: { in: ["chat-1", "chat-2"] } } }],
    ["chat.deleteMany", { where: { userId: "user-1" } }],
    ["user.delete", { where: { id: "user-1" } }],
  ])
})

test("deleteAccountData throws AccountDeletionNotFoundError when user is missing", async () => {
  const client = {
    $transaction: async (callback) =>
      callback({
        user: {
          findUnique: async () => null,
        },
      }),
  }

  await assert.rejects(() => deleteAccountData("missing-user", client), AccountDeletionNotFoundError)
})

test("createDeleteAccountHandler returns 401 for unauthenticated users", async () => {
  const handler = createDeleteAccountHandler({
    auth: async () => null,
    deleteAccountData: async () => {
      throw new Error("should not be called")
    },
    isAuthDisabled: () => false,
  })

  const response = await handler()

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: "Unauthorized" })
})

test("createDeleteAccountHandler returns 409 when AUTH_DISABLED is enabled", async () => {
  const handler = createDeleteAccountHandler({
    auth: async () => ({ user: { id: "user-1" } }),
    deleteAccountData: async () => {
      throw new Error("should not be called")
    },
    isAuthDisabled: () => true,
  })

  const response = await handler()

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    error: "Account deletion is unavailable while AUTH_DISABLED is enabled",
  })
})

test("createDeleteAccountHandler returns a login redirect payload after successful deletion", async () => {
  const deletedUsers = []
  const handler = createDeleteAccountHandler({
    auth: async () => ({ user: { id: "user-1" } }),
    deleteAccountData: async (userId) => {
      deletedUsers.push(userId)
    },
    isAuthDisabled: () => false,
  })

  const response = await handler()

  assert.deepEqual(deletedUsers, ["user-1"])
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, redirectTo: "/login" })
})

test("createDeleteAccountHandler returns 404 when the target user no longer exists", async () => {
  const handler = createDeleteAccountHandler({
    auth: async () => ({ user: { id: "missing-user" } }),
    deleteAccountData: async () => {
      throw new AccountDeletionNotFoundError("missing-user")
    },
    isAuthDisabled: () => false,
  })

  const response = await handler()

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Account not found" })
})

test("createDeleteAccountHandler returns 500 when account deletion fails unexpectedly", async () => {
  const handler = createDeleteAccountHandler({
    auth: async () => ({ user: { id: "user-1" } }),
    deleteAccountData: async () => {
      throw new Error("database unavailable")
    },
    isAuthDisabled: () => false,
  })

  const originalConsoleError = console.error
  console.error = () => {}

  try {
    const response = await handler()

    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { error: "Failed to delete account" })
  } finally {
    console.error = originalConsoleError
  }
})
