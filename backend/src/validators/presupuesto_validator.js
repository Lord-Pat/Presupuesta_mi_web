
function validarPresupuesto(datos) {
  // Comprobar que recibimos un objeto
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    return "El cuerpo debe ser un objeto JSON válido";
  }

  // Comprobar campos obligatorios
  const campos = ["tipo", "paginas", "formulario", "segundoIdioma"];

  for (const campo of campos) {
    if (!Object.hasOwn(datos, campo)) {
      return `Falta el campo obligatorio: ${campo}`;
    }
  }

  // Validar tipo de página web
  if (!["landing", "corporativa"].includes(datos.tipo)) {
    return "El tipo debe ser landing o corporativa";
  }

  // Validar número de páginas
  if (!Number.isInteger(datos.paginas) || datos.paginas < 1 || datos.paginas > 20) {
    return "El número de páginas debe ser un entero entre 1 y 20";
  }

  // Validar formulario
  if (typeof datos.formulario !== "boolean") {
    return "El campo formulario debe ser un booleano";
  }

  // Validar segundo idioma
  if (typeof datos.segundoIdioma !== "boolean") {
    return "El campo segundoIdioma debe ser un booleano";
  }

  return null;
}

module.exports = validarPresupuesto;
