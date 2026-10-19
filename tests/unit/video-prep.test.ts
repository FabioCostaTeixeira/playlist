import { describe, expect, it } from "vitest";
import {
  maxAcceptableBitrate,
  mp4FileName,
  planVideo,
  type VideoProbe,
} from "@/lib/video-prep";

const fullHd = { width: 1080, height: 1920 };
const probe = (overrides: Partial<VideoProbe>): VideoProbe => ({
  container: "video/mp4",
  videoCodec: "avc",
  ...fullHd,
  averageBitrate: 8_000_000,
  ...overrides,
});

describe("planVideo", () => {
  it("mantém MP4/H.264 de tamanho saudável", () => {
    expect(planVideo(probe({}))).toBe("keep");
  });

  it("mantém WebM como está", () => {
    expect(
      planVideo(probe({ container: "video/webm", videoCodec: "vp9" })),
    ).toBe("keep");
  });

  it("só troca o contêiner de MOV com H.264 saudável", () => {
    expect(planVideo(probe({ container: "video/quicktime" }))).toBe("remux");
  });

  it("recodifica MOV do iPhone (HEVC, 78 Mbps)", () => {
    expect(
      planVideo(
        probe({
          container: "video/quicktime",
          videoCodec: "hevc",
          averageBitrate: 78_000_000,
        }),
      ),
    ).toBe("transcode");
  });

  it("recodifica MP4 em HEVC, que nem toda tela toca", () => {
    expect(planVideo(probe({ videoCodec: "hevc" }))).toBe("transcode");
  });

  it("recodifica ProRes e codec desconhecido", () => {
    expect(planVideo(probe({ videoCodec: "prores" }))).toBe("transcode");
    expect(planVideo(probe({ videoCodec: null }))).toBe("transcode");
  });

  it("recodifica H.264 inchado, mas aceita taxa maior em 4K", () => {
    expect(planVideo(probe({ averageBitrate: 40_000_000 }))).toBe(
      "transcode",
    );
    expect(
      planVideo(
        probe({ width: 3840, height: 2160, averageBitrate: 40_000_000 }),
      ),
    ).toBe("keep");
  });
});

describe("maxAcceptableBitrate", () => {
  it("escala com a resolução", () => {
    expect(maxAcceptableBitrate(1920, 1080)).toBe(18_000_000);
    expect(maxAcceptableBitrate(3840, 2160)).toBe(72_000_000);
  });
});

describe("mp4FileName", () => {
  it("troca a extensão por .mp4", () => {
    expect(mp4FileName("IMG_1625.MOV")).toBe("IMG_1625.mp4");
    expect(mp4FileName("campanha.final.mov")).toBe("campanha.final.mp4");
    expect(mp4FileName("sem-extensao")).toBe("sem-extensao.mp4");
  });
});
