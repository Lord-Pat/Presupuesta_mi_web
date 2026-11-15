const catalogo = require("./catalogo");

// Los IDs se derivan del catálogo; no existe una segunda lista de servicios.
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["resumen", "paginasDetectadas", "serviciosPropuestos", "dudas", "necesidadesNoCubiertas"],
  properties: {
    resumen: { type: "string" },
    paginasDetectadas: { type: ["integer", "null"], minimum: 1, maximum: 20 },
    serviciosPropuestos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "justificacion"],
        properties: {
          id: { type: "string", enum: catalogo.servicios.map((servicio) => servicio.id) },
          justificacion: { type: "string" }
        }
      }
    },
    dudas: { type: "array", items: { type: "string" } },
    necesidadesNoCubiertas: { type: "array", items: { type: "string" } }
  }
};
