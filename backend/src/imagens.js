const sharp = require("sharp");

/** Tipos aceitos, identificados pelos primeiros bytes do arquivo (a extensão e o Content-Type do cliente não valem) */
const TIPOS = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/gif": (b) => b.length > 6 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("latin1")),
  "image/webp": (b) => b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

const detectarTipo = (buffer) => Object.keys(TIPOS).find((mime) => TIPOS[mime](buffer)) ?? null;

const LARGURA_MINIATURA = 800; // o mosaico em tela cheia usa peças grandes

class ImagemInvalida extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = "ImagemInvalida";
  }
}

/** Valida a imagem e gera: tipo real, dimensões (já considerando a rotação EXIF) e miniatura WebP */
async function processar(buffer) {
  const mime = detectarTipo(buffer);
  if (!mime) throw new ImagemInvalida("Formato não suportado. Envie JPEG, PNG, GIF ou WebP.");

  try {
    const imagem = sharp(buffer, { failOn: "error", limitInputPixels: 100_000_000 });
    const meta = await imagem.metadata();
    if (!meta.width || !meta.height) throw new Error("sem dimensões");
    const girada = meta.orientation && meta.orientation >= 5; // EXIF 5-8: largura e altura trocadas
    const miniatura = await imagem
      .rotate()
      .resize({ width: LARGURA_MINIATURA, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return {
      mime,
      width: girada ? meta.height : meta.width,
      height: girada ? meta.width : meta.height,
      miniatura,
    };
  } catch {
    throw new ImagemInvalida("O arquivo está corrompido ou não é uma imagem válida.");
  }
}

module.exports = { detectarTipo, processar, ImagemInvalida, TIPOS };
