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

function checkImagesLoaded() {
    if (imagesLoaded === imagePaths.length) {
        drawMap();
    } else {
        requestAnimationFrame(checkImagesLoaded);
    }
}

checkImagesLoaded();

function drawMap() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

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
        }
    }
}



