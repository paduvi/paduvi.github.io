/**
 * Copyright 2011 Paul Lewis. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// get a random number within a range
function random(min, max) {
    return Math.random() * ( max - min ) + min;
}

var Fireworks = (function () {

    // declare the variables we need
    var particles = [],
        targets = [],
        mainCanvas = null,
        mainContext = null,
        fireworkCanvas = null,
        fireworkContext = null,
        viewportWidth = 0,
        viewportHeight = 0,
        // when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
        limiterTotal = 5,
        limiterTick = 0,
        // this will time the auto launches of fireworks, one launch per 80 loop ticks
        timerTotal = 60,
        timerTick = 60,
        mousedown = false,
        clicked = false,
        hue = 120,
        // mouse x coordinate,
        mx,
        // mouse y coordinate
        my;

    /**
     * Create DOM elements and get your game on
     */
    function initialize() {

        // create a canvas for the fireworks
        mainCanvas = document.createElement('canvas');
        mainContext = mainCanvas.getContext('2d');

        // and another one for, like, an off screen buffer
        // because that's rad n all
        fireworkCanvas = document.createElement('canvas');
        fireworkContext = fireworkCanvas.getContext('2d');

        // set up the colours for the fireworks
        createFireworkPalette(12);

        // start by measuring the viewport
        onWindowResize();
        window.onresize = onWindowResize;

        // add the canvas in
        document.body.appendChild(mainCanvas);

        // mouse event bindings
        // update the mouse coordinates on mousemove
        ['mousemove', 'touchmove'].forEach(function (ev) {
            mainCanvas.addEventListener(ev, function (e) {
                if (e.targetTouches) {
                    mx = e.targetTouches[0].pageX - mainCanvas.offsetLeft;
                    my = e.targetTouches[0].pageY - mainCanvas.offsetTop;
                } else {
                    mx = e.pageX - mainCanvas.offsetLeft;
                    my = e.pageY - mainCanvas.offsetTop;
                }
            });
        });

        // toggle mousedown state and prevent canvas from being selected
        ['mousedown', 'touchstart'].forEach(function (ev) {
            mainCanvas.addEventListener(ev, function (e) {
                e.preventDefault();
                if (e.touches) {
                    console.log(e);
                    mx = e.touches[0].pageX - mainCanvas.offsetLeft;
                    my = e.touches[0].pageY - mainCanvas.offsetTop;
                } else {
                    mx = e.pageX - mainCanvas.offsetLeft;
                    my = e.pageY - mainCanvas.offsetTop;
                }
                mousedown = true;
                clicked = true;
            });
        });

        ['mouseup', 'touchend'].forEach(function (ev) {
            mainCanvas.addEventListener(ev, function (e) {
                e.preventDefault();
                mousedown = false;
            });
        })

        // and now we set off
        update();
    }

    /**
     * Create a new circle target
     */
    function createCircleTarget() {
        targets.push(new Target({
            x: mx,
            y: my
        }));
    }

    /**
     * Pass through function to create a
     * new firework on touch / click
     */
    function createFirework() {
        // launch fireworks automatically to random coordinates, when the mouse isn't down
        if (timerTick >= timerTotal) {
            if (!mousedown) {
                // start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
                if (clicked)
                    createParticle();
                timerTick = 0;
                timerTotal = Math.round(random(30, 60))
            }
        } else {
            timerTick++;
        }

        // limit the rate at which fireworks get launched when mouse is down
        if (limiterTick >= limiterTotal) {
            if (mousedown) {
                // start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
                createParticle();
                createCircleTarget();
                limiterTick = 0;
            }
        } else {
            limiterTick++;
        }
    }

    /**
     * Creates a block of colours for the
     * fireworks to use as their colouring
     */
    function createFireworkPalette(gridSize) {

        var size = gridSize * 10;
        fireworkCanvas.width = size;
        fireworkCanvas.height = size;
        fireworkContext.save();
        fireworkContext.globalCompositeOperation = 'source-over';

        // create 100 blocks which cycle through
        // the rainbow... HSL is teh r0xx0rz
        for (var c = 0; c < 100; c++) {

            var marker = (c * gridSize);
            var gridX = marker % size;
            var gridY = Math.floor(marker / size) * gridSize;

            fireworkContext.fillStyle = "hsl(" + Math.round(c * 3.6) + ",100%,60%)";
            fireworkContext.fillRect(gridX, gridY, gridSize, gridSize);
            fireworkContext.drawImage(
                Library.bigGlow,
                gridX,
                gridY);
        }
        fireworkContext.restore();
    }

    /**
     * Update the canvas based on the
     * detected viewport size
     */
    function setMainCanvasDimensions() {
        mainCanvas.width = viewportWidth;
        mainCanvas.height = viewportHeight;
    }

    /**
     * The main loop where everything happens
     */
    function update() {
        clearContext();
        createFirework();
        requestAnimFrame(update);
        drawCircleTargets();
        drawFireworks();
    }

    /**
     * Clears out the canvas with semi transparent
     * black. The bonus of this is the trails effect we get
     */
    function clearContext() {
        mainContext.fillStyle = "rgba(0,0,0,0.2)";
        mainContext.fillRect(0, 0, viewportWidth, viewportHeight);
    }

    /**
     * Draw circle targets
     */
    function drawCircleTargets() {
        hue += 0.5;
        var a = targets.length;

        while (a--) {
            var circle = targets[a];

            if (circle.update()) {
                targets.splice(a, 1);
            }
            circle.render(mainContext, hue);
        }
    }

    /**
     * Passes over all particles particles
     * and draws them
     */
    function drawFireworks() {
        var a = particles.length;

        while (a--) {
            var firework = particles[a];

            // if the update comes back as true
            // then our firework should explode
            if (firework.update()) {

                // kill off the firework, replace it
                // with the particles for the exploded version
                particles.splice(a, 1);

                // if the firework isn't using physics
                // then we know we can safely(!) explode it... yeah.
                if (!firework.usePhysics) {
                    var chance = Math.random()

                    if (chance < 0.5) {
                        FireworkExplosions.star(firework);
                    } else if (chance < 0.8) {
                        FireworkExplosions.circle(firework);
                    } else {
                        FireworkExplosions.heart(firework);
                    }
                }
            }

            // pass the canvas context and the firework
            // colours to the
            firework.render(mainContext, fireworkCanvas);
        }
    }

    /**
     * Creates a new particle / firework
     */
    function createParticle(pos, target, vel, color, usePhysics) {

        pos = pos || {};
        target = target || {};
        vel = vel || {};

        particles.push(
            new Particle(
                // position
                {
                    x: pos.x || viewportWidth * (Math.random() * 0.5 + 0.25),
                    y: pos.y || viewportHeight + 10
                },

                // target
                {
                    y: target.y || random(viewportHeight / 2 - 100, viewportHeight / 2)
                },

                // velocity
                {
                    x: vel.x || Math.random() * 3 - 1.5,
                    y: vel.y || 0
                },

                color || Math.floor(Math.random() * 100) * 12,

                usePhysics)
        );
    }

    /**
     * Callback for window resizing -
     * sets the viewport dimensions
     */
    function onWindowResize() {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        // set the dimensions on the canvas
        setMainCanvasDimensions();
    }

    // declare an API
    return {
        initialize: initialize,
        createParticle: createParticle
    };

})();

