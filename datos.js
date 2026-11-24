/* QualyApp · catálogos de las auditorías (preguntas, máquinas, defectos) */
const ICO={
 iny:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
 sop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4v3l2.5 3.5V20a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V8.5L10 5z"/><path d="M7.5 13h9"/></svg>',
 ino:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 cap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5" opacity=".5"/></svg>',
 paq:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
 fug:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5l1.8 1.8 3.4-3.6"/></svg>',
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
 hist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'};
const COL={iny:'var(--c-iny)',sop:'var(--c-sop)',ino:'var(--c-ino)',cap:'var(--c-cap)',paq:'var(--c-paq)',fug:'var(--c-fug)'};
const ROL={admin:'Administrador',inspector:'Inspector de calidad',ingeniero:'Ingeniero de calidad',jefe:'Jefe de calidad',gerente:'Gerente de calidad',director:'Director'};
const INY={
 LAINER:{sub:'Componentes y ensamble',items:[
  ['Ensamble de tapa conforme a OP','Sin ausencia de lainer, membrana o válvula. Ensamble plano, sin desprendimientos ni arrugas en la orilla.'],
  ['Defectos visuales y estéticos','Puntos negros dentro de especificación. Sin ráfagas ni burbujas de gas en las paredes.'],
  ['Etiquetado e identificación de lote','Etiqueta bien colocada y legible. Cinta Fischer = Coca-Cola · cinta blanca = producto de línea.']]},
 BRP:{sub:'Funcionalidad y proceso',items:[
  ['Trazabilidad','OP llena y sellada conforme al procedimiento de liberación.'],
  ['Aspectos visuales','Sin deformaciones, piezas incompletas ni rechupes severos.'],
  ['Gauge funcional','Entra y sale sin forzarla. Si necesita presión o no asienta: NO PASA.'],
  ['Retrabajos','Todo retrabajo o recuperación manual sigue al 100 % la instrucción de trabajo vigente.']]},
 BTT:{sub:'Funcionalidad y proceso',items:[
  ['Trazabilidad','OP llena y sellada conforme al procedimiento de liberación.'],
  ['Aspectos visuales','Igual a las referencias aprobadas por el cliente.'],
  ['Gauge funcional','Entra y sale sin forzarla. Si necesita presión o no asienta: NO PASA.'],
  ['Secuencia de ensamble','Se sigue el orden de la instrucción de trabajo, sin omitir ni invertir pasos.']]}
};
const SOP=[
 ['Máximo 3 puntos negros de 1.5 mm',''],
 ['Hundimiento','En caso de duda se lleva a laboratorio para medición.'],
 ['Flash en boca',''],['Cuerdas completas',''],
 ['Retrabajo en fondo','Solo aplica a cliente Innophos y Givaudan.',true],
 ['Boca uniforme',''],['Sin presencia de peligro físico, químico o biológico',''],
 ['Sin golpes en cuerpo',''],['Sin colada bajo asa','']];
const INO=[
 ['Navajas','No debe haber sueltas, rotas u oxidadas; sujetas con tornillo; uso correcto del checklist de navajas.'],
 ['Limpieza',''],['Vidrio y plástico sin roturas','En inyectoras revisar la posición de sus techos de acrílico.'],
 ['Sin presencia de plagas',''],['Recipientes químicos etiquetados',''],
 ['Sin peligro físico, químico o biológico en envase / tapa',''],
 ['Sin aceite en contacto con el producto','Bandas, mesa, molde de máquina.'],
 ['Cajas de recuperado tapadas e identificadas',''],['Tolvas de MP a inyectoras cerradas y en buen estado',''],
 ['Dispensadores de tapas con cubierta',''],['Revisión de checklist de arranque','Realización completa y correcta, cuando aplique.',true]];
const EPP=[
 ['Uso correcto del EPP en piso','Cofia, cubrebocas, cubrebarba, lentes, tapones, botas.'],
 ['Guantes y mangas limpias, en buen estado',''],['Uniforme limpio','Sin polvo, residuos químicos, no roto.'],
 ['Botas limpias',''],['Uñas cortas, sin esmalte',''],
 ['Sin accesorios innecesarios','Cadenas, pulseras, colgantes, aretes, piercings.'],['Sin perfume ni maquillaje','']];
const CAPAS={
 iny:{1:[['Seguridad',['¿El operador cuenta con todo su equipo de seguridad para realizar su trabajo?']],['Trabajo estandarizado',['¿Los operadores cuentan con las habilidades requeridas para su trabajo? (matriz de habilidades)','¿Se siguen correctamente las instrucciones de trabajo?']],['Organización del lugar de trabajo',['¿Se cuenta con la orden de producción en máquina?','¿La materia prima corresponde con la señalada en la orden de producción?','¿Se identifica con punto naranja el producto sospechoso y está en un área designada?','¿Está la pieza de referencia del producto que se trabaja en la estación?','¿Se identifica con punto rojo el producto no conforme y está en un área designada?','¿Se utilizan contenedores apropiados en la producción?','¿El lugar de trabajo está limpio y ordenado?','¿El área de trabajo cuenta con ayudas visuales?']]],
  2:[['Comunicación',['¿El personal está enterado de problemas recientes de calidad (alertas de menos de 3 meses)?','¿La documentación de producto no conforme (RNC) está accesible al personal operativo?']],['Organización del lugar de trabajo',['¿Está la pieza de referencia del producto que se trabaja en la estación?','¿Los dumis están verificados por el turno?']],['Sistema de medición',['¿El equipo de medición está en condiciones adecuadas (sin daño físico)?','¿El equipo de medición está debidamente identificado?','¿El equipo de medición está calibrado? (validar certificado)','¿El equipo cuenta con R&R vigente?']],['Mantenimiento',['¿Está disponible el plan de mantenimiento de la máquina?','¿El plan de mantenimiento se realiza de acuerdo con lo establecido?']]],
  3:[['Plan de control',['¿El check point de secador está dentro de especificación?','¿La temperatura del termocontrol está dentro de parámetros?','¿El tiempo de ciclo, tiempo de inyección y cojín de masa están dentro de especificación?']],['Contención / retrabajo',['¿El retrabajo o desmontaje se hace en el lugar designado, correctamente y con el producto identificado?']],['Organización del lugar de trabajo',['¿Está la pieza de referencia del producto que se trabaja en la estación?']],['AMEF',['¿La materia prima corresponde con la señalada en la orden de producción?','¿El reloj fechador coincide con semana / mes actual? (si aplica)','¿El empaque está en buenas condiciones?','¿Los resultados de liberación están dentro de especificación? (hoja de liberación)']]],
  4:[['Verificación de indicadores',['Scrap producción automotriz (≤ 3.5 %)','OEE Inyección producción automotriz (≥ 87 %)','¿Se cubren las fechas compromiso de acciones pendientes por hallazgos?']]]},
 sop:{1:[['Seguridad',['¿El operador cuenta con todo su equipo de seguridad para realizar su trabajo?']],['Trabajo estandarizado',['¿Los operadores cuentan con las habilidades requeridas para su trabajo?','¿Se siguen correctamente las instrucciones de trabajo?']],['Organización del lugar de trabajo',['¿Se cuenta con la orden de producción en máquina?','¿La materia prima corresponde con la señalada en la orden de producción?','¿El producto no conforme está colocado en un área designada?','¿Se utilizan contenedores apropiados en la producción?','¿El lugar de trabajo está limpio y ordenado?','¿El área de trabajo cuenta con ayudas visuales?']]],
  2:[['Contención / retrabajo',['¿La documentación de producto no conforme (RNC) está accesible al personal operativo?','¿El retrabajo o desmontaje se hace en el lugar designado, correctamente y con el producto identificado?']],['Comunicación',['¿El personal está enterado de problemas recientes de calidad (alertas de menos de 3 meses)?','¿El personal conoce sus indicadores y dónde consultarlos?']],['Sistema de medición',['¿Está vigente la calibración de los equipos de medición que usa el operador?','¿El personal que usa equipo de medición está capacitado?']],['Mantenimiento',['¿Está disponible el plan de mantenimiento de la máquina?','¿El plan de mantenimiento se realiza de acuerdo con lo establecido?']]],
  3:[['Plan de control · semiterminado',['¿El tiempo de ciclo es correcto? (60.00 ± 4 s)','¿El tiempo de soplado es correcto? (34.0 ± 2 s)','¿Las RPM son correctas? (45 ± 8)'],0],['Plan de control · terminado',['¿Cuenta con O-ring?','¿Tiene punto verde por prueba de fuga?','¿La cantidad de piezas por caja es correcta?'],1],['AMEF',['¿La materia prima corresponde con la señalada en la orden de producción?','¿El reloj fechador coincide con la semana actual?','¿El empaque está en buenas condiciones?','¿Los resultados de liberación están dentro de especificación? (hoja de liberación)']]],
  4:[['Verificación de indicadores',['Scrap producción soplado (≤ 7.5 %)','OEE producción soplado (≥ 77 %)','¿Se cubren las fechas compromiso de acciones pendientes por hallazgos?']]]}};
const MAQ_CAP=['S7','S8','S9','S10','S11','S12','S14','S16'];
const CLS_SOP=['calidad','funcional','funcional','funcional','calidad','funcional','inocuidad','funcional','calidad'];
const MAQ_SOP=['M3','M4','M5','M7','M11','M13','M14','M15','M22','M23','M24','M25','M26'];
const MAQ_INY=['S7','S8','S9','S10','S11','S12','S13','S14','S15','S16','S18','L1','L2','L3','L4','L5','T1'];
const ZONAS=[...MAQ_SOP,...MAQ_INY.filter(m=>m[0]==='S')];
const DEFECTOS=['Hundimiento','Rayón','Partícula en interior','Contaminación por grasa','Rebaba en interior','Golpe en cuerpo','Deformación en cuerda','Flash en boca','Mal ensamble','Escurrimiento en boca','Colada bajo asa','Puntos negros','Marca en boca','Otro'];
const DEF={
 'Rayón':'inocuidad','Partícula en interior':'inocuidad','Contaminación por grasa':'inocuidad','Rebaba en interior':'inocuidad',
 'Hundimiento':'funcional','Golpe en cuerpo':'funcional','Deformación en cuerda':'funcional','Flash en boca':'funcional','Mal ensamble':'funcional','Escurrimiento en boca':'funcional',
 'Colada bajo asa':'calidad','Puntos negros':'calidad','Marca en boca':'calidad'};
const PORQUE={inocuidad:'Problema de inocuidad',funcional:'Problema funcional para el cliente',calidad:'Problema de calidad / apariencia',fuga:'Riesgo de enviar envases con fuga al cliente: el comprobador no detecta la fuga'};
const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const AREAS={iny:'Inyección',sop:'Soplado · Filler pipe'};

/* Control documental impreso al pie de cada formato. Valores iniciales; el administrador los edita en la app. */
const FMT_BASE={
 iny:{nombre:'Auditoría de producto · Inyección',codigo:'PR.XX.XX.XX',ret:'x.x años',rev:'DD.MM.AA Rev X',fcr:'FCRXXX-XX'},
 sop:{nombre:'Auditoría de producto · Soplado',codigo:'PR.FO.01.65',ret:'7.5 años',rev:'18.12.24 Rev. 2',fcr:'FCR521-24'},
 ino:{nombre:'Auditoría de inocuidad',codigo:'IC.FO.01.63',ret:'7.5 años',rev:'25.09.25 Rev. 3',fcr:'FCR593-25'},
 capi:{nombre:'Auditoría por capas · Inyección',codigo:'PR.FO.06.21',ret:'Vida proyecto + 15 años',rev:'04.12.25 Rev. 18',fcr:'FCR805-25'},
 caps:{nombre:'Auditoría por capas · Soplado',codigo:'PR.FO.06.06',ret:'Vida proyecto + 15 años',rev:'23.02.26 Rev. 4',fcr:'FCR191-26'},
 fug:{nombre:'Auditoría de comprobadores de fuga',codigo:'PR.FO.01.69',ret:'7.5 años',rev:'04.05.24 Rev. 1',fcr:'FCR142-24'}};
