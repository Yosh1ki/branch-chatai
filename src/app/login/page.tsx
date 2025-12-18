import Image from "next/image";

import { signIn } from "@/auth";
import { textStyle } from "@/styles/typography";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-row">
            <div className="flex flex-[6] flex-col items-center justify-center gap-10 bg-theme-main px-6 py-12 text-main">
                <div className="space-y-5 text-center">
                    <p className="leading-none" style={textStyle("pacifico", "title")}>
                        Branch
                    </p>
                    <p
                        className="text-main-soft"
                        style={textStyle("pacifico", "login")}
                    >
                        Grow Your Ideas as You Chat
                    </p>
                </div>
                <form
                    className="text-center"
                    action={async () => {
                        "use server";
                        await signIn("google", {
                            redirectTo: "/chats",
                        });
                    }}
                >
                    <button
                        type="submit"
                        aria-label="Sign in with Google"
                        className="rounded-full transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]"
                    >
                        <Image
                            src="/icons/signin_light.svg"
                            alt=""
                            width={175}
                            height={40}
                            priority
                        />
                    </button>
                </form>
            </div>
            <div className="flex flex-[4] bg-theme-sub" aria-hidden="true" />
        </div>
    );
}
