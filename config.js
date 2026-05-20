// Configuracion del sistema de fichada con QR rotativo.
// Editar SOLO los valores marcados con TODO antes de desplegar.
window.FICHADA_CONFIG = {
  // URL del endpoint formResponse del Google Form.
  // Tomar la URL del viewform y reemplazar "/viewform" por "/formResponse".
  formActionUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLScjwID9-oLoXfay0BKMGsfZL-prFwZI5SDFKs8d-i1MllkjfA/formResponse",

  // TODO: ID del campo "Evento".
  // Como obtenerlo: en el editor del Form, menu ... -> "Obtener enlace prerellenado",
  // elegi "Entrada", copia el enlace. Vas a ver algo como:
  //   .../formResponse?entry.123456789=Entrada
  // El numero despues de "entry." es el valor que va aca.
  eventoEntryId: "entry.REEMPLAZAR_EVENTO_ID",

  // Modo de envio del correo electronico:
  //   "emailAddress" -> Form configurado con "Recolectar correos -> Entrada del responder".
  //                     Se envia con el campo POST "emailAddress".
  //   "entry"        -> El correo es una pregunta normal de respuesta corta.
  //                     Se envia con el entry.X correspondiente (emailEntryId).
  emailMode: "emailAddress",

  // Solo se usa si emailMode === "entry".
  // Obtener el ID con el mismo metodo de "Obtener enlace prerellenado".
  emailEntryId: "entry.REEMPLAZAR_EMAIL_ID",

  // Secreto compartido entre qr.html (pantalla de sede) y index.html (fichada).
  // ADVERTENCIA: este valor queda visible en el JS publico de ambas paginas.
  // Quien lo lea puede generar tokens validos desde cualquier red.
  // Es un disuasivo, no una barrera criptografica.
  // Reemplazar por una cadena propia, larga y aleatoria (32+ caracteres).
  hmacSecret: "CAMBIAR-ESTE-SECRETO-LARGO-Y-ALEATORIO-1234567890abcdef",

  // Duracion de cada token en segundos. Mas corto = mas seguro, pero exige relojes sincronizados.
  tokenPeriodSec: 30,

  // Cuantas ventanas hacia atras/adelante se aceptan (cubre desincronizacion de reloj).
  // 1 = se acepta el bucket actual, el anterior y el siguiente.
  tokenTolerance: 1,
};
