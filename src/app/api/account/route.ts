import { auth } from "@/auth"
import {
  createDeleteAccountHandler,
  deleteAccountData,
} from "@/lib/account-deletion"
import prisma from "@/lib/prisma"

export const DELETE = createDeleteAccountHandler({
  auth,
  deleteAccountData: (userId) => deleteAccountData(userId, prisma),
  isAuthDisabled: () => process.env.AUTH_DISABLED === "true",
})
