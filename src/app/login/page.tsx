import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, var(--color-theme-sub), transparent 35%), radial-gradient(circle at 80% 30%, var(--color-theme-main), transparent 35%), var(--color-theme-sub)",
      }}
    >
      <Card className="w-full max-w-xl border-none bg-[var(--color-white)] text-[var(--color-main-text)] shadow-2xl shadow-[rgba(66,31,31,0.12)]">
        <CardHeader className="space-y-4">
          <CardTitle
            className="font-title text-[var(--font-size-title)] leading-tight text-[var(--color-main-text)]"
            style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive" }}
          >
            Branches
          </CardTitle>
          <CardDescription className="font-login text-[var(--font-size-login)] text-[var(--color-main-text)]">
            Grow your ideas as you chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/chats" });
            }}
          >
            <Button
              className="w-full rounded-full bg-[var(--color-red)] px-6 py-4 text-lg font-semibold text-[var(--color-white)] shadow-lg shadow-[rgba(250,69,69,0.3)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[var(--color-red)] focus-visible:ring-[var(--color-red)]"
              type="submit"
            >
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
