import { signIn } from "@/auth";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-row">
            <div className="flex flex-[6] flex-col items-center justify-center gap-10 bg-[#cbeec6] px-6 py-12 text-[#4b2418]">
                <div className="space-y-5 text-center">
                    <p
                        className="text-6xl leading-none"
                        style={{
                            fontFamily:
                                "var(--font-pacifico, 'Pacifico'), cursive",
                        }}
                    >
                        Branch
                    </p>
                    <p
                        className="text-2xl text-[#4b2418cc]"
                        style={{
                            fontFamily:
                                "var(--font-pacifico, 'Pacifico'), cursive",
                        }}
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
                        className="group inline-flex items-center gap-4 rounded-full border border-[#dcdcdc] bg-white px-6 py-3 text-lg font-semibold text-[#4d4d4d] shadow-[0_12px_30px_rgba(60,60,60,0.18)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b7da82]"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
                            <svg
                                viewBox="0 0 533.5 544.3"
                                aria-hidden="true"
                                className="h-5 w-5"
                            >
                                <path
                                    d="M533.5 278.4c0-17.4-1.4-34.1-4-50.4H272v95.4h146.9c-6.4 34.6-25.8 63.9-55 83.5v69.2h88.7c52-47.9 81.9-118.6 81.9-197.7z"
                                    fill="#4285f4"
                                />
                                <path
                                    d="M272 544.3c74.7 0 137.6-24.8 183.5-67.2l-88.7-69.2c-24.6 16.5-56.2 26-94.8 26-72.9 0-134.6-49.2-156.7-115.3H23.8v72.4C69.3 486.5 162.3 544.3 272 544.3z"
                                    fill="#34a853"
                                />
                                <path
                                    d="M115.3 318.6c-10.4-30.8-10.4-64 0-94.7V151.5H23.8c-44.7 89.1-44.7 194.7 0 283.8l91.5-72.4z"
                                    fill="#fbbc04"
                                />
                                <path
                                    d="M272 107.7c39.6-.6 77.6 15 105.8 43.5l79-79C408.5 24.5 349.4-.4 272 0 162.3 0 69.3 57.8 23.8 151.5l91.5 72.4C137.4 156.9 199.1 107.7 272 107.7z"
                                    fill="#ea4335"
                                />
                            </svg>
                        </span>
                        Sign in with Google
                    </button>
                </form>
            </div>
            <div className="flex flex-[4] bg-[#e6f6b5]" aria-hidden="true" />
        </div>
    );
}
