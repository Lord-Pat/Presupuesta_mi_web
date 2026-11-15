const tarifas = require("./tarifas");

// Metadatos serializables: el cálculo real pertenece a presupuesto_service.js.
const catalogo = {
  moneda: "EUR",
  reglas: {
    serviciosBase: ["landing", "corporativa"],
    seleccionBase: "exactamenteUno",
    paginasIncluidasEnBase: 1
  },
  servicios: [
    {
      id: "landing",
      nombre: "Landing page",
      descripcion: "Página para presentar un producto, servicio o idea. El precio base incluye la primera página.",
      categoria: "base",
      precio: { tipo: "fijo", importe: tarifas.landing }
    },
    {
      id: "corporativa",
      nombre: "Web corporativa",
      descripcion: "Sitio para presentar una empresa y sus servicios. El precio base incluye la primera página.",
      categoria: "base",
      precio: { tipo: "fijo", importe: tarifas.corporativa }
    },
    {
      id: "paginaAdicional",
      nombre: "Página adicional",
      descripcion: "Página de contenido adicional a la primera página incluida en el servicio base.",
      categoria: "complemento",
      precio: {
        tipo: "porCantidad",
        importe: tarifas.paginaAdicional,
        unidad: "paginaAdicional",
        campoCantidad: "paginas",
        reglaCantidad: "Número total de páginas menos la primera página incluida en el precio base.",
        reglaCalculo: "(paginas - 1) * importe"
      }
    },
    {
      id: "formulario",
      nombre: "Formulario de contacto",
      descripcion: "Formulario para que los visitantes puedan escribir al responsable de la web.",
      categoria: "extra",
      opcional: true,
      precio: { tipo: "fijo", importe: tarifas.formulario }
    },
    {
      id: "segundoIdioma",
      nombre: "Segundo idioma",
      descripcion: "Presentación del contenido de la web en un segundo idioma. No incluye traducciones profesionales.",
      categoria: "extra",
      opcional: true,
      precio: { tipo: "fijo", importe: tarifas.segundoIdioma }
    }
  ]
};

module.exports = catalogo;
