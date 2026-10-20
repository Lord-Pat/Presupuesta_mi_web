
const tarifas = require("../config/tarifas");

function calcularPresupuesto(datos) {

  // Precio inicial según el tipo de web
  const base = tarifas[datos.tipo];

  // La primera página ya está incluida en el precio base
  const paginasAdicionales = (datos.paginas - 1) * tarifas.paginaAdicional;

  // Extras opcionales
  const formulario = datos.formulario ? tarifas.formulario : 0;

  const segundoIdioma = datos.segundoIdioma ? tarifas.segundoIdioma : 0;

  // Cálculo del precio final
  const total = base + paginasAdicionales + formulario + segundoIdioma;

  return {
    base,
    paginasAdicionales,
    formulario,
    segundoIdioma,
    total,
    moneda: "EUR"
  };
}

module.exports = calcularPresupuesto;
