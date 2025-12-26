import Image from "next/image";

import { signIn } from "@/auth";
import { textStyle } from "@/styles/typography";

export default function LoginPage() {
    return (
        <div
            className="flex min-h-screen flex-col md:flex-row"
            style={{
                backgroundImage:
                    "radial-gradient(circle at 15% 20%, #fff7f1 0%, rgba(255,247,241,0) 55%), radial-gradient(circle at 85% 10%, #efe2dc 0%, rgba(239,226,220,0) 45%), linear-gradient(180deg, #f7f2ef 0%, #f6f1ed 100%)",
            }}
        >
            <div className="flex w-full animate-in flex-col items-center justify-center gap-10 px-6 py-16 text-main fade-in slide-in-from-left-6 duration-700 motion-reduce:animate-none md:flex-[6]">
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
            <div
                className="flex w-full animate-in items-center justify-center px-6 py-10 fade-in slide-in-from-right-6 duration-700 delay-150 motion-reduce:animate-none md:flex-[4] md:px-10 md:py-12"
                aria-hidden="true"
            >
                <div className="h-[45vh] w-full max-w-[520px] rounded-[28px] bg-theme-main md:h-full md:max-w-none" />
            </div>
        </div>
    );
}
