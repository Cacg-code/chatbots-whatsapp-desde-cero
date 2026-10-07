## Qué es esta página

Un curso se ve limpio cuando está terminado, pero el camino tuvo decisiones y tropiezos. Aquí quedan escritos, porque revisar los errores enseña más que mirar solo el resultado. El material lo hace **un estudiante con ayuda de inteligencia artificial**, así que esta página también sirve para saber dónde conviene desconfiar y verificar.

## Decisiones que tomé

- **Reglas primero, IA después.** El bot de referencia no usa IA: es un motor de reglas fácil de probar y de explicar. La IA entra como complemento (lección 22), nunca como cerebro.
- **Una función pura como centro.** `procesar(sesion, entrada)` devuelve la nueva sesión y las respuestas, sin tocar nada fuera. Gracias a eso se puede probar en la consola, en el simulador y en el servidor con el mismo código.
- **Un negocio ficticio como hilo.** Todo el curso usa «Minimarket La Esquina»: un solo ejemplo, repetido, se entiende mejor que muchos ejemplos distintos.
- **Un simulador en el navegador.** Sin cuenta de Meta se puede practicar el 80 % del curso; la cuenta real solo hace falta para conectar.

## Errores que aparecieron (y cómo se corrigieron)

1. **Mensajes perdidos por marcar «visto» demasiado pronto.** El servidor guardaba `visto:<id>` antes de enviar la respuesta; si el envío fallaba, Meta reintentaba y el bot ignoraba el reintento por «ya visto». Se corrigió deshaciendo la marca si el envío falla, y se añadió una prueba que lo reproduce.
2. **Una lección decía que la sesión vive en memoria.** En un servidor sin estado eso se pierde en cada petición; lo correcto era guardarla en Cloudflare KV. Se corrigió el texto y el ejemplo.
3. **Comandos que solo funcionaban en Bash.** Algunos ejercicios usaban `printf … |`, que en PowerShell no existe. Se añadieron alternativas para Windows.
4. **Enlaces rotos entre lecciones.** Se automatizó la revisión de enlaces para que no vuelvan a pasar sin que nadie lo note.
5. **Datos de Meta que cambian.** Precios, límites y nombres de menús varían; por eso hay avisos «Verifica este dato» con enlace a la documentación oficial en lugar de cifras inventadas.

## Qué haría distinto

- Probar el flujo completo con una cuenta real de Meta **antes** de escribir las lecciones de conexión (12 a 14), no después.
- Escribir las pruebas automáticas desde la primera lección, no al final.
- Pedir a otra persona que haga el curso de cero y anote dónde se atasca.

## Qué me llevo

- Que escribir una explicación obliga a entender: varias veces la lección salió mal hasta que el código la contradijo.
- Que una prueba automática vale más que «debería funcionar».
- Que decir con claridad qué está verificado y qué no genera más confianza que aparentar certeza.

## Cómo ayudarme a mejorarlo

Si encuentras un error, un dato desactualizado o algo confuso, abre un *issue* en el repositorio. Cualquier corrección se agradece.
