const catalogo = require("../config/catalogo");

const esObjeto = (valor) => valor !== null && typeof valor === "object" && !Array.isArray(valor);
const clavesExactas = (valor, claves) => esObjeto(valor) &&
  Object.keys(valor).length === claves.length && claves.every((clave) => Object.hasOwn(valor, clave));
// Refuerzo de las instrucciones: rechazar importes y fechas/plazos explícitos.
const datosProhibidos = /[€$£¥]|\b(?:EUR|USD|euros?|dólares?|libras esterlinas)\b|\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b|\b(?:entrega|plazo)\b[^.!?\n]{0,40}\b\d+\s*(?:días?|semanas?|meses?)\b/iu;
const textoValido = (valor, limite) => typeof valor === "string" &&
  valor.trim().length > 0 && valor.length <= limite && !datosProhibidos.test(valor);

function validarPropuesta(propuesta) {
  if (!clavesExactas(propuesta, ["resumen", "serviciosPropuestos", "dudas", "necesidadesNoCubiertas"]) ||
      !textoValido(propuesta.resumen, 1500)) return "Estructura o resumen inválido";

  if (!Array.isArray(propuesta.serviciosPropuestos) ||
      propuesta.serviciosPropuestos.length > catalogo.servicios.length) return "Lista de servicios inválida";

  const ids = new Set();
  for (const servicio of propuesta.serviciosPropuestos) {
    if (!clavesExactas(servicio, ["id", "justificacion"]) ||
        !catalogo.servicios.some((actual) => actual.id === servicio.id) ||
        ids.has(servicio.id) || !textoValido(servicio.justificacion, 600)) {
      return "Servicio desconocido, duplicado o inválido";
    }
    ids.add(servicio.id);
  }
  const bases = catalogo.reglas.serviciosBase.filter((id) => ids.has(id));
  if (bases.length > 1 || (ids.size > 0 && bases.length !== 1)) return "Selección de base incompatible";

  for (const campo of ["dudas", "necesidadesNoCubiertas"]) {
    if (!Array.isArray(propuesta[campo]) || propuesta[campo].length > 20 ||
        !propuesta[campo].every((texto) => textoValido(texto, 600))) return "Lista de aclaraciones inválida";
  }
  if (!ids.size && !propuesta.dudas.length && !propuesta.necesidadesNoCubiertas.length) {
    return "La propuesta vacía requiere aclaraciones";
  }
  return null;
}

module.exports = validarPropuesta;
module.exports.textoValido = textoValido;
