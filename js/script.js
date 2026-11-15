/* =========================================================
   Diany ART · lógica del catálogo
   Los datos de las piezas están en js/piezas.js
   ========================================================= */

const WHATSAPP = '593979686640';
const ITEMS_POR_PAGINA = 8;

// Cada pieza recibe un código (#1, #2...) según su orden en piezas.js.
// Sirve para identificarla en el pedido aunque haya nombres repetidos.
PIEZAS.forEach((pieza, i) => { pieza.id = i + 1; });

const $ = (sel) => document.querySelector(sel);
const dinero = (n) => `$${n.toFixed(2)}`;

/* ---------- Animaciones ---------- */
const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('anim');

// Divide el título en palabras para que suban una por una
document.querySelectorAll('[data-palabras]').forEach(el => {
  const texto = el.textContent.trim();
  el.setAttribute('aria-label', texto);
  el.textContent = '';
  texto.split(/\s+/).forEach((palabra, i) => {
    const caja = document.createElement('span');
    caja.className = 'palabra';
    caja.setAttribute('aria-hidden', 'true');
    caja.style.setProperty('--i', i);
    const interior = document.createElement('span');
    interior.textContent = palabra;
    caja.appendChild(interior);
    el.append(caja, ' ');
  });
});

// Los hijos de [data-escalonar] aparecen uno tras otro
document.querySelectorAll('[data-escalonar]').forEach(grupo => {
  [...grupo.children].forEach((hijo, i) => {
    hijo.classList.add('revelar');
    hijo.style.setProperty('--d', `${i * 120}ms`);
  });
});

// Revela los elementos .revelar cuando entran en pantalla
const observador = 'IntersectionObserver' in window && !movimientoReducido
  ? new IntersectionObserver(entradas => entradas.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observador.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
  : null;
document.querySelectorAll('.revelar').forEach(el =>
  observador ? observador.observe(el) : el.classList.add('visible'));

// Sombra del header al hacer scroll
const header = $('.site-header');
addEventListener('scroll', () => header.classList.toggle('con-sombra', scrollY > 10), { passive: true });

let categoriaActual = 'todos';
let paginaActual = 1;
let carrito = {}; // { id: cantidad }

/* ---------- Filtros ---------- */
function crearFiltros() {
  const contenedor = $('#filtros');
  const opciones = [{ clave: 'todos', nombre: 'Todo' }, ...CATEGORIAS];

  opciones.forEach(({ clave, nombre }) => {
    const total = clave === 'todos'
      ? PIEZAS.length
      : PIEZAS.filter(p => p.categoria === clave).length;

    const boton = document.createElement('button');
    boton.className = 'filtro' + (clave === categoriaActual ? ' activo' : '');
    boton.innerHTML = `${nombre} <span class="filtro-num">${total}</span>`;
    boton.addEventListener('click', () => {
      contenedor.querySelectorAll('.filtro').forEach(b => b.classList.remove('activo'));
      boton.classList.add('activo');
      categoriaActual = clave;
      paginaActual = 1;
      mostrarPagina();
    });
    contenedor.appendChild(boton);
  });
}

/* ---------- Tarjetas ---------- */
const plantilla = $('#plantilla-pieza');

function crearTarjeta(pieza) {
  const tarjeta = plantilla.content.firstElementChild.cloneNode(true);
  const nombreCategoria = CATEGORIAS.find(c => c.clave === pieza.categoria)?.nombre || '';

  tarjeta.dataset.id = pieza.id;
  const img = tarjeta.querySelector('img');
  img.src = `img/${pieza.img}`;
  img.alt = pieza.nombre;
  tarjeta.querySelector('.pieza-tag').textContent = nombreCategoria;
  tarjeta.querySelector('h3').textContent = pieza.nombre;
  tarjeta.querySelector('.pieza-detalle').textContent = pieza.medida;
  tarjeta.querySelector('.pieza-precio').textContent = dinero(pieza.precio);

  tarjeta.querySelector('.btn-agregar').addEventListener('click', () => cambiarCantidad(pieza.id, 1));
  tarjeta.querySelector('.menos').addEventListener('click', () => cambiarCantidad(pieza.id, -1));
  tarjeta.querySelector('.mas').addEventListener('click', () => cambiarCantidad(pieza.id, 1));

  pintarEstadoTarjeta(tarjeta);
  return tarjeta;
}

// Muestra "Agregar" o el selector − n + según si la pieza está en el carrito
function pintarEstadoTarjeta(tarjeta) {
  const cantidad = carrito[tarjeta.dataset.id] || 0;
  tarjeta.classList.toggle('en-carrito', cantidad > 0);
  tarjeta.querySelector('.stepper-num').textContent = cantidad;
}

/* ---------- Paginación ---------- */
function mostrarPagina(desplazar = false) {
  const filtradas = PIEZAS.filter(p => categoriaActual === 'todos' || p.categoria === categoriaActual);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITEMS_POR_PAGINA));
  paginaActual = Math.min(paginaActual, totalPaginas);

  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const grid = $('#grid-piezas');
  grid.replaceChildren(...filtradas.slice(inicio, inicio + ITEMS_POR_PAGINA).map((pieza, i) => {
    const tarjeta = crearTarjeta(pieza);
    tarjeta.style.setProperty('--i', i); // entrada escalonada
    return tarjeta;
  }));

  $('#sin-resultados').classList.toggle('oculto', filtradas.length > 0);
  crearBotonesPagina(totalPaginas);

  if (desplazar) $('#catalogo').scrollIntoView({ behavior: 'smooth' });
}

