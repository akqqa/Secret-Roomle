import { Room, Generator } from './RoomGenerator.js';

export function runCore(gamemode) {
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

    var debugmode = false;

    var bombSfx = new Audio("sfx/explosion.wav");
    bombSfx.volume = 0.1;
    var secretRoomSfx = new Audio("sfx/secret.ogg");
    secretRoomSfx.volume = 0.2;
    var winSfx = new Audio("sfx/specialist.mp3");
    winSfx.volume = 0.2;
    var loseSfx = new Audio("sfx/lose.ogg");
    loseSfx.volume = 0.2;
    var deathSfx = new Audio("sfx/death.wav");
    deathSfx.volume = 0.2;
    var goldenKey = new Audio("sfx/golden key.wav");
    goldenKey.volume = 0.2;
    var isMuted = false;

    var hardMode = false;

    const startingGuesses = 6;

    //Size constants
    var size;
    var roomSize;
    var mapSize;
    var halfCell;
    var rockSize;
    let currentDate = new Date();

    let seed = null;
    var seedIncrement = 0; // For debugging purposes set this to the number of days in the future you want the puzzle to be 
    if (gamemode == "daily") {
        seed = getPuzzleNumber();
        Math.seedrandom(seed); 
    }


    let visualSize = 1;
    // Create canvas and various variables
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.scale(size/visualSize, size/visualSize);


    // https://stackoverflow.com/questions/44484547/screen-width-screen-height-not-updating-after-screen-rotation iphones dont change screen.width when rotating, but the ability to zoom + fix on chrome and others when rotating is worth this minor flaw. still fully usable.
    if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        setScaling(screen.width); 
    } else {
        setScaling(window.innerWidth);
    }
    canvas.width = mapSize;
    canvas.height = mapSize;

    // ON PAGE LOAD LOAD IMAGES
    const imageNames = ["emptyRoom", "bossRoom", "shopRoom", "itemRoom", "secretRoom", 
        "superSecretRoom", "planetariumRoom", "diceRoom", "sacrificeRoom", "libraryRoom", 
        "curseRoom", "minibossRoom", "challengeRoom", "bossChallengeRoom", "arcadeRoom", 
        "vaultRoom", "bedroomRoom", "rock", "scorch", "bomb", "startRoom", "redRoom", "blueRoom", "ultraSecretRoom"];

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

    var gameImagesLoaded = false;

    drawMap();

    const imageCache = {};
    cacheImages().then(() => {
        gameImagesLoaded = true;
        startTime = Date.now(); // SET START TIME TO BE THE TIME WHERE THE GAME ACTUALLY LOADS
        drawMap();
    });

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
    var ultrasecretFound = false;
    var attempts = 0;
    var gameover = false;
    var won = false;
    var lost = false;

    var startTime = Date.now(); // The time the puzzle was loaded, to get an accurate time diff
    var gameTime = 0; // Timer works by taking gametime and adding to it the num of ms since timer restarted

    // Gets the stored data if any in storage
    if (gamemode == "daily") {
        var gamedata = localStorage.getItem("secretRoomleData");
    }
    var settingsdata = localStorage.getItem("settingsData");
    settingsdata = JSON.parse(settingsdata);
    if (settingsdata && settingsdata.isMuted) {
        setMute();
    }
    if (gamemode == "daily" && settingsdata && settingsdata.hardModeDaily) {
        setHard(true);
    }
    if (gamemode == "endless" && settingsdata && settingsdata.hardModeEndless) {
        setHard(true);
    }
    if (!settingsdata) {
        settingsdata = {isMuted: false};
    }

    startGame();
    if (gamemode == "daily") {
        countdown();
        setInterval(countdown, 1000);
        setInterval(timer, 10);
    }

    function initializeGamedata(levelGuesses) {
        // Once game starts, load localstorage gamedata and load in the data if relevant
        // Get game data
        if (gamemode == "daily") {

            gamedata = localStorage.getItem("secretRoomleData");
            if (gamedata) {
                let parsedData = JSON.parse(gamedata);
                // If no longer the data in saved data, replace it with fresh data
                if ( getPuzzleNumber()!= parsedData.lastPlayedDate) {
                    parsedData.lastPlayedDate = getPuzzleNumber();
                    parsedData.currentMap = null;
                    parsedData.currentProgress = {stage: 0,
                                                guesses: levelGuesses,
                                                secretFound: false,
                                                supersecretFound: false,
                                                attempts: 0,
                                                gameover: false,
                                                won: false,
                                                lost: false,
                                                time: 0
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
                    if (parsedData.currentProgress.time) { // Enables pushing without breaking page for today if users have already played
                        gameTime = parsedData.currentProgress.time;
                    } else {
                        gameTime = 0;
                    }
                }
                // IF upon initialising gamedata, it is found the the last win was over 1 puzzle ago, reset the winstreak!
                if (parsedData.lastWonDate && getPuzzleNumber() - parsedData.lastWonDate > 1) {
                    parsedData.stats.winStreak = 0;
                }
                // If upon initialising gamedata, there is no ultra secret room stats, create! for updating old users
                if (!parsedData.stats.ultraSecretRoomsFound) {
                    parsedData.stats.ultraSecretRoomsFound = 0;
                }
                gamedata = parsedData;
            } else {
                gamedata = {
                    lastPlayedDate: getPuzzleNumber(),
                    lastWonDate: null,
                    currentMap: null,
                    currentProgress: {
                        stage: 0,
                        guesses: levelGuesses,
                        secretFound: false,
                        supersecretFound: false,
                        attempts: 0,
                        gameover: false,
                        won: false,
                        lost: false,
                        time: 0
                    },
                    stats: {
                        totalGames: 0,
                        secretRoomsFound: 0,
                        superSecretRoomsFound: 0,
                        ultraSecretRoomsFound: 0,
                        wins: 0,
                        winStreak: 0,
                        maxStreak: 0
                    }
                };
            }
            localStorage.setItem("secretRoomleData", JSON.stringify(gamedata));
            // Set timer (separate from setelements as setelements is called elsewhere where you dont want to set the timer)
            let elapsed = Date.now() - startTime;
            let seconds = gameTime + (elapsed/1000);
            let formatted = new Date(seconds * 1000).toISOString().substring(14, 22);
            document.getElementById("timerSpan").innerHTML = formatted;
            startTime = Date.now(); // Sets start time for timer to reference
        }
        // Set stats
        setElements();
        
    }

    // Sets the text of the page based on game data and current game
    function setElements() {
        if (gamemode == "daily") {
            document.getElementById("gamesPlayed").textContent = gamedata.stats.totalGames; 
            document.getElementById("gamesWon").textContent = gamedata.stats.wins; 
            document.getElementById("secretRoomsFound").textContent = gamedata.stats.secretRoomsFound; 
            document.getElementById("superSecretRoomsFound").textContent = gamedata.stats.superSecretRoomsFound; 
            document.getElementById("ultraSecretRoomsFound").textContent = gamedata.stats.ultraSecretRoomsFound; 
            document.getElementById("currentWinstreak").textContent = gamedata.stats.winStreak; 
            document.getElementById("bestWinstreak").textContent = gamedata.stats.maxStreak; 
        }
        // Also set the guesses remaining for this current game
        document.getElementById("guessesremaining").textContent = guesses;
        document.getElementById("floorname").textContent = levelname;


        let curse = "no curse";
        if (curseLabyrinth) {
            curse = "curse of the labyrinth";
            document.getElementById("floorname").textContent = document.getElementById("floorname").textContent.replace(/ I$/, " XL");;
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

        // Stop all sounds
        secretRoomSfx.pause();
        secretRoomSfx.currentTime = 0;
        bombSfx.pause();
        bombSfx.currentTime = 0;
        winSfx.pause();
        winSfx.currentTime = 0;
        loseSfx.pause();
        loseSfx.currentTime = 0;
        deathSfx.pause();
        deathSfx.currentTime = 0;
        goldenKey.pause();
        goldenKey.currentTime = 0;

        if (gamemode == "daily") {
            Math.seedrandom(seed); // THERE WAS SOME WEIRD RACE CONDITION THAT MADE THE SEED SWITCH BETWEEN 2 !!! FIXED.

            document.getElementById("gameOverModal").style.display = "none"; // closes modal on refreshr
        }

        do {
            levelnum = Math.floor(Math.random()*12 + 1);
        } while (levelnum == 9); // Prevents level from being 9 as that makes womb 2 more common!
        curseLabyrinth = false;
        curseLost = false;
        if (Math.random() < 0.33) {
            if (Math.random() < 0.8 && (levelnum % 2 != 0 && levelnum < 9)) { // Only labyrinth if first floor of chapter
                curseLabyrinth = true;
            } else {
                curseLost = true;
            }
        }
        Math.random() // Call to keep the rng consistent!!!!
        hard =  true; // Always use hard mode - I mean no point randomly choosing normal (who plays that anyway am i right?)
        generator = new Generator(levelnum, curseLabyrinth, lost, hard);
        levelname = floornames[levelnum-1][Math.floor(Math.random() * floornames[levelnum-1].length)]

        stage = 0; // stage = 1 is room types, stage = 2 is rocks
        guesses = (
            levelnum <= 10 ? startingGuesses :
            levelnum == 11 ? startingGuesses + 2: // No rocks so need some extras to make it fair!
            levelnum === 12 ? startingGuesses + 4 : // Void is nasty
            null)
            + (hardMode ? 2 : 0); // Attempt at balance based on starting floor
        secretFound = false;
        supersecretFound = false;
        ultrasecretFound = false;
        attempts = 0;
        gameover = false;
        won = false;
        lost = false;
        generator.generateMap();

        initializeGamedata(guesses);

        drawMap();
    }

    // Draws the map, also accounting for which room is hovered over, and what the current game stage is
    async function drawMap(hoveredRoom = null) {
        if (generator == null) {
            return;
        }
        if (!gameImagesLoaded && document.fonts.check('1em "Upheaval"')) { // only show loading when the font is loaded!!!!
            ctx.beginPath();
            ctx.font = "200px Upheaval";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fill();
            ctx.fillStyle = "rgba(0, 0, 0, 1)";
            ctx.fillText("Loading...", mapSize / 2, mapSize / 2);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
            for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
                let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];

                // If room is undefined or a hidden secret room, then if the current hovered coordinates are this room, fill it grey.
                if (hoveredRoom && (!room || (room.type == "secret" && room.hidden) || (room.type == "supersecret" && room.hidden) || (room.type == "red" && room.hidden) || (room.type == "ultrasecret" && room.hidden))) { // fiddly short circuiting
                    if ((y/roomSize) - 1 == (Math.floor(hoveredRoom[1]/roomSize)) - 1 && (x/roomSize) - 1 == (Math.floor(hoveredRoom[0]/roomSize)) - 1) {
                        drawCachedImage("bomb", x, y, roomSize, roomSize);
                    }
                }

 

                if (stage == 0) {
                    if (room) {
                        if (room.type == "wrong" || room.type == "redwrong") {
                            drawCachedImage("scorch", x, y, roomSize, roomSize);
                        } else if (room.type == "start") {
                            drawCachedImage("startRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "secret" && !room.hidden) {
                            drawCachedImage("secretRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "supersecret" && !room.hidden) {
                            drawCachedImage("superSecretRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "red" && !room.hidden && hardMode) { //DEBUG
                            drawCachedImage("redRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "blue" && !room.hidden && hardMode) { //DEBUG
                            drawCachedImage("blueRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "ultrasecret" && !room.hidden && hardMode) { //DEBUG
                            drawCachedImage("ultraSecretRoom", x, y, roomSize, roomSize);
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
                        } else if (room.type == "start") {
                            drawCachedImage("startRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "shop") {
                            drawCachedImage("shopRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "item") {
                            drawCachedImage("itemRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "wrong" || (room.type == "redwrong" && room.hidden && !gameover && hardMode) || (room.type == "redwrong" && !hardMode)) { // If wrong, or redwrong and hidden and not gameover and hard, or redwrong and not hard. god redwrong is convoluted but whatever
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
                        } else if ((room.type == "red" || room.type == "redwrong") && !room.hidden && hardMode) {
                            drawCachedImage("redRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "blue" && !room.hidden && hardMode) {
                            drawCachedImage("blueRoom", x, y, roomSize, roomSize);
                        } else if (room.type == "ultrasecret" && !room.hidden && hardMode) {
                            drawCachedImage("ultraSecretRoom", x, y, roomSize, roomSize);
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
        let newSeed = getPuzzleNumber();
        //let newSeed = seed + 1; // for testing regeneration
        if (seed != newSeed) {
            seed = newSeed;
            gameTime = 0;
            Math.seedrandom(newSeed); 
            startGame();
        }
    }

    function timer() {
        if (!gameover && gameImagesLoaded) {
            let elapsed = Date.now() - startTime;
            let seconds = gameTime + (elapsed/1000);
            let formatted = new Date(seconds * 1000).toISOString().substring(14, 22);
            document.getElementById("timerSpan").innerHTML = formatted;
            gamedata.currentProgress.time = seconds;
            localStorage.setItem("secretRoomleData", JSON.stringify(gamedata));
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

            let transform = ctx.getTransform();
            let transformedX = (event.offsetX - transform.e) * (size/visualSize);
            let transformedY = (event.offsetY - transform.f) * (size/visualSize);
            let y = Math.floor(transformedY/roomSize) - 1;
            let x = Math.floor(transformedX/roomSize) - 1;
            if (x < 0 || x > 12 || y < 0 || y > 12) { // Cant place bombs out of 13x13 grid
                return;
            }
            let room = generator.map[y][x];
            // If room is undefined, set it to a wrong room
            if (!room) {
                if (gamemode == "daily") {
                    if (stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound && gamemode == "daily") {
                        gamedata.stats.totalGames += 1;
                    }
                }
                let newRoom = new Room(y,x);
                newRoom.type = "wrong";
                generator.map[y][x] = newRoom;
                stage = Math.min(2, stage+1);
                guesses -= 1;
                bombSfx.pause();
                bombSfx.currentTime = 0;
                bombSfx.play();
            } else if (room.type == "red" && !hardMode) { // If red room, treat like nonexistent room as should be hidden (until end)
                if (gamemode == "daily") {
                    if (stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound && gamemode == "daily") {
                        gamedata.stats.totalGames += 1;
                    }
                }
                room.type = "redwrong";
                stage = Math.min(2, stage+1);
                guesses -= 1;
                bombSfx.pause();
                bombSfx.currentTime = 0;
                bombSfx.play();
            } else if (room.type == "red" && hardMode && room.hidden) { // If red room on hard mode, reveal usr!
                if (gamemode == "daily") {
                    if (stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound && gamemode == "daily") {
                        gamedata.stats.totalGames += 1;
                    }
                    gamedata.stats.ultraSecretRoomsFound += 1;
                }
                guesses -= 1;
                bombSfx.pause();
                bombSfx.currentTime = 0;
                bombSfx.play();
                secretRoomSfx.pause();
                secretRoomSfx.currentTime = 0;
                secretRoomSfx.play();
                room.hidden = false;
                ultrasecretFound = true;
                // Find usr and unhide it,as well as all other red rooms
                for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
                    for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
                        let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];
                        if (room && (room.type == "ultrasecret" || room.type == "red")) {
                            room.hidden = false;
                        }
                    }
                }

            } else if (room.type == "secret" && room.hidden) {
                if (gamemode == "daily") {
                    if (stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound) {
                        gamedata.stats.totalGames += 1;
                    }
                    gamedata.stats.secretRoomsFound += 1;
                }
                room.hidden = false;
                secretFound = true;
                guesses -= 1;
                bombSfx.pause();
                bombSfx.currentTime = 0;
                secretRoomSfx.pause();
                secretRoomSfx.currentTime = 0;
                bombSfx.play();
                secretRoomSfx.play();
            } else if (room.type == "supersecret" && room.hidden) {
                if (gamemode == "daily") {
                    if (stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound) {
                        gamedata.stats.totalGames += 1;
                    }
                    gamedata.stats.superSecretRoomsFound += 1;
                }
                room.hidden = false;
                supersecretFound = true;
                guesses -= 1;
                bombSfx.pause();
                bombSfx.currentTime = 0;
                secretRoomSfx.pause();
                secretRoomSfx.currentTime = 0;
                bombSfx.play();
                secretRoomSfx.play();
            } else if (room.type == "ultrasecret" && room.hidden && hardMode) {
                if (gamemode == "daily") {
                    if (stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound) {
                        gamedata.stats.totalGames += 1;
                    }
                    gamedata.stats.ultraSecretRoomsFound += 1;
                }
                room.hidden = false;
                ultrasecretFound = true;
                guesses -= 1;
                bombSfx.pause();
                bombSfx.currentTime = 0;
                secretRoomSfx.pause();
                secretRoomSfx.currentTime = 0;
                bombSfx.play();
                secretRoomSfx.play();
                // Find red rooms and unhide
                for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
                    for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
                        let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];
                        if (room &&  room.type == "red") {
                            room.hidden = false;
                        }
                    }
                }
            } else if (room.type == "ultrasecret" && room.hidden && !hardMode) {
                if (gamemode == "daily") {
                    if (stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound && gamemode == "daily") {
                        gamedata.stats.totalGames += 1;
                    }
                }
                room.type = "wrong";
                stage = Math.min(2, stage+1);
                guesses -= 1;
                bombSfx.pause();
                bombSfx.currentTime = 0;
                bombSfx.play();
            }
            document.getElementById("guessesremaining").textContent = guesses; // Update guesses remaining visually

            // Loss logic
            if (guesses == 0 && !(secretFound && supersecretFound) && !hardMode) {
                gameover = true;
                won = false;
                lost = true;
                stage = 2;
                // Unhide secret rooms
                for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
                    for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
                        let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];
                        if (room && room.hidden == true && room.type != "redwrong" && room.type != "red" && room.type != "ultrasecret") {
                            room.hidden = false;
                        }
                    }
                }
                drawMap(null);
                // Modify users stats
                if (gamemode == "daily") {
                    gamedata.stats.winStreak = 0;
                }
                loseSfx.play();
                deathSfx.play();
            } else if (guesses == 0 && !(secretFound && supersecretFound && ultrasecretFound) && hardMode) {
                console.log("2");
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
                if (gamemode == "daily") {
                    gamedata.stats.winStreak = 0;
                }
                loseSfx.play();
                deathSfx.play();
            } else if (secretFound && supersecretFound && !hardMode) {
                console.log("3");
                gameover = true;
                won = true;
                lost = false;
                stage = 2;
                // Unhide secret rooms
                for (let x = roomSize; x < mapSize - roomSize; x += roomSize) {
                    for (let y = roomSize; y < mapSize - roomSize; y += roomSize) {
                        let room = generator.map[(y/roomSize) - 1][(x/roomSize) - 1];
                        if (room && room.hidden == true && room.type != "redwrong" && room.type != "red" && room.type != "ultrasecret") {
                            room.hidden = false;
                        }
                    }
                }
                drawMap(null);
                if (gamemode == "daily") {
                    // Modify users stats
                    gamedata.stats.wins += 1;
                    gamedata.stats.winStreak  += 1;
                    gamedata.lastWonDate = getPuzzleNumber();
                    console.log(gamedata.lastWonDate);
                    if (gamedata.stats.winStreak > gamedata.stats.maxStreak) {
                        gamedata.stats.maxStreak = gamedata.stats.winStreak;
                    }
                }
                // Stop sounds and play win
                secretRoomSfx.pause();
                secretRoomSfx.currentTime = 0;
                winSfx.play();
            } else if (secretFound && supersecretFound && ultrasecretFound && hardMode) {
                console.log("4");
                gameover = true;
                won = true;
                lost = false;
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
                if (gamemode == "daily") {
                    // Modify users stats
                    gamedata.stats.wins += 1;
                    gamedata.stats.winStreak  += 1;
                    gamedata.lastWonDate = getPuzzleNumber();
                    if (gamedata.stats.winStreak > gamedata.stats.maxStreak) {
                        gamedata.stats.maxStreak = gamedata.stats.winStreak;
                    }
                }
                // Stop sounds and play win
                secretRoomSfx.pause();
                secretRoomSfx.currentTime = 0;
                winSfx.play();
            }

            // Modal to display
            if (gameover && gamemode == "daily") {
                let results = "";
                let winOrLoss = won;
                if (won) {
                    winOrLoss = "won";
                } else {
                    winOrLoss = "lost";
                }
                if (secretFound) {
                    results += "🟩 Secret Room"
                } else {
                    results += "🟥 Secret Room"
                }
                if (supersecretFound) {
                    results += "\n🟩 Super Secret Room "
                } else {
                    results += "\n🟥 Super Secret Room"
                }
                if (hardMode && ultrasecretFound) {
                    results += "\n🟩 Ultra Secret Room "
                } else if (hardMode) {
                    results += "\n🟥 Ultra Secret Room"
                }
                let totalBombs = (
                    levelnum <= 10 ? startingGuesses :
                    levelnum == 11 ? startingGuesses + 2: // No rocks so need some extras to make it fair!
                    levelnum === 12 ? startingGuesses + 4 : // Void is nasty
                    null)
                    + (hardMode ? 2 : 0); // hard mode gives 2 extra bombs!
                let bombPerformance = (
                    won == false ? "🟥":
                    levelnum == 12 && guesses <= 2 && !hardMode ? "🟧" :
                    levelnum == 12 && guesses <= 5 && !hardMode ? "🟨" :
                    levelnum == 12 && guesses <= 10 && !hardMode ? "🟩" :
                    levelnum == 11 && guesses <= 1 && !hardMode ? "🟧" :
                    levelnum == 11 && guesses <= 4 && !hardMode ? "🟨" :
                    levelnum == 11 && guesses <= 8 && !hardMode ? "🟩" :
                    levelnum <= 10 && guesses <= 0 && !hardMode ? "🟧" :
                    levelnum <= 10 && guesses <= 2 && !hardMode ? "🟨" :
                    levelnum <= 10 && guesses <= 4 && !hardMode ? "🟩" :
                    levelnum == 12 && guesses <= 2 && hardMode ? "🟧" :
                    levelnum == 12 && guesses <= 6 && hardMode ? "🟨" :
                    levelnum == 12 && guesses <= 9 && hardMode ? "🟩" :
                    levelnum == 11 && guesses <= 1 && hardMode ? "🟧" :
                    levelnum == 11 && guesses <= 4 && hardMode ? "🟨" :
                    levelnum == 11 && guesses <= 7 && hardMode ? "🟩" :
                    levelnum <= 10 && guesses <= 1 && hardMode ? "🟧" :
                    levelnum <= 10 && guesses <= 3 && hardMode ? "🟨" :
                    levelnum <= 10 && guesses <= 5 && hardMode ? "🟩" :

                    null); // Attempt at balance based on starting floor - now hard coded to give a roughly even spread for each floor!
                    // Spread for normal (6 guesses) 2 green 2 yellow 1 orange, stage 10 (8 guesses) is 2 green 3 yellow 2 orange, stage 12 (10 guesses) is 3 green 3 yellow 3 orange!
                    // Spread for hard: (8 guesses) 2 green 2 yellow 2 orange (1 less cause takes 1 more bomb), stage 11 (10 guesses) 3 green 3 yellow 2 orange, stage 12 (12 gueses) green 3 yellow 4 orange 3
                results += `\n${bombPerformance} ${guesses}/${totalBombs} bomb(s) remaining`

                let elapsed = Date.now() - startTime;
                let seconds = gameTime + (elapsed/1000);
                let formatted = new Date(seconds * 1000).toISOString().substring(14, 22);

                let roomleNumber = getPuzzleNumber();
                if (hardMode) {
                    document.getElementById("gameOverText").textContent = `You ${winOrLoss} Ultra Secret Roomle #${roomleNumber} \n${results}\nTime: ${formatted}`;
                } else {
                    document.getElementById("gameOverText").textContent = `You ${winOrLoss} Secret Roomle #${roomleNumber} \n${results}\nTime: ${formatted}`;
                }
                document.getElementById("gameOverModal").style.display = "block";
            }

            // After every valid click, update localstorage with info about todays game, overwriting it.
            if (gamemode == "daily") {
                gamedata.currentMap = generator.map;
                gamedata.currentProgress.stage = stage;
                gamedata.currentProgress.guesses = guesses;
                gamedata.currentProgress.secretFound = secretFound;
                gamedata.currentProgress.supersecretFound = supersecretFound;
                gamedata.currentProgress.attempts = attempts;
                gamedata.currentProgress.gameover = gameover;
                gamedata.currentProgress.won = won;
                gamedata.currentProgress.lost = lost;
                // I dont think this is actually necessary - was an attempt to fix a bug that was caused by something else, but leaving it here just in case
                // let elapsed = Date.now() - startTime;
                // let seconds = gameTime + (elapsed/1000);
                // gamedata.currentProgress.time = seconds;
                localStorage.setItem("secretRoomleData", JSON.stringify(gamedata));
            }
            

            setElements();

            // DRAW THE DAMN MAP LOL
            drawMap();
        }
    })

    // On resize, if mobile then resize based on screen width (as innerwidth is weirrrdd on chrome mobile) otherwise use innerwidth on desktop
    //  Caveat that on some phone models it seems screen.width is always the physical width - doesnt change on rotation. altho that could be due to the emulator. regardless, its better to be 
    // too small (with zoom) than off screen. oh did I mention using screen.width fixes the zoom as it doesnt resize on zoom? yeah :) its not PERFECT but its a huge win imo.
    addEventListener("resize", (event) => {
        setTimeout(() => {
            if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                setScaling(screen.width); 
            } else {
                setScaling(window.innerWidth);
            }
            canvas.width = mapSize;
            canvas.height = mapSize;
            drawMap();
        }, 50);
    });

    // Attempt at mobile chrome app fix
    addEventListener("load", (event) => {
        setTimeout(() => {
            if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                setScaling(screen.width); 
            } else {
                setScaling(window.innerWidth);
            }
            canvas.width = mapSize;
            canvas.height = mapSize;
            drawMap();
        }, 50);
    })

    if (gamemode == "daily") {
        document.getElementById("copyButton").addEventListener("click", (event) => {
            let text = document.getElementById('gameOverText').innerHTML;
            text = text.split(" ").slice(2).join(" ");
            text = text + "\nhttps://roomle.net/";
            text = text.replace(/<br\s*\/?>/gi, '\n');
            navigator.clipboard.writeText(text);
        })
    }

    function setScaling(newWidth) {
        visualSize = Math.ceil(Math.min(newWidth * 0.85, 616));
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

    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            drawMap();
        }
    });

    if (gamemode == "endless") {
        document.getElementById("resetButton").addEventListener("click", (event) => {
            startGame();
        })
    }

    addEventListener("keydown", (event) => {
        if (event.key == "r" && gamemode == "endless") {
            startGame();
        }
        if (event.key == "p" && gamemode == "daily" && false) {
            console.log("debug")
            // Debug option for incrementing seed
            seedIncrement += 1;
        }
    });

    // Mute button functionality
    document.getElementById("muteButton").addEventListener("click", (event) => {
        setMute();
    });

    function setMute() {
        isMuted = !isMuted;

        bombSfx.muted = isMuted;
        secretRoomSfx.muted = isMuted;
        winSfx.muted = isMuted;
        loseSfx.muted = isMuted;
        deathSfx.muted = isMuted;
        goldenKey.muted = isMuted;

        if (isMuted) {
            document.getElementById("muteButton").style.backgroundImage = "url('images/volume-mute-fill.svg')";
        } else {
            document.getElementById("muteButton").style.backgroundImage = "url('images/volume-up-fill.svg')";
        }

        if (settingsdata) {
            settingsdata.isMuted = isMuted;
        }
        localStorage.setItem("settingsData", JSON.stringify(settingsdata));
    }

    // Hard mode button functionality
    document.getElementById("ultraButton").addEventListener("click", (event) => {
        if (stage == 0 && !secretFound && stage == 0 && !secretFound && !supersecretFound && !ultrasecretFound) {
            setHard();
            if (hardMode) {
                goldenKey.pause();
                goldenKey.currentTime = 0;
                goldenKey.play();
            }
        }
    });

    function setHard() {
        console.log("sethard called!")
        hardMode = !hardMode;

        if (hardMode) {
            document.getElementById("ultraButton").style.backgroundImage = "url('images/redKey.png')";
            // If hard, add two bombs. 
            guesses += 2;
        } else {
            document.getElementById("ultraButton").style.backgroundImage = "url('images/key.png')";
            // If switched back, remove two bombs. 
            guesses -= 2;
        }
        document.getElementById("guessesremaining").textContent = guesses; // Set new guesses

        if (settingsdata && gamemode == "daily") {
            settingsdata.hardModeDaily = hardMode;
        } else if (settingsdata && gamemode == "endless") {
            settingsdata.hardModeEndless = hardMode;
        }
        localStorage.setItem("settingsData", JSON.stringify(settingsdata));
    }

    function getPuzzleNumber() {
        let startDate = new Date(Date.UTC(2025,3,26));
        let today = new Date();
        let todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

        let timeDiff = todayUTC - startDate;
        let diffDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        diffDays += seedIncrement;

        return String(diffDays).padStart(3, '0');
    }

}