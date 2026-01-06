// Can add ultra secret once done for extra challenge, will require red rooms filling all empty space, then using connection rules
// Gameplay can be like, first guess is nothing, each fail reveals new info such as boss room, rooms with blocked sides, etc.
// ^ yep so, nothing, then reveal room types, then reveal blocked sides, anything else? idk

// NEED TO ADD POP CHECKS TO ENSURE NOT UNDEFINED
// DOUBLE CHECK ROOMS ARE ADDED TO WOMB IF THEY CAN SPAWN THERE

// Using https://bindingofisaacrebirth.fandom.com/wiki/Level_Generation and https://www.boristhebrave.com/2020/09/12/dungeon-generation-in-binding-of-isaac/ for algorithm

const rockOdds = 0.35 // rockOdds chance of rock appearing in each valid space - INCREASE TOI MAKE EASIER, DECREASE TO MAKE HARDER

// Can be boss, secret, shop, etc etc etc
// Possibility for large rooms - each grid cell contains one room as usual, but can be duplicated in case of larger rooms with copies of the same object. hm. but then pos is weird. and so is getting neighbours. hm
export class Room{
    constructor(posY, posX) {
        this.type = "empty";
        this.posY = posY;
        this.posX = posX;
        this.deadEnd = false;
        this.neighbours = [];
        this.secretWeight = Math.floor(Math.random() * (15 - 10)) + 10;
        this.rocks = [false, false, false, false] // up, down, left, right
        this.hidden = false;
    }

}

export class Generator {
    constructor(stage, labyrinth, lost, hard) {
        this.stage = stage;
        this.labyrinth = labyrinth;
        this.lost = lost;
        this.hard = hard;
        this.numRooms = this.generateNumRooms();
        this.minDeadEnds = this.generateMinDeadEnds();
        this.map = [...Array(13)].map(e => Array(13));
        this.deadEndQueue = [];
    }

    generateNumRooms() {
        // Create number of rooms on stage
        let numRooms = Math.min(21, Math.floor(Math.random(1,2)*3) + 5 + Math.floor(this.stage * (10 / 3)));

        //let numRooms = Math.min(24, Math.floor(Math.random()*8) + 5 + Math.floor(this.stage * 3.35));
        if (this.labyrinth) {
            numRooms = Math.min(45, Math.floor(numRooms * 1.8)) - 1; // Minus one because gonna add a boss room to the boss room!
        } else if (this.lost) {
            numRooms += 4;
        }
        // Void check
        if (this.stage == 12) {
            numRooms = 50 + Math.floor(Math.random() * 10);
        }
        // Hard mode check
        if (this.hard) {
            numRooms += 2 + Math.floor(Math.random(0,1)*2);
        }

        return numRooms;
    }

    generateMinDeadEnds() {
        // Number of dead ends (minimum)
        let minDeadEnds = 5;
        if (this.stage != 1) {
            minDeadEnds += 1;
        }
        if (this.labyrinth) {
            minDeadEnds += 1;
        }
        if (this.stage == 12) {
            minDeadEnds += 2;
        }
        return minDeadEnds;
    }

    // Utility for generating all neighbouring rooms for a given room - prunes those out of bounds
    generateNeighbours(room) {
        let neighbours = [new Room(room.posY + 1, room.posX), new Room(room.posY - 1, room.posX), new Room(room.posY, room.posX + 1), new Room(room.posY, room.posX - 1)];
        let neighboursPruned = [];
        for (let i = 0; i < 4; i++) {
            if (!(neighbours[i].posY < 0 || neighbours[i].posY >= 13 || neighbours[i].posX < 0 || neighbours[i].posX >= 13)) {
                neighboursPruned.push(neighbours[i]);
            }
        }
        return neighboursPruned;
    }