function crearBotonesPagina(totalPaginas) {
  const contenedor = $('#paginacion');
  contenedor.innerHTML = '';
  if (totalPaginas <= 1) return;

  const boton = (texto, pagina, { activo = false, deshabilitado = false, etiqueta } = {}) => {
    const b = document.createElement('button');
    b.textContent = texto;
    b.className = 'btn-pagina' + (activo ? ' activo' : '');
    b.disabled = deshabilitado;
    if (etiqueta) b.setAttribute('aria-label', etiqueta);
    b.addEventListener('click', () => { paginaActual = pagina; mostrarPagina(true); });
    contenedor.appendChild(b);
  };

  boton('‹', paginaActual - 1, { deshabilitado: paginaActual === 1, etiqueta: 'Página anterior' });
  for (let i = 1; i <= totalPaginas; i++) boton(i, i, { activo: i === paginaActual });
  boton('›', paginaActual + 1, { deshabilitado: paginaActual === totalPaginas, etiqueta: 'Página siguiente' });
}

/* ---------- Carrito ---------- */
function cambiarCantidad(id, delta) {
  const nueva = (carrito[id] || 0) + delta;
  if (nueva <= 0) delete carrito[id];
  else carrito[id] = nueva;
  actualizarCarrito();
}

function actualizarCarrito() {
  const items = Object.entries(carrito).map(([id, cantidad]) => ({
    pieza: PIEZAS.find(p => p.id === Number(id)),
    cantidad,
  }));
  const unidades = items.reduce((s, i) => s + i.cantidad, 0);
  const total = items.reduce((s, i) => s + i.pieza.precio * i.cantidad, 0);

  $('#resumen-barra').classList.toggle('oculto', items.length === 0);
  const totalEl = $('#resumen-total');
  totalEl.textContent = dinero(total);
  totalEl.classList.remove('pulso');
  void totalEl.offsetWidth; // reinicia la animación
  totalEl.classList.add('pulso');
  $('#resumen-unidades').textContent = `${unidades} ${unidades === 1 ? 'pieza' : 'piezas'}`;
  $('#resumen-aviso').classList.toggle('oculto', unidades < 12);

  const lista = $('#resumen-items');
  lista.replaceChildren(...items.map(({ pieza, cantidad }) => {
    const fila = document.createElement('li');
    fila.className = 'resumen-fila';
    fila.innerHTML = `
      <span class="resumen-nombre"></span>
      <span class="stepper stepper-mini">
        <button type="button" aria-label="Quitar una">−</button>
        <span>${cantidad}</span>
        <button type="button" aria-label="Agregar una">+</button>
      </span>
      <span class="resumen-subtotal">${dinero(pieza.precio * cantidad)}</span>`;
    fila.querySelector('.resumen-nombre').textContent = pieza.nombre;
    const [menos, mas] = fila.querySelectorAll('button');
    menos.addEventListener('click', () => cambiarCantidad(pieza.id, -1));
    mas.addEventListener('click', () => cambiarCantidad(pieza.id, 1));
    return fila;
  }));

  document.querySelectorAll('#grid-piezas .pieza').forEach(pintarEstadoTarjeta);
}

$('#resumen-toggle').addEventListener('click', () => {
  const barra = $('#resumen-barra');
  const abierto = barra.classList.toggle('abierto');
  $('#resumen-toggle').setAttribute('aria-expanded', abierto);
});

$('#btn-vaciar').addEventListener('click', () => {
  carrito = {};
  $('#resumen-barra').classList.remove('abierto');
  actualizarCarrito();
});

$('#btn-pedir').addEventListener('click', () => {
  const lineas = Object.entries(carrito).map(([id, cantidad]) => {
    const p = PIEZAS.find(x => x.id === Number(id));
    return `- ${p.nombre} (cód. ${p.id}) x${cantidad} = ${dinero(p.precio * cantidad)}`;
  });
  const total = Object.entries(carrito)
    .reduce((s, [id, c]) => s + PIEZAS.find(x => x.id === Number(id)).precio * c, 0);

  const mensaje = `Hola, quiero ordenar:\n${lineas.join('\n')}\n\nTotal: ${dinero(total)}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`, '_blank');
});

/* ---------- Inicio ---------- */
$('#anio').textContent = new Date().getFullYear();
crearFiltros();
mostrarPagina();
