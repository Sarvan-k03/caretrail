import { ImageResponse } from "next/og";

// The logo from src/app/icon.svg, drawn without the rounded tile so it can sit on any background.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g transform="rotate(45 18.6 13.4)">
    <path d="M14.6 13 V9.6 A4 4 0 0 1 22.6 9.6 V13 Z" fill="#fffefc"/>
    <path d="M14.6 13.8 V17.2 A4 4 0 0 0 22.6 17.2 V13.8 Z" fill="#9db0f2"/>
  </g>
  <circle cx="10.6" cy="21.4" r="1.45" fill="#9db0f2"/>
  <circle cx="7.9" cy="24.1" r="1.1" fill="#9db0f2" opacity="0.75"/>
  <circle cx="5.7" cy="26.3" r="0.8" fill="#9db0f2" opacity="0.5"/>
</svg>`;
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

// Maskable icons keep the mark inside the central safe zone, since launchers crop to their own shape.
const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
  "apple-touch-icon.png": { size: 180, maskable: true },
};

export const dynamic = "force-static";
export const generateStaticParams = () => Object.keys(ICONS).map((name) => ({ name }));

export async function GET(_request: Request, ctx: RouteContext<"/icons/[name]">) {
  const icon = ICONS[(await ctx.params).name];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, maskable } = icon;
  const mark = Math.round(size * (maskable ? 0.62 : 1));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1d2f6f", borderRadius: maskable ? 0 : Math.round(size * 0.28) }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
        <img src={MARK_URI} width={mark} height={mark} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