    // Utility for finding existing neighbours
    findNeighbours(room) {
        let coords = [[room.posY + 1, room.posX], [room.posY - 1, room.posX], [room.posY, room.posX + 1], [room.posY, room.posX - 1]]
        let neighbours = [];
        coords.forEach(coord => {
            // In bounds
            if (coord[0] < 0 || coord[0] >= 13 || coord[1] < 0 || coord[1] >= 13) {
                return;
            }
            if (this.map[coord[0]][coord[1]] instanceof  Room) {
                neighbours.push(this.map[coord[0]][coord[1]]);
            }
        });
        return neighbours;
    }

    
    generateLayout() { // Considered a separate map class, but no real point tbh since itd have to pass half the stuff anyway
        let roomsRemaining = this.numRooms;
        // Start at center square
        let center = [6, 6];
        let [centerY, centerX] = center
        let roomQueue = [];
        // Place starting room in queue, and add to grid:
        let startRoom = new Room(centerY,centerX);
        startRoom.type = "start";
        roomQueue.push(startRoom);
        this.map[centerY][centerX] = roomQueue[0];
        roomsRemaining -= 1;

        // Loop over each room in queue
        let resetCounter = -1;
        while (roomQueue.length != 0) {
            resetCounter += 1;
            // r
            // ADD counter so that every 16 rooms the start room is reseeded into queue :)
            let currentRoom = roomQueue.shift();
            // For each coordinate left, up, down, right of this room, see if youll create a new room, and follow game logic to do so. Then add each new room to both the queue and the map
            // (down, up, right, left)
            // MAKE THESE ROOMS!!
            let neighbourList = this.generateNeighbours(currentRoom);
            let roomCounter = 0;
            neighbourList.forEach(neighbour => {
                // Perform checks to see if should generate a room here, and if so, add to queue and grid.
                // Check 1: Is this space already occupied?
                if (this.map[neighbour.posY][neighbour.posX]) {
                    return;
                }
                // Check 2: More than one filled neighbour already for this cell?
                let neighbourListSquared = this.generateNeighbours(neighbour);
                let neighbourCounter = 0;
                neighbourListSquared.forEach(neighbourSquared => {
                    if (this.map[neighbourSquared.posY][neighbourSquared.posX]) {
                        neighbourCounter += 1;
                    }
                });
                if (neighbourCounter > 1) {
                    // Add a random chance to stop, random to continue. BECAUSE isaac room generation does seem to support multiple adjacent rooms, just rarer..
                    if (this.stage != 12 && !this.labyrinth) { //   from manual testing looks like only void allows loops - labyrinth does also but rarer¬!!
                        return;
                    }
                    if (neighbour > 2 || (this.stage == 12 && Math.random() < 0.93) || (this.labyrinth && Math.random() < 0.98)) {
                        return;
                    }
                }

                // Check 3: Rooms left?
                if (roomsRemaining == 0) {
                    return;
                }
                // Check 4: 50% chance
                if (Math.floor(Math.random(0,1)*2) == 0) {
                    return;
                }
                // Check 5: In mega satan spot?
                if (this.stage == 11 && neighbour.posY == 5 && neighbour.posX == 6) {
                    return;
                }
                // Create room here
                this.map[neighbour.posY][neighbour.posX] = neighbour;
                roomQueue.push(neighbour);
                roomsRemaining -= 1;
                roomCounter += 1;
            });
            // Blog post says a room is a dead end if it creates no neighbours, but is this true? say one doesnt create any, but later on it loops around and tries to put a room there from the other side. it can do this because no more than 2 already filled neighbours (does allow some loops see void). Therefore must wait till end, manually calculate dead ends, create list, sort by manhattan distance to start room (manhattan? no.. cause could loop around . hm. is there a way of doing it so they loop et it writes dead ends as it goes? AH write them as it goes then do a final pass of them and remove any that dont meet the criteria :) tht keeps it in order !!) - actually basically unnecceesary except for void so do it anyway lol
            if (roomCounter == 0) {
                this.deadEndQueue.push(currentRoom);
            }

            // DEFINITELY a better way of doing this but I'm lazy so - if the currentRoom is StartRoom and room counter is smaller than 2, that means there are not at least 2 rooms from the start room. so just abort the map here.
            if (currentRoom == startRoom && roomCounter < 2) {
                return;
            }
        }
    }

