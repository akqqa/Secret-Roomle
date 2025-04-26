import { Room, Generator } from './RoomGenerator.js';

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

var bombSfx = new Audio("sfx/explosion.wav");
var secretRoomSfx = new Audio("sfx/secret.ogg");
var winSfx = new Audio("sfx/specialist.mp3");
var loseSfx = new Audio("sfx/lose.ogg");
var deathSfx = new Audio("sfx/death.wav");

const startingGuesses = 6;

//Size constants
var size;
var roomSize;
var mapSize;
var halfCell;
var rockSize;
let currentDate = new Date();
let seed = currentDate.getUTCDate().toString() + currentDate.getUTCMonth().toString() + currentDate.getUTCFullYear().toString(); //+ currentDate.getUTCMinutes().toString();
console.log(seed);
Math.seedrandom(seed); 

let visualSize = 1;
// Create canvas and various variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.scale(size/visualSize, size/visualSize);

setScaling();
canvas.width = mapSize;
canvas.height = mapSize;

// ON PAGE LOAD LOAD IMAGES
const imageNames = ["emptyRoom", "bossRoom", "shopRoom", "itemRoom", "secretRoom", 
    "superSecretRoom", "planetariumRoom", "diceRoom", "sacrificeRoom", "libraryRoom", 
    "curseRoom", "minibossRoom", "challengeRoom", "bossChallengeRoom", "arcadeRoom", 
    "vaultRoom", "bedroomRoom", "rock", "scorch", "bomb"];

function cacheImages() {
    const promises = imageNames.map(name => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                imageCache[name] = img;
                resolve();
            };
            img.onerror = (err) => reject(err);
            img.src = `./images/${name}.png`;
        });
    });

    return Promise.all(promises);
}

const imageCache = {};
await cacheImages();

// Variables
var generator = null;
var levelnum = null;
var curseLabyrinth = null;
var curseLost = null;
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

// Gets the stored data if any in storage
var gamedata = localStorage.getItem("secretRoomleData");

startGame();
countdown();
setInterval(countdown, 1000);

