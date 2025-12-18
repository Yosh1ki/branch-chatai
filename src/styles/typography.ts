import type { CSSProperties } from "react";

const pacificoFontFamily =
    "var(--font-pacifico, 'Pacifico'), 'Pacifico', cursive";

const geistSansFontFamily =
    "var(--font-geist-sans, 'Inter'), 'Inter', system-ui, -apple-system, sans-serif";

type FontName = "pacifico" | "geistSans";
type FontSizeToken = "title" | "login" | "body" | "small";

export const FONT_STYLES: Record<FontName, CSSProperties> = {
    pacifico: {
        fontFamily: pacificoFontFamily,
    },
    geistSans: {
        fontFamily: geistSansFontFamily,
    },
};

export const FONT_SIZES: Record<FontSizeToken, string> = {
    title: "var(--font-size-title)",
    login: "var(--font-size-login)",
    body: "var(--font-size-normal)",
    small: "var(--font-size-small)",
};

export const textStyle = (
    font: FontName,
    size?: FontSizeToken,
): CSSProperties => ({
    ...FONT_STYLES[font],
    ...(size ? { fontSize: FONT_SIZES[size] } : {}),
});