    generateMap() {
        while(true) {
            this.map = [...Array(13)].map(e => Array(13));
            this.deadEndQueue = [];
            this.numRooms = this.generateNumRooms();
            this.minDeadEnds = this.generateMinDeadEnds();
            this.generateLayout();
            // Check conditions match?
            // First count rooms
            let roomCounter = 0;
            for(let i = 0; i < 13; i++) {
                for(let j = 0; j < 13; j++) {
                    if (this.map[j][i]) {
                        roomCounter += 1;
                    }
                }
            }
            if (roomCounter != this.numRooms) {
                continue;
            }
            // Second, verify the dead end queue, and then check the count is correct - this usually takes off one (not sure why) but is needed in void
            let deadEndQueuePruned = []
            this.deadEndQueue.forEach(room => {
                if (room.type == "start") {
                    return;
                }
                let neighbours = this.generateNeighbours(room);
                // If more than one neighbour, not a dead end so remove from queue
                let neighbourCounter = 0;
                neighbours.forEach(neighbour => {
                    if (this.map[neighbour.posY][neighbour.posX]) {
                        neighbourCounter += 1;
                    }
                })
                if (neighbourCounter == 1) {
                    deadEndQueuePruned.push(room);
                }
            })
            this.deadEndQueue = deadEndQueuePruned;
            if (this.deadEndQueue.length < this.minDeadEnds) {
                continue;
            }

            // Handle the boss room here, as if curse of labyrinth and no valid positions, must restart THIS IS COMPLEX LOL
            let bossroom = this.deadEndQueue.pop();
            bossroom.type = "boss";
            if (this.labyrinth) { // If labyrinth, try adding another boss room in a valid space next to the existing one
                let bossNeighbours = this.generateNeighbours(bossroom);
                let secondBossFound = false;
                let candidateNeighbourCounter = 0;
                // Get all neighbours to the boss (and search in random order)
                bossNeighbours = shuffleArray(bossNeighbours); // thanks https://medium.com/@priyanshuahir01/const-shuffledarray-gamearray-sort-math-random-0-5-3f0f30bb38ba
                bossNeighbours.forEach(bossCandidate => {
                    // For each possible second boss, get all of its neighbours
                    let candidateNeighbours = this.generateNeighbours(bossCandidate);
                    candidateNeighbours.forEach(candidateNeighbour => { // Count how many neighbours this possible second boss has
                        if (this.map[candidateNeighbour.posY][candidateNeighbour.posX]) {
                            candidateNeighbourCounter += 1;
                        }
                    });
                    // If the candidate second boss only has 1 neighbour, it is only connected to the first boss, so is valid !
                    if (candidateNeighbourCounter == 1) {
                        this.map[bossCandidate.posY][bossCandidate.posX] = bossCandidate;
                        bossCandidate.type = "boss";
                        secondBossFound = true;
                        return;
                    }
                });
                if (!secondBossFound) { // If no valid second boss placed, then restart map gen.
                    continue;
                }
            }

            this.placeSpecialRooms();

            this.placeSecretRoom();

            if (!this.placeUltraSecretRoom()) {
                continue; // Fails if no places for ultra secret where there are 2+ connected normal rooms, for fairness
            }

            this.placeRocks();

            break;
        }
        
    }

