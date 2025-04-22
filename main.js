import { Room, Generator } from './RoomGenerator.js';
//import seedrandom from 'seedrandom';

// TODO - replace all stage, guesses etc. with just directly using gamedata!
// floor relevant background image, gueses remaining, infinite mode on diff page, general graphics changes. implement winstreaks, ultra secret? make larger floors easier?

const floornames = [
    ["Basement I", "Burning Basement I", "Cellar I"],
    ["Basement II", "Burning Basement II", "Cellar II"],
    ["Caves I", "Catacombs I", "Flooded Caves I"],
    ["Caves II", "Catacombs II", "Flooded Caves II"],
    ["Depths I", "Necropolis I", "Dank Depths I"],
    ["Depths II", "Necropolis II", "Dank Depths II"],
    ["Womb I", "Utero I", "Scarred Womb I"],
    ["Womb II", "Utero II", "Scarred Womb II"],
    ["Womb II", "Utero II", "Scarred Womb II"], // Technicality due to stage 9 being hush
    ["Cathederal", "Sheol"],
    ["Chest", "Dark Room"],
    ["Void"]
]

const startingGuesses = 6;

//Size constants
var size;
var roomSize;
var mapSize;
var halfCell;
var rockSize;
setScaling();
let currentDate = new Date();
let seed = currentDate.getUTCDate().toString() + currentDate.getUTCMonth().toString() + currentDate.getUTCFullYear().toString();
console.log(seed);
Math.seedrandom(seed); 


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
var generator = null;
var levelnum = null;
var labyrinth = null;
var lost = null;
var hard = null;
var levelname = null;


var stage = 0; // stage = 1 is room types, stage = 2 is rocks
var guesses = startingGuesses;
var secretFound = false;
var supersecretFound = false;
var attempts = 0;
var gameover = false;
var won = false;
var lost = false;

var gamedata = localStorage.getItem("secretRoomleData");


checkImagesLoaded(); // Checks if images are loaded. If so, starts the game.

function checkImagesLoaded() {
    if (imagesLoaded === imagePaths.length) {
        startGame();
        countdown();
        setInterval(countdown, 1000);
    } else {
        requestAnimationFrame(checkImagesLoaded);
    }
}

function initializeGamedata() {
    // Once game starts, load localstorage gamedata and load in the data if relevant
    // Get game data
    gamedata = localStorage.getItem("secretRoomleData");
    let localStorageDate = new Date();
    if (gamedata) {
        let parsedData = JSON.parse(gamedata);
        console.log("parsed data:")
        console.log(parsedData);
        // If no longer the data in saved data, replace it with fresh data
        if (localStorageDate.getUTCDate().toString() + localStorageDate.getUTCMonth().toString() + localStorageDate.getUTCFullYear().toString() != parsedData.lastPlayedDate) {
            parsedData.lastPlayedDate = localStorageDate.getUTCDate().toString() + localStorageDate.getUTCMonth().toString() + localStorageDate.getUTCFullYear().toString();
            parsedData.currentProgress = {stage: 0,
                                        guesses: startingGuesses,
                                        secretFound: false,
                                        supersecretFound: false,
                                        attempts: 0,
                                        gameover: false,
                                        won: false,
                                        lost: false
                                        };
        } else { // Otherwise set the variables to continue todays progress
            // Set generator variables to the saved ones
            console.log(parsedData.map)
            console.log(parsedData.currentProgress.stage);
            if (parsedData.currentMap != null) {
                generator.map = parsedData.currentMap;
                console.log("SETMAP");
                console.log(generator.map);
            }
            stage = parsedData.currentProgress.stage;
            guesses = parsedData.currentProgress.guesses;
            console.log(parsedData.currentProgress.guesses);

            secretFound = parsedData.currentProgress.secretFound;
            supersecretFound = parsedData.currentProgress.supersecretFound;
            attempts = parsedData.currentProgress.attempts;
            gameover = parsedData.currentProgress.gameover;
            won = parsedData.currentProgress.won;
            lost = parsedData.currentProgress.lost;
        }
        gamedata = parsedData;
    } else {
        gamedata = {
            lastPlayedDate: localStorageDate.getUTCDate().toString() + localStorageDate.getUTCMonth().toString() + localStorageDate.getUTCFullYear().toString(),
            currentMap: null,
            currentProgress: {
                stage: 0,
                guesses: startingGuesses,
                secretFound: false,
                supersecretFound: false,
                attempts: 0,
                gameover: false,
                won: false,
                lost: false
            },
            stats: {
                totalGames: 0,
                secretRoomsFound: 0,
                superSecretRoomsFound: 0,
                wins: 0,
                winStreak: 0,
                maxStreak: 0
            }
        };
    }
    localStorage.setItem("secretRoomleData", JSON.stringify(gamedata));

    // Set stats
    setStats();
}

