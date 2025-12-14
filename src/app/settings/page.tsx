import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      planType: true,
      email: true,
      name: true,
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const usage = await prisma.usageStat.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
  })

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="mb-8">
        <Link href="/chats">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chats
          </Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan & Usage</CardTitle>
            <CardDescription>Your current plan and daily usage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Plan</span>
              <span className="font-bold uppercase bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                {user?.planType}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Daily Messages</span>
                <span>{usage?.messageCount || 0} / 10</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${Math.min(((usage?.messageCount || 0) / 10) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Resets daily at 00:00 JST.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
