import { Room, Generator } from './RoomGenerator.js';

//Size constants
const roomSize = 50;
const mapSize = roomSize * 15;
const halfCell = roomSize / 2.5;
const rockSize = roomSize / 5;
//import seedrandom from 'seedrandom';
console.log(window.seedrandom);

// Need to add a main routing part where checks the users cookies, if done for today dont give them the game, if not give them the game. etc. nothing complex! all local
// Can have an unlimited page just for practice :) - just do another html page where it doesnt care for cookies and lets you press r etc.

console.log("js loaded");

//Math.seedrandom(5);

// ON PAGE LOAD LOAD IMAGES
const imagePaths = ["images/emptyRoom.png", "images/bossRoom.png", "images/shopRoom.png", "images/itemRoom.png", "images/secretRoom.png", "images/superSecretRoom.png"];
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
        imagesLoaded++;
    };
});

// Create canvas and various variables
const canvas = document.getElementById('gameCanvas');
// Set canvas dimensions
canvas.width = mapSize;
canvas.height = mapSize;
const ctx = canvas.getContext('2d');
var hoveredRoom = null;
var generator = new Generator(Math.floor(Math.random()*13 + 1), false, false, true);

var stage = 0; // stage = 1 is room types, stage = 2 is rocks
var guesses = 4;
var secretFound = false;
var supersecretFound = false;
var attempts = 0;
var gameover = false;

checkImagesLoaded(); // Checks if images are loaded. If so, starts the game.

function checkImagesLoaded() {
    if (imagesLoaded === imagePaths.length) {
        startGame();
    } else {
        requestAnimationFrame(checkImagesLoaded);
    }
}


// Sets variables, and generates map, starting the game
function startGame() {
    stage = 0; // stage = 1 is room types, stage = 2 is rocks
    guesses = 4;
    secretFound = false;
    supersecretFound = false;
    attempts = 0;
    gameover = false;
    generator.generateMap();
    drawMap();
}

// Draws the map, also accounting for which room is hovered over, and what the current game stage is
function drawMap(hoveredRoom = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
        for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
            let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];

            // If room is undefined or a hidden secret room, then if the current hovered coordinates are this room, fill it grey.
            if (hoveredRoom && (room === undefined || (room.type == "secret" && room.hidden) || (room.type == "supersecret" && room.hidden))) { // fiddly short circuiting
                if ((y/roomSize) - 1 == (Math.floor(hoveredRoom[1]/roomSize)) - 1 && (x/roomSize) - 1 == (Math.floor(hoveredRoom[0]/roomSize)) - 1) {
                    ctx.beginPath();
                    ctx.fillStyle = "black";
                    ctx.rect(x, y, roomSize,roomSize);
                    ctx.fill();
                }
            }

            if (stage == 0) {
                if (room !== undefined) {
                    if (room.type == "wrong") {
                        ctx.beginPath();
                        ctx.fillStyle = "red";
                        ctx.rect((room.posX+1)*roomSize, (room.posY+1)*roomSize, roomSize,roomSize);
                        ctx.fill();
                    } else if (room.type == "secret" && !room.hidden) {
                        ctx.drawImage(images[4], x, y, roomSize, roomSize);
                    } else if (room.type == "supersecret" && !room.hidden) {
                        ctx.drawImage(images[5], x, y, roomSize, roomSize);
                    } else if (!room.hidden) {
                        ctx.drawImage(images[0], x, y, roomSize, roomSize);
                    }
                }
                // Add coniditon for if exposed secret room should still draw the ?
            }
            if (stage == 1 || stage == 2) {
                if (room !== undefined) {
                    if (room.type == "boss") {
                        ctx.drawImage(images[1], x, y, roomSize, roomSize);
                    } else if (room.type == "shop") {
                        ctx.drawImage(images[2], x, y, roomSize, roomSize);
                    } else if (room.type == "item") {
                        ctx.drawImage(images[3], x, y, roomSize, roomSize);
                    } else if (room.type == "wrong") {
                        ctx.beginPath();
                        ctx.fillStyle = "red";
                        ctx.rect((room.posX+1)*roomSize, (room.posY+1)*roomSize, roomSize,roomSize);
                        ctx.fill();
                    } else if (room.type == "secret" && !room.hidden) {
                        ctx.drawImage(images[4], x, y, roomSize, roomSize);
                    } else if (room.type == "supersecret" && !room.hidden) {
                        ctx.drawImage(images[5], x, y, roomSize, roomSize);
                    } else if (!room.hidden) { 
                        ctx.drawImage(images[0], x, y, roomSize, roomSize); 
                    }
                }
            }
            if (stage == 2) {
                // Draw rocks
                if (room !== undefined) {
                    if (room.rocks[0] == true) {
                        ctx.beginPath();
                        ctx.fillStyle = "red";
                        ctx.rect(x+halfCell, y, rockSize,rockSize);
                        ctx.fill();
                    }
                    if (room.rocks[1] == true) {
                        ctx.beginPath();
                        ctx.fillStyle = "red";
                        ctx.rect(x+halfCell, y+(halfCell*2), rockSize,rockSize);
                        ctx.fill();
                    }
                    if (room.rocks[2] == true) {
                        ctx.beginPath();
                        ctx.fillStyle = "red";
                        ctx.rect(x, y+halfCell, rockSize,rockSize);
                        ctx.fill();
                    }
                    if (room.rocks[3] == true) {
                        ctx.beginPath();
                        ctx.fillStyle = "red";
                        ctx.rect(x+(halfCell*2), y+halfCell, rockSize,rockSize);
                        ctx.fill();
                    }
                }
            } 
        }
    }
}