var Target = function (pos) {
    this.brightness = random(50, 70);
    this.pos = {
        x: pos.x,
        y: pos.y
    }
    this.targetRadius = 2;
    this.count = 0;
}

Target.prototype = {
    update: function () {
        // cycle the circle target indicator radius
        if (this.targetRadius < 10) {
            this.targetRadius += 0.3;
            return false;
        }
        if (this.count < 2) {
            this.count++;
            this.targetRadius = 2;
            return false;
        }
        return true;
    },

    render: function (ctx, hue) {
        ctx.save();
        ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
        ctx.beginPath();
        // draw the target for this firework with a pulsing circle
        ctx.arc(this.pos.x, this.pos.y, this.targetRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Represents a single point, so the firework being fired up
 * into the air, or a point in the exploded firework
 */
var Particle = function (pos, target, vel, marker, usePhysics) {

    // properties for animation
    // and colouring
    this.GRAVITY = 0.06;
    this.alpha = 1;
    this.easing = Math.random() * 0.02;
    this.fade = Math.random() * 0.1;
    this.gridX = marker % 120;
    this.gridY = Math.floor(marker / 120) * 12;
    this.color = marker;

    this.pos = {
        x: pos.x || 0,
        y: pos.y || 0
    };

    this.vel = {
        x: vel.x || 0,
        y: vel.y || 0
    };

    this.lastPos = {
        x: this.pos.x,
        y: this.pos.y
    };

    this.target = {
        y: target.y || 0
    };

    this.usePhysics = usePhysics || false;

};

/**
 * Functions that we'd rather like to be
 * available to all our particles, such
 * as updating and rendering
 */
Particle.prototype = {

    update: function () {

        this.lastPos.x = this.pos.x;
        this.lastPos.y = this.pos.y;

        if (this.usePhysics) {
            this.vel.y += this.GRAVITY;
            this.pos.y += this.vel.y;

            // since this value will drop below
            // zero we'll occasionally see flicker,
            // ... just like in real life! Woo! xD
            this.alpha -= this.fade;
        } else {

            var distance = (this.target.y - this.pos.y);

            // ease the position
            this.pos.y += distance * (0.03 + this.easing);

            // cap to 1
            this.alpha = Math.min(distance * distance * 0.00005, 1);
        }

        this.pos.x += this.vel.x;

        return (this.alpha < 0.005);
    },

    render: function (context, fireworkCanvas) {

        var x = Math.round(this.pos.x),
            y = Math.round(this.pos.y),
            xVel = (x - this.lastPos.x) * -5,
            yVel = (y - this.lastPos.y) * -5;

        context.save();
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = Math.random() * this.alpha;

        // draw the line from where we were to where
        // we are now
        context.fillStyle = "rgba(255,255,255,0.3)";
        context.beginPath();
        context.moveTo(this.pos.x, this.pos.y);
        context.lineTo(this.pos.x + 1.5, this.pos.y);
        context.lineTo(this.pos.x + xVel, this.pos.y + yVel);
        context.lineTo(this.pos.x - 1.5, this.pos.y);
        context.closePath();
        context.fill();

        // draw in the images
        context.drawImage(fireworkCanvas,
            this.gridX, this.gridY, 12, 12,
            x - 6, y - 6, 12, 12);
        context.drawImage(Library.smallGlow, x - 3, y - 3);

        context.restore();
    }

};

/**
 * Stores references to the images that
 * we want to reference later on
 */
var Library = {
    bigGlow: document.getElementById('big-glow'),
    smallGlow: document.getElementById('small-glow'),
};

/**
 * Stores a collection of functions that
 * we can use for the firework explosions. Always
 * takes a firework (Particle) as its parameter
 */
var FireworkExplosions = {

    /**
     * Explodes in a roughly circular fashion
     */
    circle: function (firework) {

        var count = 100;
        var angle = (Math.PI * 2) / count;
        while (count--) {

            var randomVelocity = 4 + Math.random() * 4;
            var particleAngle = count * angle;

            Fireworks.createParticle(
                firework.pos,
                null,
                {
                    x: Math.cos(particleAngle) * randomVelocity,
                    y: Math.sin(particleAngle) * randomVelocity
                },
                firework.color,
                true);
        }
    },

    heart: function (firework) {
        var count = 100;
        var angle = (Math.PI * 2) / count;
        var radius = random(20, 45);

        while (count--) {

            var randomVelocity = 1.5 + Math.random() * 2.5;
            var particleAngle = count * angle;

            var r = (Math.sin(particleAngle) * Math.sqrt(Math.abs(Math.cos(particleAngle))))
                / (Math.sin(particleAngle) + 1.4) - 2 * Math.sin(particleAngle) + 2;

            Fireworks.createParticle(
                {
                    x: r * radius * Math.cos(particleAngle) + firework.pos.x,
                    y: -r * radius * Math.sin(particleAngle) + firework.pos.y
                },
                null,
                {
                    x: r * Math.cos(particleAngle) * randomVelocity,
                    y: -r * Math.sin(particleAngle) * randomVelocity
                },
                firework.color,
                true);
        }
    },

    /**
     * Explodes in a star shape
     */
    star: function (firework) {

        // set up how many points the firework
        // should have as well as the velocity
        // of the exploded particles etc
        var points = 6 + Math.round(Math.random() * 15);
        var jump = 3 + Math.round(Math.random() * 7);
        var subdivisions = 10;
        var radius = 80;
        var randomVelocity = -(Math.random() * 3 - 6);

        var start = 0;
        var end = 0;
        var circle = Math.PI * 2;
        var adjustment = Math.random() * circle;

        do {

            // work out the start, end
            // and change values
            start = end;
            end = (end + jump) % points;

            var sAngle = (start / points) * circle - adjustment;
            var eAngle = ((start + jump) / points) * circle - adjustment;

            var startPos = {
                x: firework.pos.x + Math.cos(sAngle) * radius,
                y: firework.pos.y + Math.sin(sAngle) * radius
            };

            var endPos = {
                x: firework.pos.x + Math.cos(eAngle) * radius,
                y: firework.pos.y + Math.sin(eAngle) * radius
            };

            var diffPos = {
                x: endPos.x - startPos.x,
                y: endPos.y - startPos.y,
                a: eAngle - sAngle
            };

            // now linearly interpolate across
            // the subdivisions to get to a final
            // set of particles
            for (var s = 0; s < subdivisions; s++) {

                var sub = s / subdivisions;
                var subAngle = sAngle + (sub * diffPos.a);

                Fireworks.createParticle(
                    {
                        x: startPos.x + (sub * diffPos.x),
                        y: startPos.y + (sub * diffPos.y)
                    },
                    null,
                    {
                        x: Math.cos(subAngle) * randomVelocity,
                        y: Math.sin(subAngle) * randomVelocity
                    },
                    firework.color,
                    true);
            }

            // loop until we're back at the start
        } while (end !== 0);

    }

};

// Go
window.onload = function () {
    Fireworks.initialize();
};