function initializeGamedata() {
    // Once game starts, load localstorage gamedata and load in the data if relevant
    // Get game data
    gamedata = localStorage.getItem("secretRoomleData");
    let localStorageDate = new Date();
    if (gamedata) {
        let parsedData = JSON.parse(gamedata);
        // If no longer the data in saved data, replace it with fresh data - FORGOT TO RESET THE MAP OOPS
        if ( localStorageDate.getUTCDate().toString() + localStorageDate.getUTCMonth().toString() + localStorageDate.getUTCFullYear().toString() /*+ localStorageDate.getUTCMinutes().toString() */!= parsedData.lastPlayedDate) {
            parsedData.lastPlayedDate = localStorageDate.getUTCDate().toString() + localStorageDate.getUTCMonth().toString() + localStorageDate.getUTCFullYear().toString(); //+ localStorageDate.getUTCMinutes().toString();
            parsedData.currentMap = null;
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
            if (parsedData.currentMap != null) {
                generator.map = parsedData.currentMap;
            }
            stage = parsedData.currentProgress.stage;
            guesses = parsedData.currentProgress.guesses;

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
            lastPlayedDate: localStorageDate.getUTCDate().toString() + localStorageDate.getUTCMonth().toString() + localStorageDate.getUTCFullYear().toString(), // + localStorageDate.getUTCMinutes().toString(),
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
    setElements();
}

// Sets the text of the page based on game data and current game
function setElements() {
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
    if (curseLabyrinth) {
        curse = "curse of the labyrinth";
    }
    if (curseLost) {
        curse = "curse of the lost";
    }
    document.getElementById("cursename").textContent = curse;

    // Background based on level
    let levelnameTrimmed = levelname;
    if (levelname.includes(" ") && levelname != "Dark Room") {
        levelnameTrimmed = levelname.substring(0, levelname.lastIndexOf(" "));
    }
    let backgroundPath = "./images/Backgrounds/" + levelnameTrimmed + ".png";
    document.getElementById("body").style.backgroundImage = `url("${backgroundPath}")`;
    document.getElementById("gameCanvas").style.backgroundImage = `url("${backgroundPath}")`;
    document.getElementById("gameCanvas").style.backgroundPosition = "center"; // Center the image
    document.getElementById("gameCanvas").style.backgroundSize = "100% 100%"; // Stretch the image to fit the canvas
    document.getElementById("gameCanvas").style.backgroundRepeat = "no-repeat"; // Prevent image repetition
}

// Sets variables, and generates map, starting the game
function startGame() {

    Math.seedrandom(seed); // THERE WAS SOME WEIRD RACE CONDITION THAT MADE THE SEED SWITCH BETWEEN 2 !!! FIXED.

    document.getElementById("gameOverModal").style.display = "none"; // closes modal on refreshr

    levelnum = Math.floor(Math.random()*12 + 1)
    console.log(levelnum);
    curseLabyrinth = false;
    curseLost = false;
    if (Math.random() < 0.3) {
        if (Math.random() < 0.8 && (levelnum % 2 != 0 && levelnum < 9)) { // Only labyrinth if first floor of chapter
            curseLabyrinth = true;
        } else {
            curseLost = true;
        }
    }
    hard =  Math.random() < 0.5;
    generator = new Generator(levelnum, curseLabyrinth, lost, hard);
    levelname = floornames[levelnum-1][Math.floor(Math.random() * floornames[levelnum-1].length)]

    stage = 0; // stage = 1 is room types, stage = 2 is rocks
    guesses = (
        levelnum <= 6 ? startingGuesses :
        levelnum <= 11 ? startingGuesses + 2 : // +2 as harder without rooms - more dead ends for super secret
        levelnum === 12 ? startingGuesses + 6 : // Void is nasty
        null); // Attempt at balance based on starting floor
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
async function drawMap(hoveredRoom = null) {
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
                    drawCachedImage("bomb", x, y, roomSize, roomSize);
                }
            }

            if (stage == 0) {
                if (room) {
                    if (room.type == "wrong") {
                        drawCachedImage("scorch", x, y, roomSize, roomSize);
                    } else if (room.type == "secret" && !room.hidden) {
                        drawCachedImage("secretRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "supersecret" && !room.hidden) {
                        drawCachedImage("superSecretRoom", x, y, roomSize, roomSize);
                    } else if (!room.hidden) {
                        drawCachedImage("emptyRoom", x, y, roomSize, roomSize);
                    }
                }
                // Add condition for if exposed secret room should still draw the ?
            }
            if (stage == 1 || stage == 2) {
                if (room) { // Yes, i should have used a map or something. sue me.
                    if (room.type == "boss") {
                        drawCachedImage("bossRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "shop") {
                        drawCachedImage("shopRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "item") {
                        drawCachedImage("itemRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "wrong") {
                        drawCachedImage("scorch", x, y, roomSize, roomSize);
                    } else if (room.type == "secret" && !room.hidden) {
                        drawCachedImage("secretRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "supersecret" && !room.hidden) {
                        drawCachedImage("superSecretRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "planetarium" && !room.hidden) {
                        drawCachedImage("planetariumRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "dice" && !room.hidden) {
                        drawCachedImage("diceRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "sacrifice" && !room.hidden) {
                        drawCachedImage("sacrificeRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "library" && !room.hidden) {
                        drawCachedImage("libraryRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "curse" && !room.hidden) {
                        drawCachedImage("curseRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "miniboss" && !room.hidden) {
                        drawCachedImage("minibossRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "challenge" && !room.hidden) {
                        drawCachedImage("challengeRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "bosschallenge" && !room.hidden) {
                        drawCachedImage("bossChallengeRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "arcade" && !room.hidden) {
                        drawCachedImage("arcadeRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "vault" && !room.hidden) {
                        drawCachedImage("vaultRoom", x, y, roomSize, roomSize);
                    } else if (room.type == "bedroom" && !room.hidden) {
                        drawCachedImage("bedroomRoom", x, y, roomSize, roomSize);
                    } else if (!room.hidden) { 
                        drawCachedImage("emptyRoom", x, y, roomSize, roomSize); 
                    }
                }
            }
            if (stage == 2) {
                // Draw rocks
                if (room) {
                    if (room.rocks[0] == true) {
                        drawCachedImage("rock", x+halfCell, y, rockSize, rockSize);
                    }
                    if (room.rocks[1] == true) {
                        drawCachedImage("rock", x+halfCell, y+(halfCell*2), rockSize, rockSize);
                    }
                    if (room.rocks[2] == true) {
                        drawCachedImage("rock", x, y+halfCell, rockSize, rockSize);
                    }
                    if (room.rocks[3] == true) {
                        drawCachedImage("rock", x+(halfCell*2), y+halfCell, rockSize, rockSize);
                    }
                }
            } 
        }
    }

    // Won or lost
    if (lost) {
        ctx.beginPath();
        ctx.font = "200px Upheaval";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.rect(0, mapSize / 20, mapSize, mapSize * 2 / 20 );
        ctx.fill();
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillText("You lose!", mapSize / 2, mapSize*1.8 / 20);
    } else if (won) {
        ctx.beginPath();
        ctx.font = "200px Upheaval";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.rect(0, mapSize / 20, mapSize, mapSize * 2 / 20 );
        ctx.fill();
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillText("You win!", mapSize / 2, mapSize*1.8 / 20);
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
    let newSeed = newDate.getUTCDate().toString() + newDate.getUTCMonth().toString() + newDate.getUTCFullYear().toString();// + newDate.getUTCMinutes().toString();
    //let newSeed = seed + 1; // for testing regeneration
    if (seed != newSeed) {
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

        seed = newSeed
        Math.seedrandom(newSeed); 
        startGame();
    }
}

canvas.addEventListener("mousemove", event => {
    if (!gameover) {
        let transform = ctx.getTransform();
        let transformedX = (event.offsetX - transform.e) * (size/visualSize);
        let transformedY = (event.offsetY - transform.f) * (size/visualSize);
        drawMap([transformedX, transformedY]);
    }
})

// Remove hover once out
canvas.addEventListener("mouseout", event => {
    if (!gameover) {
        drawMap();
    }
})

// Handles guesses by the player
canvas.addEventListener("click", event => {
    if (!gameover) {
        // If this is the first click of a new game, add to total games played in stats (so entering counts as a game played, as you can get secret rooms even if you dont "win")
        if (stage == 0 && !secretFound && !supersecretFound) {
            gamedata.stats.totalGames += 1;
        }

        let transform = ctx.getTransform();
        let transformedX = (event.offsetX - transform.e) * (size/visualSize);
        let transformedY = (event.offsetY - transform.f) * (size/visualSize);
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
            bombSfx.pause();
            bombSfx.currentTime = 0;
            bombSfx.play();
        } else if (room.type == "secret" && room.hidden) {
            room.hidden = false;
            secretFound = true;
            gamedata.stats.secretRoomsFound += 1;
            guesses -= 1;
            bombSfx.pause();
            bombSfx.currentTime = 0;
            secretRoomSfx.pause();
            secretRoomSfx.currentTime = 0;
            bombSfx.play();
            secretRoomSfx.play();
        } else if (room.type == "supersecret" && room.hidden) {
            room.hidden = false;
            supersecretFound = true;
            gamedata.stats.superSecretRoomsFound += 1;
            guesses -= 1;
            bombSfx.pause();
            bombSfx.currentTime = 0;
            secretRoomSfx.pause();
            secretRoomSfx.currentTime = 0;
            bombSfx.play();
            secretRoomSfx.play();
        }
        document.getElementById("guessesremaining").textContent = guesses; // Update guesses remaining visually

        // Loss logic
        if (guesses == 0 && !(secretFound && supersecretFound)) {
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
            // Modify users stats
            gamedata.stats.winStreak = 0;
            loseSfx.play();
            deathSfx.play();
        } else if (secretFound && supersecretFound) {
            gameover = true;
            won = true;
            lost = false;
            stage = 2;
            drawMap(null);
            // Modify users stats
            gamedata.stats.wins += 1;
            gamedata.stats.winStreak  += 1;
            if (gamedata.stats.winStreak > gamedata.stats.maxStreak) {
                gamedata.stats.maxStreak = gamedata.stats.winStreak;
            }
            // Stop sounds and play win
            secretRoomSfx.pause();
            secretRoomSfx.currentTime = 0;
            winSfx.play();
        }

        // Modal to display
        if (gameover) {
            let results = "";
            let winOrLoss = won;
            if (won) {
                winOrLoss = "won";
            } else {
                winOrLoss = "lost";
            }
            if (secretFound) {
                results += "Secret Room 🟩"
            } else {
                results += "Secret Room 🟥"
            }
            if (supersecretFound) {
                results += "\nSuper Secret Room 🟩"
            } else {
                results += "\nSuper Secret Room 🟥"
            }
            document.getElementById("gameOverText").textContent = `You ${winOrLoss} today's Secret Roomle! \n${results}\nYou had ${guesses} bomb(s) remaining.`;
            document.getElementById("gameOverModal").style.display = "block";
        }

        // After every valid click, update localstorage with info about todays game, overwriting it.
        gamedata.currentMap = generator.map;
        gamedata.currentProgress.stage = stage;
        gamedata.currentProgress.guesses = guesses;
        gamedata.currentProgress.secretFound = secretFound;
        gamedata.currentProgress.supersecretFound = supersecretFound;
        gamedata.currentProgress.attempts = attempts;
        gamedata.currentProgress.gameover = gameover;
        gamedata.currentProgress.won = won;
        gamedata.currentProgress.lost = lost;

        localStorage.setItem("secretRoomleData", JSON.stringify(gamedata));
        setElements();

        // DRAW THE DAMN MAP LOL
        drawMap();
    }
})

addEventListener("keydown", (event) => {
    // Add for inifnite mode
    if (event.key == "rlll") {
        console.log("r key!")
        seed = seed + 1;
        Math.seedrandom(seed);
        startGame();
    }
});

addEventListener("resize", (event) => {
    setScaling();
    canvas.width = mapSize;
    canvas.height = mapSize;
    drawMap();
});

// Attempt at mobile chrome app fix
addEventListener("load", (event) => {
    setTimeout(() => {
        setScaling();
        canvas.width = mapSize;
        canvas.height = mapSize;
        drawMap();
    }, 50);
})

document.getElementById("copyButton").addEventListener("click", (event) => {
    let text = document.getElementById('gameOverText').innerHTML;
    text = text.replace(/\bYou\b/g, 'I') + "\nhttps://roomle.pages.dev";
    text = text.replace(/<br\s*\/?>/gi, '\n');
    navigator.clipboard.writeText(text);
})

function setScaling() {
    visualSize = Math.ceil(Math.min(window.innerWidth * 0.85, 616));
    document.getElementById("gameCanvas").style.width = `${visualSize}px`;
    document.getElementById("gameCanvas").style.height = `${visualSize}px`;
    size = 2000; // Now scaled with css and ctx
    mapSize = size;
    roomSize = Math.ceil(mapSize / 15);
    halfCell = roomSize / 3;
    rockSize = roomSize / 3;
    ctx.scale(size/visualSize, size/visualSize);
}

// Draw an image from the cache loaded when page loaded
function drawCachedImage(imageName, x, y, width, height) {
    if (imageCache[imageName]) {
        ctx.drawImage(imageCache[imageName], x, y, width, height);
    } else {
        console.log("Uncached image error");
    }
}


