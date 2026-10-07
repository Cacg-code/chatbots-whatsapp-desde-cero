# Formato de los archivos de contenido

Cada lección es `contenido/NN-slug.md`; su ejercicio (opcional pero recomendado) es `contenido/NN-slug.ej.md`.
Después se ejecuta `python scripts/construir.py` (genera el HTML) y `python scripts/revisar.py --arreglar`.
Los slugs válidos están en `contenido/curso.json`. **No toques** los HTML generados ni `curso.json` sin avisar.

## Lección (`NN-slug.md`)

```
---
titulo: Título de la lección
resumen: Una frase de 15-25 palabras (sale en la tarjeta del temario y como descripción SEO)
minutos: 50
nivel: básico            (básico | intermedio | avanzado)
objetivos:
- Primer objetivo medible ("Explicar…", "Escribir…", "Configurar…")
- Segundo objetivo (3 a 5 en total)
---
## Primera sección          (cada ## se numera solo y entra al índice lateral)
Texto en Markdown: **negrita**, `código`, [enlaces](https://…), listas, tablas.
```

Estructura obligatoria, en este orden de `##`: secciones de contenido (4 a 8), `## Errores frecuentes`,
`## Apuntes para llevar` (lista de 4-7 viñetas), `## Glosario` (tabla `| Término | Significado |`), y al final el quiz.

### Bloques especiales

Código (la primera palabra tras las tres comillas es el lenguaje; lo demás, el título de la cabecera):

````
```js index.js          ← cabecera "index.js"
```bash                ← cabecera "Terminal"
```salida              ← cabecera "Salida esperada" (sin botón copiar)
```json  ·  ```toml wrangler.toml  ·  ```text
````

Avisos (el título es opcional; tipos: `nota`, `importante`, `consejo`, `ejemplo`):

```
> [!nota] Título corto
> Texto del aviso. Puede tener varias líneas y `código`.
```

Diagrama de flujo horizontal (nodo = `Título|subtítulo`, flecha = `-> etiqueta`):

````
```flujo
Cliente|WhatsApp
-> mensaje
Tu servidor|webhook
-> respuesta
Cliente|WhatsApp
```
````

Quiz (4 a 6 preguntas, exactamente UNA opción con `+`, una explicación con `=`; deja una línea en blanco entre preguntas):

````
```quiz
? ¿Pregunta?
- Opción incorrecta
+ Opción correcta
- Opción incorrecta
= Explicación de por qué es la correcta.
```
````

## Ejercicio (`NN-slug.ej.md`)

```
---
titulo: (opcional, se usa el de la lección)
minutos: 45
nivel: básico
---
## Objetivo
Texto…
### Cómo se trabaja
Parte A (práctica real en la terminal) y Parte B (funciones que se comprueban en el navegador)…
```

Después del texto, bloques con vallas (todos opcionales salvo `pasos`):

````
```pasos
Parte A. Primer paso (una línea por paso; admite `código` y **negrita**)
Parte B. Segundo paso
```

```pista Título de la pista
Texto de la pista (Markdown).
```

```checks
[
 {"d": "descripción del comprobante", "h": "pista si falla", "t": "return typeof miFuncion === 'function' && miFuncion(2)===4"}
]
```

```solucion funciones.js
function miFuncion(x) { return x * 2; }
```
````

Reglas de `checks`: es un array JSON; `t` es el cuerpo de una función JS que se ejecuta en el navegador DESPUÉS del código
pegado por el alumno y debe devolver `true`/`false` (las funciones del alumno son globales; comillas dobles escapadas con `\"`;
una sola línea). Pon 4 a 8 comprobaciones, de lo fácil a lo difícil, cada una con `d` (qué se comprueba) y `h` (pista). Solo
código JS puro que corra en un navegador: nada de `import`, `fetch` a Meta, `process`, `fs` ni Node. Todo ejercicio con `checks`
debe poder resolverse con una solución que TÚ HAS EJECUTADO contra esos mismos `t` (compruébalo con Node antes de entregar).
Para una lección sin código verificable (por ejemplo configurar la cuenta de Meta), el ejercicio lleva solo `pasos` y `pista`.

Un aviso `> [!consejo] Reto extra` al final del texto del ejercicio es bienvenido.

## Estilo

- Español neutro latinoamericano, tuteo, tono de tutor paciente; explica el **porqué** antes del cómo.
- Cada concepto nuevo: definición simple → ejemplo mínimo → ejemplo en el proyecto del **minimarket**.
- Datos y mensajes de ejemplo: negocio ficticio «Minimarket La Esquina»; moneda soles (S/). Sin emojis en los mensajes del bot.
- Nunca uses datos reales de ninguna empresa o persona. Números de teléfono: usa rangos de ejemplo claramente falsos (por ejemplo `51999000111`).
- Todo código debe haberse ejecutado. Nada de «debería funcionar». Muestra la salida real en bloques `salida`.
- Cosas que cambian con el tiempo (precios, versión de la API, límites, nombres de menús de Meta): dilo explícitamente con un aviso
  `> [!importante] Verifica este dato` y enlaza a la documentación oficial de Meta en lugar de inventar cifras.
- Longitud: lección de 1.800 a 3.500 palabras de texto + código. Es un curso largo y completo: sé profundo, no superficial.
- Enlaza hacia otras lecciones con rutas relativas `../NN-slug/` (por ejemplo `[lección 5](../05-estado-de-la-conversacion/)`).