    placeSpecialRooms() {
        // Now a valid layout has been generated and boss rooms placed, place rooms in dead ends
        let supersecret = this.deadEndQueue.pop();
        supersecret.type = "supersecret";
        supersecret.hidden = true;
        if (this.stage < 7) {
            this.deadEndQueue.pop().type = "shop";
            this.deadEndQueue.pop().type = "item"
            if (this.labyrinth) {
                this.deadEndQueue.pop().type = "item";
            } 
        } else if (this.stage == 12) {
            // Void - generate 7 more boss rooms lol - can it be more ? idk look into that
            for (let i = 0; i < 7; i++) {
                this.deadEndQueue.pop().type = "boss";
            }
        }
        // Planetarium
        if (this.deadEndQueue.length > 0) {
            if (this.stage < 7) {
                if (Math.random() < 0.01) {
                    this.deadEndQueue.pop().type = "planetarium";
                }
            }
        }
        // Sac or Dice room
        if (this.deadEndQueue.length > 0) {
            if (Math.random() < 5/14 && this.stage < 11) { // Assuming Isaac has high health
                if (Math.random() < 1/5) { // Assuming Isaac has more than 2 keys
                    this.deadEndQueue.pop().type = "dice";
                } else {
                    this.deadEndQueue.pop().type = "sacrifice";
                }
            }
        }
        // Library
        if (this.deadEndQueue.length > 0) {
            if (Math.random() < 1/20 && this.stage < 11) { // I thiiiink they can spawn in all floors ? according to some post in 2015
                this.deadEndQueue.pop().type = "library";
            }
        }
        // Curse Room
        if (this.deadEndQueue.length > 0) {
            if (this.stage < 11) {
                if (Math.random() < 1/2) { // Assuming no devil rooms taken this run
                    this.deadEndQueue.pop().type = "curse";
                }
            }
        }
        // Miniboss
        if (this.deadEndQueue.length > 0) {
            if (this.stage == 1 && Math.random() < 1/2) { // Higher chance on first floor
                this.deadEndQueue.pop().type = "miniboss";
            } else if (Math.random() < 1/4 && this.stage < 11) {
                this.deadEndQueue.pop().type = "miniboss";
            }
        }
        // Challenge Room 
        if (this.deadEndQueue.length > 0) {
            if (this.stage % 2 == 0 && this.stage < 10) { // Guarenteed spawn as assuming isaac has high health
                this.deadEndQueue.pop().type = "bosschallenge"; // Boss on second floors
            } else if (this.stage < 10) {
                this.deadEndQueue.pop().type = "challenge";
            }
        }
        // Arcade / Vault 
        if (this.deadEndQueue.length > 0) {
            if (this.stage % 2 == 0 && this.stage < 10 && !this.labyrinth) { // Assuming isaac has at least 5 coins, guarenteed to spawn on even floors
                if (Math.random() < 2/5) {
                    this.deadEndQueue.pop().type = "vault";
                } else {
                    this.deadEndQueue.pop().type = "arcade";
                }
            }
        }
        // Bedroom (cba to distinguish which type)
        if (this.deadEndQueue.length > 0) {
            if (this.stage < 7) {
                if (Math.random() < 1/50) {
                    this.deadEndQueue.pop().type = "bedroom";
                }
            }
        }
    }

