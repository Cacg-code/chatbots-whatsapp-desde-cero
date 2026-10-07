---
minutos: 45
nivel: intermedio
---
## Objetivo

Armar la propuesta económica de un bot para un negocio: calcular el precio con reglas claras y comprobar que tu margen es sano.

### Cómo se trabaja

La **parte A** es de negocio y se hace en un documento. La **parte B** son funciones de JavaScript puro. Los montos del ejercicio son **de ejemplo** (soles); los tuyos serán distintos. No es asesoría legal ni fiscal.

Un ítem de la cotización es `{ concepto: "Pruebas", horas: 10, mensual: false }`. Si `mensual` es `true`, las horas son por mes (soporte); si no, son únicas (implementación).

```pasos
Parte A. Elige un negocio real de tu entorno (sin usar sus datos) y escribe en `propuesta.md`: objetivo, qué incluye, qué no incluye, hitos, qué necesitas del cliente y quién paga a Meta.
Parte A. Calcula tu tarifa por hora: cuánto necesitas ganar al mes dividido entre tus horas facturables reales. Anota el resultado en `propuesta.md`.
Parte B. Escribe `cotizar(items, tarifaHora)`: devuelve `{ unico, descuento, mensual, primerMes }`. `unico` es la suma de horas únicas por tarifa menos el descuento; si las horas únicas suman 40 o más, el descuento es el 10 % del total único (si no, 0). `mensual` es la suma de horas mensuales por tarifa (sin descuento). `primerMes` es `unico + mensual`. Redondea todo a 2 decimales.
Parte B. Escribe `margen(precio, costos)`: devuelve `{ ganancia, porcentaje }`. `ganancia` es el precio menos la suma de costos (2 decimales); `porcentaje` es la ganancia sobre el precio, por 100, con 1 decimal. Con un precio de 0 o menos, el porcentaje es 0.
Parte B. Escribe `precioParaMargen(costos, margenDeseado)`: precio mínimo para lograr ese margen (por ejemplo `0.6` para 60 %), con 2 decimales. Si `margenDeseado` es 1 o más, lanza un `Error`.
```

```pista Separar únicas y mensuales
Recorre los ítems: si `it.mensual` suma a la cuota mensual; si no, suma a las horas únicas y al monto único. Calcula el descuento al final con `horasUnicas >= 40`.
```

```pista Margen
`ganancia / precio * 100` da el porcentaje; multiplica por 1000, redondea y divide entre 10 para dejar 1 decimal. El precio mínimo es `totalCostos / (1 - margenDeseado)`.
```

```checks
[
 {"d": "`cotizar` suma horas únicas por tarifa cuando no hay descuento", "h": "unico = horas × tarifa; con menos de 40 horas únicas no hay descuento.", "t": "var r=cotizar([{concepto:'a',horas:12}],40);return r.unico===480 && r.descuento===0 && r.mensual===0 && r.primerMes===480"},
 {"d": "`cotizar` separa las horas mensuales", "h": "Los ítems con mensual: true suman a `mensual`, no a `unico`.", "t": "var r=cotizar([{concepto:'a',horas:10},{concepto:'s',horas:3,mensual:true}],40);return r.unico===400 && r.mensual===120 && r.primerMes===520"},
 {"d": "`cotizar` aplica 10 % de descuento a 40 o más horas únicas", "h": "Con exactamente 40 horas únicas ya se aplica (>= 40).", "t": "var r=cotizar([{concepto:'a',horas:40}],10);return r.descuento===40 && r.unico===360 && r.primerMes===360"},
 {"d": "`cotizar` no aplica descuento por las horas mensuales", "h": "El umbral de 40 solo cuenta horas únicas.", "t": "var r=cotizar([{concepto:'a',horas:10},{concepto:'s',horas:35,mensual:true}],10);return r.descuento===0 && r.unico===100 && r.mensual===350"},
 {"d": "`cotizar` reproduce el ejemplo de la lección", "h": "42 h únicas a 40 = 1680, menos 10 % = 1512; 3 h mensuales = 120.", "t": "var r=cotizar([{horas:6},{horas:16},{horas:10},{horas:10},{horas:3,mensual:true}],40);return r.unico===1512 && r.descuento===168 && r.mensual===120 && r.primerMes===1632"},
 {"d": "`cotizar` redondea a 2 decimales", "h": "Aplica Math.round(x * 100) / 100 a cada resultado.", "t": "var r=cotizar([{horas:1}],33.333);return r.unico===33.33"},
 {"d": "`margen` calcula ganancia y porcentaje", "h": "ganancia = precio − suma(costos); porcentaje = ganancia / precio × 100 con 1 decimal.", "t": "var m=margen(36,[9,4.5]);return m.ganancia===22.5 && m.porcentaje===62.5"},
 {"d": "`margen` evita dividir entre cero y admite pérdidas", "h": "Si precio <= 0, el porcentaje es 0. La ganancia puede ser negativa.", "t": "var a=margen(0,[5]);var b=margen(10,[15]);return a.porcentaje===0 && a.ganancia===-5 && b.ganancia===-5 && b.porcentaje===-50"},
 {"d": "`precioParaMargen` calcula el precio mínimo y valida el margen", "h": "totalCostos / (1 - margenDeseado); lanza Error si margenDeseado >= 1.", "t": "var ok=precioParaMargen([9,4.5],0.6)===33.75 && precioParaMargen([100],0)===100;try{precioParaMargen([10],1)}catch(e){return ok && e instanceof Error}return false"}
]
```

```solucion cotizar.js
function cotizar(items, tarifaHora) {
  let horasUnicas = 0, unico = 0, mensual = 0;
  for (const it of items) {
    const monto = it.horas * tarifaHora;
    if (it.mensual) mensual += monto;
    else { horasUnicas += it.horas; unico += monto; }
  }
  const descuento = horasUnicas >= 40 ? unico * 0.1 : 0;
  const r = x => Math.round(x * 100) / 100;
  return {
    unico: r(unico - descuento),
    descuento: r(descuento),
    mensual: r(mensual),
    primerMes: r(unico - descuento + mensual),
  };
}

function margen(precio, costos) {
  const total = costos.reduce((s, c) => s + c, 0);
  const ganancia = precio - total;
  return {
    ganancia: Math.round(ganancia * 100) / 100,
    porcentaje: precio > 0 ? Math.round((ganancia / precio) * 1000) / 10 : 0,
  };
}

function precioParaMargen(costos, margenDeseado) {
  if (margenDeseado >= 1) throw new Error("El margen debe ser menor que 1");
  const total = costos.reduce((s, c) => s + c, 0);
  return Math.round((total / (1 - margenDeseado)) * 100) / 100;
}
```

> [!consejo] Reto extra
> Añade `anticipo(total, porcentaje = 0.5)` que devuelva cuánto pedir al aprobar la propuesta y cuánto queda para la entrega, como `{ anticipo, saldo }`. Pagar por hitos protege a ambas partes.