function setStats() {
    document.getElementById("gamesPlayed").textContent = gamedata.stats.totalGames; 
    document.getElementById("gamesWon").textContent = gamedata.stats.wins; 
    document.getElementById("secretRoomsFound").textContent = gamedata.stats.secretRoomsFound; 
    document.getElementById("superSecretRoomsFound").textContent = gamedata.stats.superSecretRoomsFound; 
    document.getElementById("currentWinstreak").textContent = gamedata.stats.winStreak; 
    document.getElementById("bestWinstreak").textContent = gamedata.stats.maxStreak; 

    // Also set the guesses remaining for this current game
    document.getElementById("guessesremaining").textContent = guesses;
    document.getElementById("floorname").textContent = levelname;
    let curse = "no curse";
    if (labyrinth) {
        curse = "curse of the labyrinth";
    } else if (lost) {
        curse = "curse of the lost";
    }
    document.getElementById("cursename").textContent = curse;
}

// Sets variables, and generates map, starting the game
function startGame() {
    levelnum = Math.floor(Math.random()*12 + 1)
    labyrinth = false;
    lost = false;
    if (Math.random() < 0.6) {
        if (Math.random() < 0.5) {
            labyrinth = true;
        } else {
            lost = true;
        }
    }
    hard =  Math.random() < 0.5;
    generator = new Generator(levelnum, labyrinth, lost, hard);
    levelname = floornames[levelnum-1][Math.floor(Math.random() * floornames[levelnum-1].length)]

    stage = 0; // stage = 1 is room types, stage = 2 is rocks
    guesses = startingGuesses;
    secretFound = false;
    supersecretFound = false;
    attempts = 0;
    gameover = false;
    won = false;
    lost = false;
    generator.generateMap();

    initializeGamedata();

    drawMap();
}

