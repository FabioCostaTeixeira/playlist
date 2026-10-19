/**
 * Preparação de vídeo no navegador antes do upload.
 *
 * Vídeos de celular (iPhone grava .MOV em HEVC) e de agência chegam pesados e
 * em formatos que o player nem sempre toca. Aqui o navegador de quem sobe
 * converte para MP4/H.264 via WebCodecs (biblioteca mediabunny, carregada só
 * quando necessário), mantendo a resolução. O servidor segue aceitando apenas
 * MP4/WebM, então nada intocável chega às telas.
 */

/** Taxa de referência (bits/s) para 1080p em H.264 com qualidade "muito alta". */
const REFERENCE_BITRATE_1080P = 12_000_000;
/** Acima de quanto da referência o arquivo é considerado inchado e é recodificado. */
const BLOAT_FACTOR = 1.5;

export type VideoProbe = {
  /** MIME do contêiner detectado (ex.: video/mp4, video/quicktime). */
  container: string;
  /** Codec de vídeo detectado (ex.: avc, hevc, vp9, prores). */
  videoCodec: string | null;
  width: number;
  height: number;
  /** Taxa média do arquivo em bits/s. */
  averageBitrate: number;
};

/** Teto aceitável de taxa para a resolução, acima disso o arquivo é recodificado. */
export function maxAcceptableBitrate(width: number, height: number) {
  const pixels = Math.max(width * height, 1);
  return REFERENCE_BITRATE_1080P * (pixels / (1920 * 1080)) * BLOAT_FACTOR;
}

export type VideoPlan = "keep" | "remux" | "transcode";

/**
 * Decide o que fazer com o arquivo:
 * - keep: MP4/H.264 de tamanho saudável, ou WebM — sobe como está;
 * - remux: H.264 saudável em outro contêiner (ex.: .MOV) — só troca o envelope, sem perda;
 * - transcode: qualquer outro codec ou taxa exagerada — recodifica para H.264.
 */
export function planVideo(probe: VideoProbe): VideoPlan {
  if (probe.container === "video/webm") return "keep";
  const healthy =
    probe.videoCodec === "avc" &&
    probe.averageBitrate <= maxAcceptableBitrate(probe.width, probe.height);
  if (!healthy) return "transcode";
  return probe.container === "video/mp4" ? "keep" : "remux";
}

export class VideoPrepError extends Error {}

export function mp4FileName(name: string) {
  const base = name.replace(/\.[^./\\]+$/, "") || "video";
  return `${base}.mp4`;
}

/**
 * Devolve o arquivo pronto para upload. `onProgress` recebe 0–1 enquanto a
 * conversão roda (não é chamado quando o arquivo sobe como está).
 */
export async function prepareVideoForUpload(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<File> {
  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    Quality,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    if (!(await input.canRead()))
      throw new VideoPrepError(
        "Formato de vídeo não reconhecido. Use MP4, MOV ou WebM.",
      );
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new VideoPrepError("O arquivo não contém faixa de vídeo.");
    const duration = await input.computeDuration();
    const plan = planVideo({
      container: (await input.getFormat()).mimeType,
      videoCodec: track.codec,
      width: track.displayWidth,
      height: track.displayHeight,
      averageBitrate: duration > 0 ? (file.size * 8) / duration : Infinity,
    });
    if (plan === "keep") return file;

    if (plan === "transcode" && !(await track.canDecode()))
      throw new VideoPrepError(
        "Este computador não consegue ler o formato deste vídeo para convertê-lo. " +
          "Tente pelo Chrome ou Edge atualizados, ou converta para MP4 antes de enviar.",
      );

    const target = new BufferTarget();
    const conversion = await Conversion.init({
      input,
      output: new Output({
        format: new Mp4OutputFormat({ fastStart: "in-memory" }),
        target,
      }),
      tracks: "primary",
      video: {
        codec: "avc",
        quality: new Quality({ quality: "very-high", preferBitrate: true }),
        forceTranscode: plan === "transcode",
      },
      // O player toca vídeos sempre mudos (autoplay); áudio só pesaria o arquivo.
      audio: { discard: true },
      showWarnings: false,
    });
    if (!conversion.isValid)
      throw new VideoPrepError(
        "O navegador não conseguiu converter este vídeo para MP4. " +
          "Tente pelo Chrome ou Edge atualizados, ou converta para MP4 antes de enviar.",
      );
    conversion.onProgress = (progress) => onProgress?.(progress);
    await conversion.execute();
    if (!target.buffer) throw new VideoPrepError("A conversão não gerou arquivo.");
    return new File([target.buffer], mp4FileName(file.name), {
      type: "video/mp4",
    });
  } finally {
    input.dispose();
  }
}