    placeSecretRoom() {
        // Place the secret room.
        // 1. loop through each undefined and create a room for it
        // 2. assign each room a weight based on number of neighbours that are not candidates, or boss rooms, or secret rooms (if boss or secret room, weight = 0)
        // 3. pick highest weight candidate
        let candidates = [];
        for(let i = 0; i < 13; i++) {
            for(let j = 0; j < 13; j++) {
                if (!this.map[j][i]) {
                    let room = new Room(j,i);
                    room.type = "candidate";
                    candidates.push(room);
                }
            }
        }
        candidates.forEach(candidate => {
            let invalidFlag = false;
            let candidateNeighbours = this.findNeighbours(candidate);
            let numNeighbours = 0;
            candidateNeighbours.forEach(neighbour => {
                if (neighbour.type == "boss" || neighbour.type == "supersecret") {
                    invalidFlag = true;
                    return;
                } 
                numNeighbours += 1;
            });
            if (this.stage == 11 && candidate.posY == 5 && candidate.posX == 6) { // ensures no secret room can be placed where mega satan is
                invalidFlag = true;
            }
            if (invalidFlag) {
                candidate.secretWeight = 0;
            } else if (numNeighbours == 2) {
                candidate.secretWeight -= 3; // Consider making this -2 to make 2s more common - actualy makes lnly basement have them and its just a pain and feels unfair
            } else if (numNeighbours == 1) {
                candidate.secretWeight -= 6
            } else if (numNeighbours == 0) {
                candidate.secretWeight = 0;
            }
        });
        // Find highest weight candidate (with some randomness for equal weights)
        let topWeight = 0;
        let bestCandidate = undefined;
        candidates.forEach(candidate => {
            if (candidate.secretWeight > topWeight) {
                topWeight = candidate.secretWeight;
                bestCandidate = candidate;
            } else if (candidate.secretWeight == topWeight) {
                // Random chance to replace current best candidate so there isnt a top left bias
                if (Math.random() > 0.5) {
                    //topWeight = candidate.secretWeight;
                    bestCandidate = candidate;
                }
            }
        });
        // Place best candidate in map, others are garbage collected
        bestCandidate.type = "secret";
        bestCandidate.hidden = true;
        this.map[bestCandidate.posY][bestCandidate.posX] = bestCandidate;
    }

