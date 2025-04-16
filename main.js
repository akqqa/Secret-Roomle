import { Room, Generator } from './RoomGenerator.js';
//import seedrandom from 'seedrandom';
console.log(window.seedrandom);

console.log("js loaded");

//Math.seedrandom(5);

let generator = new Generator(4, false, false, true);
generator.generateMap();
//generator.printMap();

const imagePaths = ["images/emptyRoom.png", "images/bossRoom.png", "images/shopRoom.png", "images/itemRoom.png"];
const images = [];  
let imagesLoaded = 0; 

let counter = 0;
imagePaths.forEach((path, index) => {
    const image = new Image();
    image.src = path;
    let asyncCounter = counter; // needed for callback to use the correct counter
    counter++; 
    image.onload = () => {
        asyncCounter 
        images[asyncCounter] = image;
        console.log(image);
        imagesLoaded++;
    };
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
var hoveredRoom = null;

function checkImagesLoaded() {
    if (imagesLoaded === imagePaths.length) {
        drawMap(canvas, ctx);
    } else {
        requestAnimationFrame(checkImagesLoaded);
    }
}

checkImagesLoaded();


function drawMap(canvas, ctx, hoveredRoom = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 30; x < 420; x += 30) {
        for (let y = 30; y < 420; y += 30) {
            let room = generator.map[(y/30) - 1][(x/30) - 1];
            if (room !== undefined) {
                if (room.type == "boss") {
                    ctx.drawImage(images[1], x, y, 30, 30);
                } else if (room.type == "shop") {
                    console.log("ROOM IS A SHOP");
                    ctx.drawImage(images[2], x, y, 30, 30);
                } else if (room.type == "item") {
                    ctx.drawImage(images[3], x, y, 30, 30);
                } else if (room.type != "secret" && room.type != "supersecret" ) { 
                    console.log(images[0])
                    ctx.drawImage(images[0], x, y, 30, 30);
                    
                }
                // Draw rocks
                if (room.rocks[0] == true) {
                    ctx.beginPath();
                    ctx.fillStyle = "red";
                    ctx.rect(x+12, y, 6,6);
                    ctx.fill();
                }
                if (room.rocks[1] == true) {
                    ctx.beginPath();
                    ctx.fillStyle = "red";
                    ctx.rect(x+12, y+24, 6,6);
                    ctx.fill();
                }
                if (room.rocks[2] == true) {
                    ctx.beginPath();
                    ctx.fillStyle = "red";
                    ctx.rect(x, y+12, 6,6);
                    ctx.fill();
                }
                if (room.rocks[3] == true) {
                    ctx.beginPath();
                    ctx.fillStyle = "red";
                    ctx.rect(x+24, y+12, 6,6);
                    ctx.fill();
                }
            }  
            // If room is undefined or a hidden secret room, then if the current hovered coordinates are this room, fill it grey.
            if (hoveredRoom && (room === undefined || (room.type == "secret" && room.hidden) || (room.type == "supersecret" && room.hidden))) { // fiddly short circuiting
                if ((y/30) - 1 == (Math.floor(hoveredRoom[1]/30)) - 1 && (x/30) - 1 == (Math.floor(hoveredRoom[0]/30)) - 1) {
                    ctx.beginPath();
                    ctx.fillStyle = "grey";
                    ctx.rect(x, y, 30,30);
                    ctx.fill();
                }
            }
        }
    }
}

// Event listener for moving mouse over canvas - https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/
canvas.addEventListener("mousemove", event => {
    let transform = ctx.getTransform();
    let transformedX = event.offsetX - transform.e;
    let transformedY = event.offsetY - transform.f;
    drawMap(canvas, ctx, [transformedX, transformedY]);
})




