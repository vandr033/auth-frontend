/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const ALLOWED_SIZES = new Set([32, 180, 192, 512]);
const FALLBACK_SIZE = 192;
const PRICONPRI_ICON_ASSET_PATH = path.join(
    process.cwd(),
    "public/assets/priconpri/wordmark-stacked.webp",
);

let cachedLogoDataUrlPromise: Promise<string | null> | null = null;

function normalizeSize(rawSize: string): 32 | 180 | 192 | 512 {
    const parsedSize = Number.parseInt(rawSize, 10);
    if (ALLOWED_SIZES.has(parsedSize)) {
        return parsedSize as 32 | 180 | 192 | 512;
    }

    return FALLBACK_SIZE;
}

function detectImageMimeType(fileBytes: Buffer): "image/png" | "image/jpeg" | "image/webp" {
    if (
        fileBytes.length >= 4
        && fileBytes[0] === 0x89
        && fileBytes[1] === 0x50
        && fileBytes[2] === 0x4e
        && fileBytes[3] === 0x47
    ) {
        return "image/png";
    }

    if (
        fileBytes.length >= 3
        && fileBytes[0] === 0xff
        && fileBytes[1] === 0xd8
        && fileBytes[2] === 0xff
    ) {
        return "image/jpeg";
    }

    if (
        fileBytes.length >= 12
        && fileBytes.subarray(0, 4).toString("ascii") === "RIFF"
        && fileBytes.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
        return "image/webp";
    }

    return "image/png";
}

async function getLogoDataUrl(): Promise<string | null> {
    if (!cachedLogoDataUrlPromise) {
        cachedLogoDataUrlPromise = readFile(PRICONPRI_ICON_ASSET_PATH)
            .then((fileBytes) => {
                const mimeType = detectImageMimeType(fileBytes);
                return `data:${mimeType};base64,${fileBytes.toString("base64")}`;
            })
            .catch(() => null);
    }

    return cachedLogoDataUrlPromise;
}

export async function GET(_: Request, context: { params: Promise<{ size: string }> }) {
    const { size: rawSize } = await context.params;
    const size = normalizeSize(rawSize);
    const logoDataUrl = await getLogoDataUrl();

    const image = new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                }}
            >
                {logoDataUrl ? (
                    <img
                        src={logoDataUrl}
                        alt="PriConPri"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#e73886",
                            color: "#ffffff",
                            fontSize: Math.round(size * 0.22),
                            fontWeight: 700,
                            textTransform: "uppercase",
                        }}
                    >
                        PriConPri
                    </div>
                )}
            </div>
        ),
        {
            width: size,
            height: size,
        },
    );

    image.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return image;
}
