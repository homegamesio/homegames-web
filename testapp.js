console.log('ytoooo');

const { squish, unsquish } = require('squishjs');

const canvas = document.getElementById('tester-canvas');

const ctx = canvas.getContext('2d');

const scaleCoordinate = ({ x, y }) => {
    const xPercentage = x / 100;
    const yPercentage = y / 100;
    
    return {
        scaledX: xPercentage * canvas.width,
        scaledY: yPercentage * canvas.height
    }
};


let thingToRender = [
  [
     3, 36,  2, 43, 3,   0, 44, 2,  52,
    22,  5,  0,  5, 0,  95,  0, 5,   0,
    95,  0, 95,  0, 5,   0, 95, 0,   5,
     0,  5,  0, 53, 6, 255,  0, 0, 255
  ],
  [
     3, 36,  2, 43, 3,  1, 44,   2,  52,
    22,  5,  0,  5, 0, 50,  0,   5,   0,
    50,  0, 50,  0, 5,  0, 50,   0,   5,
     0,  5,  0, 53, 6,  0,  0, 255, 255
  ],
  [
     3, 36,  2, 43,  3,  2,  44, 2,  52,
    22, 50,  0,  5,  0, 95,   0, 5,   0,
    95,  0, 50,  0, 50,  0,  50, 0,  50,
     0,  5,  0, 53,  6,  0, 255, 0, 255
  ],
  [
     3, 36,  2, 43,  3,  3, 44,  2,  52,
    22, 50,  0, 50,  0, 95,  0, 50,   0,
    95,  0, 95,  0, 50,  0, 95,  0,  50,
     0, 50,  0, 53,  6,  0,  0,  0, 255
  ],
  [
     3, 36,  2, 43, 3,   4,  44,   2,  52,
    22,  5,  0, 50, 0,  50,   0,  50,   0,
    50,  0, 95,  0, 5,   0,  95,   0,   5,
     0, 50,  0, 53, 6, 255, 255, 255, 255
  ]
];

const drawMarker = ({ x, y, horizontal }) => {
    const { scaledX, scaledY } = scaleCoordinate({ x, y });

    if (horizontal) {
        const lineWidth = .015 * canvas.width;
        ctx.beginPath();
        ctx.moveTo(scaledX, scaledY);
        ctx.lineTo(scaledX + lineWidth, scaledY);
        ctx.stroke();
    } else {
        // line is 1.5% of height
        const lineHeight = .015 * canvas.height;
        ctx.beginPath();
        ctx.moveTo(scaledX, scaledY);
        ctx.lineTo(scaledX, scaledY + lineHeight);
        ctx.stroke();
    }
};

const drawMarkers = () => {
    const horizontalPoints = [
        [0, 10], 
        [0, 20], 
        [0, 30], 
        [0, 40], 
        [0, 50], 
        [0, 60], 
        [0, 70], 
        [0, 80], 
        [0, 90]
    ];

    const verticalPoints = [
        [10, 0], 
        [20, 0], 
        [30, 0], 
        [40, 0], 
        [50, 0], 
        [60, 0], 
        [70, 0], 
        [80, 0], 
        [90, 0]
    ];

    verticalPoints.forEach(coord => {
        drawMarker({x: coord[0], y: coord[1], horizontal: false });
    });

    horizontalPoints.forEach(coord => {
        drawMarker({x: coord[0], y: coord[1], horizontal: true });
    });

};

const drawThing = () => {
    thingToRender.forEach(thing => {
        const unsquished = unsquish(thing);
        const nodeCoordinates = unsquished.node.coordinates2d;
        const fill = unsquished.node.fill;

        if (fill) {
            ctx.fillStyle = `rgba(${fill[0]}, ${fill[1]}, ${fill[2]}, ${fill[3]})`;
        } else {
            ctx.fillStyle = 'none';
        }
        ctx.beginPath();
        
        const startPoint = [nodeCoordinates[0], nodeCoordinates[1]];

        const scaledStartPoint = scaleCoordinate({x: startPoint[0], y: startPoint[1]});
        ctx.moveTo(scaledStartPoint.scaledX, scaledStartPoint.scaledY);

        for (let i = 2; i < nodeCoordinates.length; i+=2) {
            const currentPoint = [nodeCoordinates[i], nodeCoordinates[i + 1]];
            const { scaledX, scaledY } = scaleCoordinate({ x: currentPoint[0], y: currentPoint[1] });
            ctx.lineTo(scaledX, scaledY);
        }

        ctx.fill();
    });
};

const draw = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMarkers();
    drawThing();
};

draw();

window.addEventListener('resize', draw);
