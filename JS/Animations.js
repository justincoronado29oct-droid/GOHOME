  const circles = document.querySelectorAll('.circle_home');
  const triangles = document.querySelectorAll('.triangle');
  const cuadrados = document.querySelectorAll('.cuadrado_incompleto');
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;



  // ======================================================
  // 🔹 ANIMACIÓN DE CÍRCULOS
  // ======================================================
  circles.forEach(circle => {
    const size = 100 + Math.random() * 150;
    circle.style.width = size + 'px';
    circle.style.height = size + 'px';

    let x = Math.random() * (windowWidth - size);
    let y = Math.random() * (windowHeight - size);
    circle.style.left = x + 'px';
    circle.style.top = y + 'px';

    let dx = (Math.random() - 0.2) * 0.5;
    let dy = (Math.random() - 0.2) * 0.3;

    function animate() {
      x += dx;
      y += dy;
      if (x <= 0 || x + size >= windowWidth) dx = -dx;
      if (y <= 0 || y + size >= windowHeight) dy = -dy;
      circle.style.left = x + 'px';
      circle.style.top = y + 'px';
      requestAnimationFrame(animate);
    }
    animate();
  });

  // ======================================================
  // 🔹 ANIMACIÓN DE TRIÁNGULOS
  // ======================================================
  triangles.forEach(tri => {
    const size = 100 + Math.random() * 150;
    tri.style.width = size + 'px';
    tri.style.height = size + 'px';

    let x = Math.random() * (windowWidth - size);
    let y = Math.random() * (windowHeight - size);
    tri.style.left = x + 'px';
    tri.style.top = y + 'px';

    let dx = (Math.random() - 0.2) * 0.5;
    let dy = (Math.random() - 0.2) * 0.3;

    function animateTri() {
      x += dx;
      y += dy;
      if (x <= 0 || x + size >= windowWidth) dx = -dx;
      if (y <= 0 || y + size >= windowHeight) dy = -dy;
      tri.style.left = x + 'px';
      tri.style.top = y + 'px';
      requestAnimationFrame(animateTri);
    }
    animateTri();
  });

  // ======================================================
  // 🔹 ANIMACIÓN DE CUADRADOS (pagos incompletos)
  // ======================================================
  cuadrados.forEach(cuadrado => {
    const size = Math.random() * 40 + 20;
    cuadrado.style.width = `${size}px`;
    cuadrado.style.height = `${size}px`;

    let x = Math.random() * (window.innerWidth - size);
    let y = Math.random() * (window.innerHeight - size);
    let dx = (Math.random() - 0.5) * 1.8;
    let dy = (Math.random() - 0.5) * 1.8;

    cuadrado.style.left = `${x}px`;
    cuadrado.style.top = `${y}px`;

    function mover() {
      x += dx;
      y += dy;
      if (x <= 0 || x + size >= window.innerWidth) dx *= -1;
      if (y <= 0 || y + size >= window.innerHeight) dy *= -1;
      cuadrado.style.left = `${x}px`;
      cuadrado.style.top = `${y}px`;
      requestAnimationFrame(mover);
    }
    mover();
  });