import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireActor } from "@/server/access";
import { api } from "@/server/http";

const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "text/html"];

export async function POST(request: Request) {
  return api(async () => {
    const body = (await request.json()) as HandleUploadBody;
    return handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const actor = await requireActor("content:write");
        const safeName = pathname.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(-160);
        return {
          allowedContentTypes: allowed,
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ organizationId: actor.organizationId, safeName }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.info("blob_uploaded", { pathname: blob.pathname, payloadPresent: Boolean(tokenPayload) });
      },
    });
  });
}