    // method: spawn red rooms in all free adjacent spaces to rooms
    // iterate through all red rooms. if any are adjacent to secret rooms, boss rooms, or curse rooms, delete them
    // iterate through all spots that are adjacent to an existing red room.
    //     for each spot iterate its red room neighbours
    //         for each neighbour, add to a unique map the coordinate pairs of every regular room adjacent to it (non red)
    //     get the count of the map. this gives the number of unqiue roosm connecting to. weight this spot accordingly
    // select from the weighted list and place accordingly
    // delete all red rooms except for the ones adjacent ! for rock logic!
    // WANT TO RETURN IF IT WAS SUCCESSFUL OR NOT IN CASE LOOP SHOULD B RESTARTED
    placeUltraSecretRoom() {
        // Welcome to for loop hell my friends
        // Loop over all spaces on the map
        for(let i = 0; i < 13; i++) {
            for(let j = 0; j < 13; j++) {
                // if undefined, create a room here, generate neighbours, if neighbours list contains a room, place red room here. if neighbours list contains boss, curse or secret, dont place here.
                if (!this.map[j][i]) {
                    let redRoomCandidate = new Room(j, i);
                    let redRoomCandidateNeighbours = this.findNeighbours(redRoomCandidate);
                    let valid = true;
                    let redCounter = 0
                    let blue = false;
                    if (redRoomCandidateNeighbours.length > 0) {
                        redRoomCandidateNeighbours.forEach(redRoomCandidateNeighbour => {
                            if (redRoomCandidateNeighbour.type == "boss" || redRoomCandidateNeighbour.type == "curse" || redRoomCandidateNeighbour.type == "secret" || redRoomCandidateNeighbour.type == "supersecret") {
                                blue = true; // Blue rooms are red rooms but next to an invalid room so EXCLUDE an ultra secret room from spawning next to them, as per the wiki
                            }
                            // checking that at least one neighbour isnt also a red room!
                            if (redRoomCandidateNeighbour.type == "red" || redRoomCandidateNeighbour.type == "blue") {
                                redCounter +=1;
                            }
                        });
                    } else {
                        valid = false;
                    }
                    if (redCounter == redRoomCandidateNeighbours.length) {
                        valid = false;
                    }
                    // DONT ALLOW RED ROOM IN MEGA SATAN SPOT
                    if (this.stage == 11 && redRoomCandidate.posY == 5 && redRoomCandidate.posX == 6) {
                        valid = false;
                    }
                    if (valid) {
                        if (blue) {
                            redRoomCandidate.type = "blue";
                        } else {
                            redRoomCandidate.type = "red";
                        }
                        redRoomCandidate.hidden = true;
                        this.map[j][i] = redRoomCandidate;
                    }
                }
            }
        }
        
        // Now that red and blue rooms are placed, go through all rooms and if a red room neighbour +  doesnt touch any non-red rooms , add to ultraCandidates list
        let ultraCandidates = [];
        for(let i = 1; i < 12; i++) {
            for(let j = 1; j < 12; j++) { // Restrict search to not include edges as these are never valid
                if (this.map[j][i]) {
                    continue;
                }
                let ultraCandidate = new Room(j, i);
                ultraCandidate.type = "ultrasecret";
                ultraCandidate.hidden = true;
                let ultraCandidateNeighbours = this.findNeighbours(ultraCandidate);
                if (ultraCandidateNeighbours.length == 0) {
                    continue;
                }
                let valid = true;
                ultraCandidateNeighbours.forEach(ultraCandidateNeighbour => {
                    if (ultraCandidateNeighbour.type != "red") {
                        valid = false;
                    } 
                });
                if (valid) {
                    ultraCandidates.push(ultraCandidate);
                }
            }
        }        

        // ultraCandidates.forEach(ultraCandidate => {
        //     this.map[ultraCandidate.posY][ultraCandidate.posX] = ultraCandidate;
        // });

        // Assign each ultraCandidate its weight
        let weightedCandidates = []
        ultraCandidates.forEach(ultraCandidate => {
            let ultraCandidateNeighbours = this.findNeighbours(ultraCandidate); // Guarenteed to only be red rooms
            // For eachr adjacent red room to a candidate position, find what normal rooms are adjacent to these and add to a unique list 
            let roomSet = new Set();
            ultraCandidateNeighbours.forEach(ultraCandidateNeighbour => {
                let ultraCandidateNeighboursSquared = this.findNeighbours(ultraCandidateNeighbour); // List of normal rooms adjacent to the red room
                ultraCandidateNeighboursSquared.forEach(ultraCandidateNeighboursSquare => {
                    if (ultraCandidateNeighboursSquare.type != "red" && ultraCandidateNeighboursSquare.type != "blue") {
                        roomSet.add(`${ultraCandidateNeighboursSquare.posY}|${ultraCandidateNeighboursSquare.posX}`)
                    }
                });
            });
            if (roomSet.size >= 3){
                console.log(roomSet.size);
                console.log(roomSet);
                console.log(ultraCandidate.posX)
                console.log(ultraCandidate.posY)
            }
            
            // Based on size of roomSet, weight values
            let weight;
            if (roomSet.size >= 3) {
                weight = 11.5; // 11.5x more likely than 2 room
                weightedCandidates.push({room: ultraCandidate, weight: weight});
            } else if (roomSet.size == 2) {
                weight = 1;
                weightedCandidates.push({room: ultraCandidate, weight: weight});
            } else {
                // DO NOT ALLOW ONE ADJACENT ROOMS - UNFUN AND UNFAIR FOR A DAILY GAME. IF THE MAP ONLY HAS 1,S THEN JUST REGENERATE
            }
        });

        // If no options wiht 2+ adjacent rooms, fail
        if (weightedCandidates.length == 0) {
            return false;
        }

        // Select a candidate and set as the ultra secret room
        let totalWeight = weightedCandidates.reduce((sum, entry) => sum + entry.weight, 0); // Calcs total weight for random range
        let selected = Math.random() * totalWeight;
        let ultraSecretRoom = null;
        weightedCandidates.forEach(candidate => {
            selected -= candidate.weight;
            if (selected <= 0 && !ultraSecretRoom) {
                ultraSecretRoom = candidate.room;
            }
        });

        this.map[ultraSecretRoom.posY][ultraSecretRoom.posX] = ultraSecretRoom;

        // Cleanup - remove all red and blue rooms except those bordering the ultra secret
        for(let i = 0; i < 13; i++) {
            for(let j = 0; j < 13; j++) {
                if (this.map[j][i] && this.map[j][i].type == "blue") {
                    this.map[j][i] = null;
                }
                if (this.map[j][i] && this.map[j][i].type == "red") { // If red, only set to null if doesnt border the ultra secret
                    let redNeighbours = this.findNeighbours(this.map[j][i]);
                    let del = true;
                    redNeighbours.forEach(redNeighbour => {
                        if (redNeighbour.type == "ultrasecret") {
                            del = false;
                        }
                    });
                    if (del) {
                        this.map[j][i] = null;
                    }
                }
            }
        }

        return true;
    }

