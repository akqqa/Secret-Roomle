import { Room, Generator } from './RoomGenerator.js';
//import seedrandom from 'seedrandom';
console.log(window.seedrandom);


console.log("js loaded");

Math.seedrandom(5);

let generator = new Generator(4, false, false, false);
generator.generateMap();
//generator.printMap();

// Issue with this loading after the domcontentloaded and thus not showing. ugh. need promises or async or smth
// Something like - each image has an onload which increments a counter. once counter is full, run the drawing
const emptyRoom = new Image();
emptyRoom.src = "images/emptyRoom.png"

const imagePaths = ['images/emptyRoom.png']
const images = [];  
let imagesLoaded = 0; 

imagePaths.forEach((path, index) => {
    const image = new Image();
    image.src = path;
    image.onload = () => {
        images.push(image);
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
            if (room !== undefined && room.type != "secret" && room.type != "supersecret" ) { 
                ctx.drawImage(emptyRoom, x, y, 30, 30);
            }
        }
    }
}



