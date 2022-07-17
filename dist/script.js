/*
  Johan Karlsson, 2021
  https://twitter.com/DonKarlssonSan
  MIT License, see Details View
*/
let canvas;
let ctx;
let w, h;
let swarm;
let then;
let mouseX, mouseY, mouseXprev, mouseYprev;
let config = {
  cohesionRadius: 60,
  cohesionStrength: 20,
  separationRadius: 20,
  separationStrength: 30,
  alignmentRadius: 40,
  alignmentStrength: 10 };

let obstacles;

class Swarm {
  constructor(w, h) {
    this.particles = [];
    let nrOfParticles = w * h * 0.0002;
    for (let i = 0; i < nrOfParticles; i++) {
      let x = Math.random() * w;
      let y = Math.random() * h;
      let pos = new Vector(x, y);
      let particle = new Particle(pos);
      this.particles.push(particle);
    }
  }

  getParticlesCloseTo(pos, r) {
    return this.particles.filter(p1 => pos.distanceTo(p1.pos) <= r);
  }

  update(ctx, delta) {
    this.particles.forEach(p => {
      // Cohesion
      let close = this.getParticlesCloseTo(p.pos, config.cohesionRadius);
      if (close.length > 0) {
        let sum = new Vector(0, 0);
        close.forEach(c => {
          sum.addTo(c.pos);
        });
        let average = sum.div(close.length);
        let diff = average.sub(p.pos).mult(config.cohesionStrength / 100000);
        p.acc.addTo(diff);
      }
      // Separation
      let veryClose = this.getParticlesCloseTo(p.pos, config.separationRadius);
      if (veryClose.length > 0) {
        let sum = new Vector(0, 0);
        veryClose.forEach(c => {
          sum.addTo(c.pos);
        });
        let average = sum.div(veryClose.length);
        let diff = p.pos.sub(average).mult(config.separationStrength / 10000);
        p.acc.addTo(diff);
      }
      // Alignment
      let mediumClose = this.getParticlesCloseTo(p.pos, config.alignmentRadius);
      if (mediumClose.length > 0) {
        let sum = new Vector(0, 0);
        mediumClose.forEach(c => {
          sum.addTo(c.vel);
        });
        let average = sum.div(mediumClose.length);
        let diff = average.sub(p.vel).mult(config.alignmentStrength / 10000);
        p.acc.addTo(diff);
      }

      p.move(delta);
      p.draw(ctx);
    });

    if (mouseX && mouseY) {
      let mousePos = new Vector(mouseX, mouseY);
      let closeToPointer = this.getParticlesCloseTo(mousePos, 40);
      if (closeToPointer.length > 0) {
        closeToPointer.forEach(p => {
          let diff = p.pos.sub(mousePos).mult(0.01);
          p.acc.addTo(diff);
        });
      }
    }
    obstacles.forEach(o => {
      let close = this.getParticlesCloseTo(o, 16);
      if (close.length > 0) {
        close.forEach(p => {
          let diff = p.pos.sub(o).mult(0.01);
          p.acc.addTo(diff);
        });
      }
      ctx.beginPath();
      ctx.arc(o.x, o.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    });

  }}


class Particle {
  constructor(pos) {
    this.pos = pos;
    this.vel = new Vector(Math.random() - 0.5, Math.random() - 0.5);
    this.acc = new Vector(Math.random() - 0.5, Math.random() - 0.5).mult(0.6);
    this.tail = [];
    this.tailLength = 10;
  }
  move(delta) {
    this.vel.addTo(this.acc.mult(delta * 0.2));
    if (this.tail.length > this.tailLength) {
      this.tail.splice(0, 1);
    }
    this.tail.push(this.pos.copy());
    if (this.vel.getLength() > 2) this.vel.setLength(2);
    this.pos.addTo(this.vel);
    if (this.pos.x > w) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = w;
    if (this.pos.y > h) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = h;
    this.acc.x = 0;
    this.acc.y = 0;
  }
  draw(ctx) {

    for (let i = 0; i < this.tail.length - 1; i++) {
      let p1 = this.tail[i];
      let p2 = this.tail[i + 1];
      if (p1.distanceTo(p2) < 50) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    /*
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.vel.getAngle());
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.restore();
    */
  }}


function pointermove(event) {
  mouseX = event.clientX;
  mouseY = event.clientY;
}

function pointerout() {
  mouseX = undefined;
  mouseY = undefined;
}

function pointerdown(event) {
  obstacles.push(new Vector(event.clientX, event.clientY));
}

function setup() {
  obstacles = [];
  then = performance.now();
  canvas = document.querySelector("#canvas");
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", () => {
    resize();
  });
  reset();
  canvas.addEventListener("pointermove", pointermove);
  canvas.addEventListener("pointerout", pointerout);
  canvas.addEventListener("pointerdown", pointerdown);


  let settings = QuickSettings.create();
  settings.addRange("Cohesion radius", 3, 500, config.cohesionRadius, 1, val => config.cohesionRadius = val);
  settings.addRange("Cohesion strength", 1, 100, config.cohesionStrength, 1, val => config.cohesionStrength = val);

  settings.addRange("Separation radius", 3, 500, config.separationRadius, 1, val => config.separationRadius = val);
  settings.addRange("Separation strength", 1, 100, config.separationStrength, 1, val => config.separationStrength = val);

  settings.addRange("Alignment radius", 3, 500, config.alignmentRadius, 1, val => config.alignmentRadius = val);
  settings.addRange("Alignment strength", 1, 100, config.alignmentStrength, 1, val => config.alignmentStrength = val);
  settings.addButton("Reset agents", reset);
  settings.addButton("Clear obstacles", () => obstacles = []);
}

function reset() {
  swarm = new Swarm(w, h);
  //ctx.fillStyle = "white";
  //ctx.fillRect(0, 0, w, h);
}

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  //ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
}

function draw(now) {
  let delta = now - then;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "black";
  requestAnimationFrame(draw);
  swarm.update(ctx, delta);
  then = now;
}

setup();
draw(performance.now());