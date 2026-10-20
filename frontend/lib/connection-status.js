export function connectionLabel({ status, error }) {
  if (status === "loading") return "Conectando"
  if (status === "success") return "Conectado"
  return error?.kind === "connection" ? "Desconectado" : "Error"
}