// Event listener for moving mouse over canvas - https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/
canvas.addEventListener("mousemove", event => {
    if (!gameover) {
        let transform = ctx.getTransform();
        let transformedX = event.offsetX - transform.e;
        let transformedY = event.offsetY - transform.f;
        drawMap([transformedX, transformedY]);
    }
})

// Handles guesses by the player
canvas.addEventListener("click", event => {
    if (!gameover) {
        let transform = ctx.getTransform();
        let transformedX = event.offsetX - transform.e;
        let transformedY = event.offsetY - transform.f;
        let y = Math.floor(transformedY/roomSize) - 1;
        let x = Math.floor(transformedX/roomSize) - 1;
        let room = generator.map[y][x];
        // If room is undefined, set it to a wrong room
        if (room === undefined) {
            let newRoom = new Room(y,x);
            newRoom.type = "wrong";
            generator.map[y][x] = newRoom;
            guesses -= 1;
            stage = Math.min(2, stage+1);
        } else if (room.type == "secret") {
            room.hidden = false;
            secretFound = true;
        } else if (room.type == "supersecret") {
            room.hidden = false;
            supersecretFound = true;
        }

        // Loss logic
        if (guesses == 0) {
            gameover = true;
            stage = 2;
            // Unhide secret rooms
            for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
                for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
                    let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];
                    if (room !== undefined && room.hidden == true) {
                        room.hidden = false;
                    }
                }
            }
            drawMap(null);
            ctx.beginPath();
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.rect(0, mapSize / 3, mapSize, mapSize / 3);
            ctx.fill();

        }
        console.log(secretFound);
        console.log(supersecretFound);

        // Win logic
        if (secretFound && supersecretFound) {
            gameover = true;
            stage = 2;
            drawMap(null);
            ctx.beginPath();
            ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
            ctx.rect(0, mapSize / 3, mapSize, mapSize / 3);
            ctx.fill();
        }
    }
})

addEventListener("keydown", (event) => {
    if (event.key == "r") {
        console.log("r key!")
        startGame();
    }
});

// Next: Add onclick listener, if secret room clicked reveal, if not, colour it in and add 1 to the stage. after 4 stages fail. MAYBE actuall add 4 stages the first reveals where the starting room is to help find the boss room
// ALSO MAYBE THE DEEPER THE MAP IS THE MORE ATTEMPTS YOU GET



