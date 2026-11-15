const validarSolicitud = require("./solicitud_validator");
const validarPresupuesto = require("./presupuesto_validator");
const catalogo = require("../config/catalogo");
const { textoValido } = require("./propuesta_validator");

const objeto = (valor) => valor !== null && typeof valor === "object" && !Array.isArray(valor);
const texto = (valor, limite, vacio = false) => typeof valor === "string" &&
  (vacio || valor.trim().length > 0) && valor.length <= limite && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(valor);
const lista = (valor) => Array.isArray(valor) && valor.length <= 20 && valor.every((item) => texto(item, 600) && textoValido(item, 600));

function validarDatosPDF(datos) {
  if (!objeto(datos) || datos.estado !== "confirmado") return "Confirma el presupuesto antes de generar el PDF.";
  const errores = validarSolicitud(datos.solicitud);
  if (errores) return "Revisa el nombre y la descripción del cliente antes de generar el PDF.";
  if (!texto(datos.solicitud.cliente, 120) || !texto(datos.solicitud.descripcion, 2000)) return "Los datos del cliente contienen texto no válido.";
  if (!objeto(datos.propuesta) || !texto(datos.propuesta.resumen, 1500) || !textoValido(datos.propuesta.resumen, 1500) ||
      !lista(datos.propuesta.dudas) || !lista(datos.propuesta.necesidadesNoCubiertas)) return "El resumen o las aclaraciones del proyecto no son válidos.";
  const error = validarPresupuesto(datos.configuracion);
  if (error) return error;
  const ids = datos.serviciosSeleccionados;
  if (!Array.isArray(ids) || !ids.length || ids.length > catalogo.servicios.length ||
      new Set(ids).size !== ids.length || ids.some((id) => !catalogo.servicios.some((servicio) => servicio.id === id))) return "La selección contiene servicios desconocidos o duplicados.";
  const { tipo, paginas, formulario, segundoIdioma } = datos.configuracion;
  const esperados = [tipo, ...(paginas > 1 ? ["paginaAdicional"] : []), ...(formulario ? ["formulario"] : []), ...(segundoIdioma ? ["segundoIdioma"] : [])];
  if (ids.length !== esperados.length || !esperados.every((id) => ids.includes(id))) return "La selección de servicios no coincide con la base, las páginas o los extras configurados.";
  if (!Array.isArray(datos.aclaraciones) || datos.aclaraciones.length !== datos.propuesta.dudas.length ||
      datos.aclaraciones.some((item, indice) => !objeto(item) || item.pregunta !== datos.propuesta.dudas[indice] || !texto(item.respuesta, 1000, true))) return "Las respuestas a las dudas del proyecto no son válidas.";
  return null;
}

module.exports = validarDatosPDF;
