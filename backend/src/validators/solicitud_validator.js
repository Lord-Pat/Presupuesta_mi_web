function validarSolicitud(datos) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    return { general: "El cuerpo debe ser un objeto JSON válido" };
  }

  const errores = {};
  for (const [campo, etiqueta, limite] of [
    ["cliente", "El nombre del cliente o empresa", 120],
    ["descripcion", "La descripción del proyecto", 2000]
  ]) {
    if (!Object.hasOwn(datos, campo)) {
      errores[campo] = `${etiqueta} es un campo obligatorio`;
    } else if (typeof datos[campo] !== "string") {
      errores[campo] = `${etiqueta} debe ser una cadena de texto`;
    } else if (!datos[campo].trim()) {
      errores[campo] = `${etiqueta} debe contener texto y no solo espacios`;
    } else if (datos[campo].length > limite) {
      errores[campo] = `${etiqueta} no puede superar los ${limite} caracteres`;
    }
  }
  return Object.keys(errores).length ? errores : null;
}

module.exports = validarSolicitud;