    // Final step - generate rock positions for rooms - to inform the player more about where the secret rooms could be 
    // Impossible to get accurate odds so just do 50/50 and see how it feels from there lol
    // make it so if rock generates on one side, much more liekly to alkso geenrate on opposite side?
    // CURRENT IMPLEMENTATION is biased as always goes in order. to fix, randomise order rocks are populated :)
    // Its actually basically good enough now - dont fix what aint broke
    placeRocks() {
        let rockOddsAdjusted = rockOdds;
        if (this.stage == 11) {
            rockOddsAdjusted = 0.03; // No rocks on chest or dark room!
        }
        for(let i = 0; i < 13; i++) {
            for(let j = 0; j < 13; j++) {
                if (this.map[j][i] && this.map[j][i].type != "secret" && this.map[j][i].type != "supersecret" && this.map[j][i].type != "ultrasecret" && this.map[j][i].type != "red" && this.map[j][i].type != "blue" && this.map[j][i].type != "boss" && this.map[j][i].type != "start" && this.map[j][i].type != "sacrifice" && this.map[j][i].type != "challenge" && this.map[j][i].type != "bosschallenge" && this.map[j][i].type != "planetarium" && this.map[j][i].type != "shop" && this.map[j][i].type != "curse" && this.map[j][i].type != "arcade" && this.map[j][i].type != "dice") {
                    if (this.map[j][i].type == "item") {
                        rockOddsAdjusted = rockOdds / 3;
                    }
                    if (j > 0 && !this.map[j-1][i]) {
                        if (Math.random() < rockOddsAdjusted) {
                            this.map[j][i].rocks[0] = true;
                            rockOddsAdjusted =  rockOdds * 1.5;
                        }
                    }
                    if (j < 12 && !this.map[j+1][i]) {
                        if (Math.random() < rockOddsAdjusted) {
                            this.map[j][i].rocks[1] = true;
                            rockOddsAdjusted =  rockOdds * 1.5;
                        }
                    }
                    if (i > 0 && !this.map[j][i-1]) {
                        if (Math.random() < rockOddsAdjusted) {
                            this.map[j][i].rocks[2] = true;
                            rockOddsAdjusted =  rockOdds * 1.5;
                        }
                    }
                    if (i < 12 && !this.map[j][i+1]) {
                        if (Math.random() < rockOddsAdjusted) {
                            this.map[j][i].rocks[3] = true;
                            rockOddsAdjusted =  rockOdds * 1.5;
                        }
                    }
                }
            }
        }
    }

    printMap() {
        for(let i = 0; i < 13; i++) {
            for(let j = 0; j < 13; j++) {
                if (!this.map[j][i]) {
                    process.stdout.write("   ");
                } else if (this.map[j][i].type == "start") {
                    process.stdout.write("[.]");
                } else if (this.map[j][i].type == "boss") {
                    process.stdout.write("[B]");
                } else if (this.map[j][i].type == "supersecret") {
                    process.stdout.write("[S]");
                } else if (this.map[j][i].type == "secret") {
                    process.stdout.write("[s]");
                } else if (this.map[j][i].type == "shop") {
                    process.stdout.write("[$]");
                } else if (this.map[j][i].type == "item") {
                    process.stdout.write("[I]");
                } else {
                    process.stdout.write("[ ]");
                }
            }
            process.stdout.write("\n");
        }
    }
 
}

function shuffleArray(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// let generator = new Generator(4, false, false, false);
// generator.generateMap();
// generator.printMap();


