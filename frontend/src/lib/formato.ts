export const formatarBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
};

/** "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data, para datas mais antigas */
export const tempoRelativo = (iso: string, agora: Date = new Date()): string => {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const segundos = Math.round((agora.getTime() - data.getTime()) / 1000);
  if (segundos < 60) return "agora";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};
