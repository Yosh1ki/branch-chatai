import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-green-600">Branches</CardTitle>
          <CardDescription>
            Grow Your Ideas as You Chat
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/conversations" })
            }}
          >
            <Button className="w-full" type="submit">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
