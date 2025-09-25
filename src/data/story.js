export const storySteps = [
  {
    step: 0,
    type: 'intro',
    title: 'El Circo de las Mariposas: Una Carta para Quien Juegue Esta Rayuela',
    content: `A la mariposa que hoy me lee,\nTe escribo desde mi presente, con la certeza de que estas palabras podrían ser una advertencia, o quizás, solo un bálsamo para mi alma y mi corazón. Una especie de caricia para todas las "yo" que fui mientras recorrí cada casilla de esta particular rayuela.\n\nSi has llegado hasta aquí, es porque has encontrado un juego diferente, uno donde los saltos no son de niños, sino de memoria. Cada casilla es un eco de mí, una vibración que aún resuena. Esta no es una rayuela para descalzos y risas vacías; es para quienes se atreven a pisar los recuerdos con el corazón abierto.`
  },
  {
    step: 0,
    type: 'rules',
    title: 'Las Reglas de Mi Juego',
    content: `Quizás no seas una versión de mí, pero si decides adentrarte en mi rayuela, te pido que respetes su esencia, porque esta es mi vida. Hay pactos inquebrantables; de no cumplirlos, la rayuela misma te expulsará.\n\nPara jugar, necesitas:\n• Un corazón noble, aun si está roto.\n• Un alma curiosa, aunque asustada.\n• Una mente que, aunque no siempre comprenda lo que siente, elige quedarse.\n\nSi alguna vez te pierdes, si el mundo se vuelve confuso o ajeno, te imploro: vuelve al inicio. Ahí aprenderás, de nuevo, a leer. A descifrar. A entender que a veces la gente se va, que a veces te quedas atrás, pero también hay quienes te esperan, quienes te enseñan a ver lo que tú aún no logras distinguir.`
  },
  {
    step: 1,
    type: 'casilla',
    title: 'Casilla 1: La Niña que Descifró el Mundo',
    content: 'Aquí las letras eran acertijos y las burlas, combustible. Aprendiste que la ternura podía doler y que la paciencia de otros era tu salvación.',
    imageUrl: 'https://i.imgur.com/nafU5P0.png'
  },
  {
    step: 2,
    type: 'casilla',
    title: 'Casilla 2: El Reino de Cristal',
    content: 'Visitaste castillos de cristal, hablaste con hadas y, por un instante, fuiste parte de un mundo de ensueño donde todo era posible.',
    imageUrl: 'https://i.imgur.com/6H136SO.png'
  },
  {
    step: 3,
    type: 'casilla',
    title: 'Casilla 3: El Hechizo Rosa',
    content: 'La vida se tiñó de rosa. Lloraste por amores imposibles y comenzaste a anhelar tu propio cuento de hadas. Aquí se forjaron tus primeras expectativas.',
    imageUrl: 'https://i.imgur.com/WyJQkNt.png'
  },
  {
    type: 'advertencia',
    step: 4, 
    title: 'Advertencia: La Encrucijada',
    content: 'Aquí se abren dos caminos. Puedes vivir ambas experiencias o tomar solo un lado. Al final, ambos te llevarán al mismo punto. Disfruta estas casillas, fueron demasiado breves para mí.',
    imageUrl: 'https://i.imgur.com/gACu2Df.png'
  },
  {
    step: 4, // Renumbered for bifurcation, mapped to layout index 3
    casilla_num: 4,
    type: 'casilla',
    title: 'Casilla 4: El Amor que Pudo Ser',
    content: 'Haz lo que yo no hice. Si alguien te gusta, no temas decirlo. Agradecerás ese último abrazo y ese beso tan esperado.',
    imageUrl: 'https://i.imgur.com/lIwC7eF.png'
  },
  {
    step: 5, // Renumbered for bifurcation, mapped to layout index 4
    casilla_num: 5,
    type: 'casilla',
    title: 'Casilla 5: El Verano Eterno',
    content: 'Desayuna con tu madre, abrázala y dile cuánto la quieres. Escucha sus historias. No sabes el peso que cargaban.',
    imageUrl: 'https://i.imgur.com/XVSbO24.png'
  },
  {
    step: 6,
    type: 'casilla',
    title: 'Casilla 6: El Invierno de los Colibríes',
    content: 'Lamento que hayas entrado aquí. No hay saltos, es inmensa, te atrapa. Sentirás una pesadumbre abrumadora, la oscuridad te invadirá.',
    imageUrl: 'https://i.imgur.com/gACu2Df.png'
  },
  {
    step: 7,
    type: 'casilla',
    title: 'Casilla 7: La Salida del Laberinto',
    content: 'Una pequeña luciérnaga te muestra que incluso en la oscuridad más profunda, hay una guía. Sigues su luz, saliendo del laberinto.',
    imageUrl: 'https://i.imgur.com/IEKaNsZ.png'
  },
  {
    step: 8,
    type: 'casilla',
    title: 'Casilla 8: El Primer Vuelo',
    content: 'Sientes alas en tu espalda. Frágiles al principio, pero se fortalecen con cada lección aprendida. Saltas, y esta vez, vuelas.',
    imageUrl: 'https://i.imgur.com/gHnd1bY.png'
  },
  {
    step: 9,
    type: 'fin',
    title: '¿FIN?',
    content: 'Has llegado al final de mi rayuela, pero al comienzo de la tuya. Cada mariposa que vuela es una historia. Ahora, te toca escribir la tuya.',
    imageUrl: ''
  }
];