// Draws the map, also accounting for which room is hovered over, and what the current game stage is
function drawMap(hoveredRoom = null) {
    if (generator == null) {
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
        for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
            let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];

            // If room is undefined or a hidden secret room, then if the current hovered coordinates are this room, fill it grey.
            if (hoveredRoom && (!room || (room.type == "secret" && room.hidden) || (room.type == "supersecret" && room.hidden))) { // fiddly short circuiting
                if ((y/roomSize) - 1 == (Math.floor(hoveredRoom[1]/roomSize)) - 1 && (x/roomSize) - 1 == (Math.floor(hoveredRoom[0]/roomSize)) - 1) {
                    ctx.beginPath();
                    ctx.fillStyle = "black";
                    ctx.rect(x, y, roomSize,roomSize);
                    ctx.fill();
                }
            }

            if (stage == 0) {
                if (room) {
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
                // Add condition for if exposed secret room should still draw the ?
            }
            if (stage == 1 || stage == 2) {
                if (room) {
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
                if (room) {
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

    // Won or lost
    if (lost) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.rect(0, mapSize / 3, mapSize, mapSize / 3);
        ctx.fill();
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.font = "50px Upheaval";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("You LOSE!", mapSize / 2, mapSize / 3);
    } else if (won) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.rect(0, mapSize / 3, mapSize, mapSize / 3);
        ctx.fill();
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.font = "50px Upheaval";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("You win!", mapSize / 2, mapSize / 3);
    }
}

// Function for timer, as well as updating the seed when a new date is rolled over to
function countdown() {
    const now = new Date();
    const utcNow = new Date(now.toUTCString());
    const tomorrow = new Date(utcNow);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const diff = tomorrow - utcNow;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById("countdown").textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    // Logic for changing seed and restarting game
    let newDate = new Date();
    let newSeed = newDate.getUTCDate().toString() + newDate.getUTCMonth().toString() + newDate.getUTCFullYear().toString();
    //let newSeed = seed + 1; // for testing regeneration
    if (seed != newSeed) {
        console.log("updating due to new seed");
        // Update gamedata before changing seed
        gamedata.lastPlayedDate = newSeed;
        gamedata.currentMap = null,
        gamedata.currentProgress = {
            stage: 0,
            guesses: startingGuesses,
            secretFound: false,
            supersecretFound: false,
            attempts: 0,
            gameover: false,
            won: false,
            lost: false
        }
        localStorage.setItem("secretRoomleData", JSON.stringify(gamedata));

        console.log(gamedata);

        seed = newSeed
        Math.seedrandom(newSeed); 
        startGame();
    }
    console.log(seed);

    
}

// Event listener for moving mouse over canvas - https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/
canvas.addEventListener("mousemove", event => {
    console.log("moved");
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
        // If this is the first click of a new game, add to total games played in stats (so entering counts as a game played, as you can get secret rooms even if you dont "win")
        if (stage == 0 && guesses == startingGuesses) {
            gamedata.stats.totalGames += 1;
        }

        let transform = ctx.getTransform();
        let transformedX = event.offsetX - transform.e;
        let transformedY = event.offsetY - transform.f;
        let y = Math.floor(transformedY/roomSize) - 1;
        let x = Math.floor(transformedX/roomSize) - 1;
        let room = generator.map[y][x];
        // If room is undefined, set it to a wrong room
        if (!room) {
            let newRoom = new Room(y,x);
            newRoom.type = "wrong";
            generator.map[y][x] = newRoom;
            stage = Math.min(2, stage+1);
            guesses -= 1;
        } else if (room.type == "secret" && room.hidden) {
            room.hidden = false;
            secretFound = true;
            gamedata.stats.secretRoomsFound += 1;
            guesses -= 1;
        } else if (room.type == "supersecret" && room.hidden) {
            room.hidden = false;
            supersecretFound = true;
            gamedata.stats.superSecretRoomsFound += 1;
            guesses -= 1;
        }
        document.getElementById("guessesremaining").textContent = guesses; // Update guesses remaining visually

        // Loss logic
        if (guesses == 0) {
            gameover = true;
            won = false;
            lost = true;
            stage = 2;
            // Unhide secret rooms
            for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
                for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
                    let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];
                    if (room && room.hidden == true) {
                        room.hidden = false;
                    }
                }
            }
            drawMap(null);
        }

        // Win logic
        if (secretFound && supersecretFound) {
            gameover = true;
            won = true;
            lost = false;
            stage = 2;
            drawMap(null);
            gamedata.stats.wins += 1;
        }

        // After every valid click, update localstorage with info about todays game, overwriting it.
        gamedata.currentMap = generator.map;
        console.log("updated map");
        gamedata.currentProgress.stage = stage;
        gamedata.currentProgress.guesses = guesses;
        gamedata.currentProgress.secretFound = secretFound;
        gamedata.currentProgress.supersecretFound = supersecretFound;
        gamedata.currentProgress.attempts = attempts;
        gamedata.currentProgress.gameover = gameover;
        gamedata.currentProgress.won = won;
        gamedata.currentProgress.lost = lost;

        console.log(gamedata.currentMap);
        localStorage.setItem("secretRoomleData", JSON.stringify(gamedata));
        setStats();
    }
})

addEventListener("keydown", (event) => {
    // Add for inifnite mode
    if (event.key == "r") {
        console.log("r key!")
        //seed = seed + 1;
        //Math.seedrandom(seed);
        //startGame();
    }
});

addEventListener("resize", (event) => {
    setScaling();
    canvas.width = mapSize;
    canvas.height = mapSize;
    drawMap();
});

function setScaling() {
    //size = Math.ceil(Math.min(window.innerWidth, window.innerHeight) * 0.66); old formula
    size = Math.ceil(Math.min(window.innerWidth * 0.85, 616))
    mapSize = size;
    roomSize = Math.ceil(mapSize / 15);
    halfCell = roomSize / 2.5;
    rockSize = roomSize / 5;
    console.log(size);
}

// Next: Add onclick listener, if secret room clicked reveal, if not, colour it in and add 1 to the stage. after 4 stages fail. MAYBE actuall add 4 stages the first reveals where the starting room is to help find the boss room
// ALSO MAYBE THE DEEPER THE MAP IS THE MORE ATTEMPTS YOU GET
// For womb + its very hard. consider changing it so that colour of your guess is equated to distance from a secret room. and make rocks more common



